"""Private localhost PoC. Original trees are read-only; output must be new."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()


def metadata(data):
    match = re.search(rb'loadPackage\((\{"files":.*?\})\);', data, re.S)
    if not match:
        raise ValueError('Unsupported file_packager metadata; do not guess offsets')
    return json.loads(match[1])


def generate(sources, output):
    output = Path(output).resolve()
    if output.exists():
        raise ValueError('Output exists; preserve it and choose a new directory')
    if any(output.is_relative_to(Path(p).resolve()) for _, p in sources):
        raise ValueError('Output must be outside original trees')
    output.mkdir(parents=True)
    templates = Path(__file__).parent
    catalog = []
    for label, source in sources:
        source = Path(source).resolve()
        resources = {}
        for file in sorted(source.rglob('*')):
            if not file.is_file():
                continue
            logical = file.relative_to(source).as_posix()
            if logical in ('sw.js', 'sw-manifest.js') or logical.endswith('.gz'):
                continue
            if file.suffix.lower() in ('.exe', '.dll', '.bat', '.py'):
                continue
            decoded = file.read_bytes()
            transport = file.with_name(file.name + '.gz')
            encoded = logical.endswith(('.data', '.wasm')) and transport.exists()
            wire = transport.read_bytes() if encoded else decoded
            if encoded and gzip.decompress(wire) != decoded:
                raise ValueError('gzip disagrees with source: ' + logical)
            sha = digest(wire)
            target = output / 'objects' / 'sha256' / sha
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists():
                if digest(target.read_bytes()) != sha:
                    raise ValueError('CAS collision or corrupt existing object')
            else:
                target.write_bytes(wire)
            resources[logical] = {'object': sha, 'url': '/objects/sha256/' + sha,
                                  'wireBytes': len(wire), 'decodedBytes': len(decoded),
                                  'decodedSHA256': digest(decoded), 'encoding': 'gzip' if encoded else 'identity'}
        packages = {}
        for logical in resources:
            if not logical.startswith('packs/') or not logical.endswith('.js'):
                continue
            name = logical[len('packs/'):-3]
            data_name = 'packs/' + name + '.data'
            if data_name not in resources:
                raise ValueError('Missing package partner: ' + logical)
            meta = metadata((source / logical).read_bytes())
            data = (source / data_name).read_bytes()
            if meta['remote_package_size'] != len(data):
                raise ValueError('Package length mismatch')
            mounted = {}
            for entry in meta['files']:
                start, end = entry['start'], entry['end']
                if not 0 <= start <= end <= len(data):
                    raise ValueError('Invalid package offset')
                if entry['filename'] in mounted:
                    raise ValueError('Duplicate mounted name')
                mounted[entry['filename']] = {'start': start, 'end': end, 'sha256': digest(data[start:end])}
            pair = {'metadata': logical, 'data': data_name,
                    'metadataSHA256': resources[logical]['decodedSHA256'],
                    'dataSHA256': resources[data_name]['decodedSHA256']}
            packages[name] = {'pair': digest(canonical(pair)), **pair, 'mounted': mounted}
        maps = json.loads((source / 'packs/maps.json').read_text())
        if not isinstance(maps, list):
            raise ValueError('Only existing split-map packages are supported')
        shared_file = source / 'packs/shared.json'
        shared = json.loads(shared_file.read_text()) if shared_file.exists() else []
        base = ['engine', 'boot', *shared]
        frontend = [n for n in ['gpustats.js', 'postfx.js', 'extras.js', 'hud.js', 'loader.js',
                               'debug.js', 'xash3d.js', 'xash3d.wasm'] if n in resources]
        frontend += [n for n in ('packs/maps.json', 'packs/shared.json', 'packs/transitions.json') if n in resources]
        engine = packages['engine']
        modules = {n: {'package': 'engine', **v} for n, v in engine['mounted'].items() if n.endswith('.wasm')}
        html = (source / 'index.html').read_text()
        html = re.sub(r'<script\b[^>]*>.*?</script>', '', html, flags=re.S | re.I)
        html = html.replace('</body>', '<script src="poc_boot.js"></script></body>')
        html_bytes = html.encode('utf-8')
        core = {'schema': 1, 'resources': resources, 'packages': packages, 'modules': modules,
                'startup': {'frontend': frontend, 'basePackages': base},
                'maps': {m: [*base, 'map_' + m] for m in maps},
                'templates': {'index.html': digest(html_bytes),
                              **{n: digest((templates / n).read_bytes()) for n in ('worker.js', 'boot.js')}},
                'persistence': {'mount': '/rwdir', 'database': '/rwdir',
                                'savePolicy': 'deny-unless-explicitly-tested',
                                'saveContract': digest(canonical(modules))}}
        raw = canonical(core)
        release_id = digest(raw)
        dest = output / 'releases' / release_id
        dest.mkdir(parents=True)
        (dest / 'release.json').write_bytes(raw)
        for name, target in [('worker.js', 'sw.js'), ('boot.js', 'poc_boot.js')]:
            (dest / target).write_bytes((templates / name).read_bytes())
        (dest / 'index.html').write_bytes(html_bytes)
        envelope = {n: digest((dest / n).read_bytes()) for n in ('index.html', 'sw.js', 'poc_boot.js')}
        catalog.append({'label': label, 'releaseId': release_id, 'url': '/releases/' + release_id + '/',
                        'envelope': envelope})
    (output / 'catalog.json').write_bytes(canonical(catalog))
    (output / 'index.html').write_text('<!doctype html><title>Private immutable PoC</title><h1>Local releases</h1>' +
                                     ''.join('<p><a href="' + r['url'] + '?map=c_apartment1&debug=1&timer=1&fx=0">' +
                                             r['label'] + ' ' + r['releaseId'] + '</a></p>' for r in catalog))
    return catalog


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--release', action='append', required=True, help='label=private-source-tree')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    print(json.dumps(generate([s.split('=', 1) for s in args.release], args.out), indent=2))
