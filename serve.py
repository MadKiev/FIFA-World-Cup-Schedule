#!/usr/bin/env python3
"""
World Cup 2026 PWA — Local Test Server
Run this to test before pushing to GitHub.

Usage:
  python3 serve.py

Then open: http://localhost:8080
"""
import http.server, socketserver, os, sys

PORT = 8080
DIR  = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    def end_headers(self):
        # Required for PWA/service worker
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Cache-Control', 'no-cache')
        # Allow CORS for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"  {args[0]} {args[1]}")

os.chdir(DIR)
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"\n⚽ World Cup 2026 PWA — Local Test Server")
    print(f"   Open: http://localhost:{PORT}")
    print(f"   Stop: Ctrl+C\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
