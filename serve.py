#!/usr/bin/env python3
"""Local server for the deck. Usage: python3 serve.py [port]   (default 4173)
Serves this folder at /ai-talk/, the same path it has on GitHub Pages, so the
Transformer Explainer (built for /ai-talk/explainer) works identically in both.
Nothing is fetched from the network."""
import http.server, socketserver, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
PREFIX = '/ai-talk'
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.wasm': 'application/wasm', '.mjs': 'text/javascript', '.js': 'text/javascript'}

    def send_head(self):
        # anything outside /ai-talk/ is redirected into it (e.g. http://localhost:4173/ → /ai-talk/)
        if self.path != PREFIX and not self.path.startswith(PREFIX + '/'):
            self.send_response(302)
            self.send_header('Location', PREFIX + (self.path if self.path.startswith('/') else '/'))
            self.end_headers()
            return None
        return super().send_head()

    def translate_path(self, path):
        return super().translate_path(path[len(PREFIX):] or '/')

    def end_headers(self):
        # big model files are safe to cache; deck code should always be fresh
        p = self.path[len(PREFIX):]
        heavy = p.startswith(('/explainer/model-v2/', '/data/', '/vendor/', '/explainer/ort/'))
        self.send_header('Cache-Control', 'public, max-age=86400' if heavy else 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

print(f'Deck:       http://localhost:{PORT}{PREFIX}/\nPresenter:  http://localhost:{PORT}{PREFIX}/?presenter   (or press P in the deck)')
Server(('127.0.0.1', PORT), Handler).serve_forever()
