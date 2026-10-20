#!/usr/bin/env python3
"""Local server for the deck. Usage: python3 serve.py [port]   (default 4173)
Serves this folder at the site root, the same as https://ai-intro.brenorb.com/,
so the local Transformer Explainer copy (built for /explainer) works the same way.
Nothing is fetched from the network."""
import http.server, socketserver, sys, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.wasm': 'application/wasm', '.mjs': 'text/javascript', '.js': 'text/javascript'}

    def send_head(self):
        # old links from when the deck lived at /ai-talk/ still work
        if self.path == '/ai-talk' or self.path.startswith('/ai-talk/'):
            self.send_response(302)
            self.send_header('Location', self.path[len('/ai-talk'):] or '/')
            self.end_headers()
            return None
        return super().send_head()

    def end_headers(self):
        # big model files are safe to cache; deck code should always be fresh
        heavy = self.path.startswith(('/explainer/model-int8/', '/data/', '/vendor/', '/explainer/ort/'))
        self.send_header('Cache-Control', 'public, max-age=86400' if heavy else 'no-store')
        super().end_headers()

    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

print(f'Deck:       http://localhost:{PORT}/\nPresenter:  http://localhost:{PORT}/?presenter   (or press P in the deck)')
Server(('127.0.0.1', PORT), Handler).serve_forever()
