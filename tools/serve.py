#!/usr/bin/env python3
"""
serve.py - Servidor local para dist/ con aislamiento de origen (COOP/COEP) y tipos MIME correctos.

    python3 serve.py [dir] [--port 8080] [--host 127.0.0.1]

Cabeceras que añade a cada respuesta:
    Cross-Origin-Opener-Policy:   same-origin
    Cross-Origin-Embedder-Policy: require-corp
    Cross-Origin-Resource-Policy: same-origin
Con las dos primeras la página queda en modo crossOriginIsolated, que es lo que habilita
SharedArrayBuffer (pthreads de Emscripten) y temporizadores de alta precisión. El build actual
no usa hilos y funcionaría sin ellas; se sirven igual para que el entorno local coincida con el
de producción el día que se activen los hilos.

Ojo: con COEP require-corp el navegador bloquea recursos de otros orígenes que no envíen CORP/CORS.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import sys
from pathlib import Path

ISOLATION_HEADERS = {
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
}

class Handler(http.server.SimpleHTTPRequestHandler):
    # .wasm debe ir como application/wasm o WebAssembly.instantiateStreaming falla
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".wasm": "application/wasm", ".js": "text/javascript",
                      ".data": "application/octet-stream"}

    def end_headers(self):
        for k, v in ISOLATION_HEADERS.items():
            self.send_header(k, v)
        # Desarrollo: que cada recarga traiga el último build (los .data ya los cachea IndexedDB)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if args and str(args[1]).startswith(("4", "5")):  # solo errores
            super().log_message(fmt, *args)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dir", nargs="?", type=Path, default=Path.home() / "cof-web/dist")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--host", default="127.0.0.1",
                    help="0.0.0.0 para acceder desde otra máquina (en WSL2 no hace falta para Windows)")
    args = ap.parse_args()

    if not (args.dir / "index.html").is_file():
        print(f"No hay index.html en {args.dir}: ejecuta antes tools/wsl/package.sh", file=sys.stderr)
        return 2
    handler = functools.partial(Handler, directory=str(args.dir))
    with http.server.ThreadingHTTPServer((args.host, args.port), handler) as srv:
        print(f"Sirviendo {args.dir} en http://localhost:{args.port}/  (COOP/COEP activos, Ctrl+C para salir)")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
