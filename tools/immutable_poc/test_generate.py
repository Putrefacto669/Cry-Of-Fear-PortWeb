"""Contracts for determinism, file_packager pairing, CAS reuse, and input preservation."""
import gzip
import json
from pathlib import Path
import tempfile
import unittest

from generate import canonical, digest, generate


class GeneratorContracts(unittest.TestCase):
    def fixture(self, root, suffix=b''):
        root.mkdir()
        (root / 'packs').mkdir()
        (root / 'index.html').write_text('<body><script src="loader.js"></script></body>')
        (root / 'loader.js').write_bytes(b'original loader' + suffix)
        (root / 'native.dll').write_bytes(b'not a web module')
        for name in ['engine', 'boot', 'map_test']:
            data = b'unchanged' if name != 'engine' else b'module' + suffix
            meta = {'files': [{'filename': '/lib/server.wasm', 'start': 0, 'end': len(data)}],
                    'remote_package_size': len(data)}
            (root / 'packs' / (name + '.js')).write_text('loadPackage(' + json.dumps(meta) + ');')
            (root / 'packs' / (name + '.data')).write_bytes(data)
            (root / 'packs' / (name + '.data.gz')).write_bytes(gzip.compress(data, mtime=0))
        (root / 'packs/maps.json').write_text('["test"]')

    def test_reproducible_shared_objects_and_private_inputs(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            a, b = d/'a', d/'b'
            self.fixture(a)
            self.fixture(b, b'changed')
            before = {p.relative_to(a).as_posix(): digest(p.read_bytes()) for p in a.rglob('*') if p.is_file()}
            c = generate([('a', a), ('b', b)], d/'out')
            again = generate([('different label', a)], d/'again')
            self.assertEqual(c[0]['releaseId'], again[0]['releaseId'])
            self.assertNotEqual(c[0]['releaseId'], c[1]['releaseId'])
            graphs = [json.loads((d/'out'/r['url'].lstrip('/')/'release.json').read_bytes()) for r in c]
            self.assertEqual(graphs[0]['packages']['boot']['pair'], graphs[1]['packages']['boot']['pair'])
            self.assertNotEqual(graphs[0]['packages']['engine']['pair'], graphs[1]['packages']['engine']['pair'])
            self.assertNotIn('native.dll', graphs[0]['resources'])
            for r, graph in zip(c, graphs):
                self.assertEqual(digest(canonical(graph)), r['releaseId'])
                self.assertEqual(digest((d/'out'/r['url'].lstrip('/')/'index.html').read_bytes()), graph['templates']['index.html'])
                for entry in graph['resources'].values():
                    self.assertEqual(digest((d/'out'/entry['url'].lstrip('/')).read_bytes()), entry['object'])
            self.assertEqual(before, {p.relative_to(a).as_posix(): digest(p.read_bytes()) for p in a.rglob('*') if p.is_file()})
            with self.assertRaises(ValueError):
                generate([('a', a)], d/'out')

    def test_rejects_wrong_gzip_and_wrong_offsets(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            a = d/'a'
            self.fixture(a)
            (a/'packs/engine.data.gz').write_bytes(gzip.compress(b'wrong', mtime=0))
            with self.assertRaisesRegex(ValueError, 'gzip disagrees'):
                generate([('a', a)], d/'bad-compression')
            (a/'packs/engine.data.gz').write_bytes(gzip.compress(b'module', mtime=0))
            p = a/'packs/engine.js'
            p.write_text(p.read_text().replace('"end": 6', '"end": 999'))
            with self.assertRaisesRegex(ValueError, 'Invalid package offset'):
                generate([('a', a)], d/'bad-offset')

    def test_missing_partner(self):
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            a = d/'a'
            self.fixture(a)
            (a/'packs/engine.data').unlink()
            with self.assertRaisesRegex(ValueError, 'Missing package partner'):
                generate([('a', a)], d/'bad-pair')


if __name__ == '__main__':
    unittest.main()
