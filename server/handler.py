"""
HTTP request handler — routes requests to the appropriate controller.
Serves static files and API endpoints.
"""
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")


class USAMapHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {format % args}")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/" or path == "/index.html":
            self._serve_template("index.html")
        elif path.startswith("/api/"):
            self._handle_api(path, parse_qs(parsed.query))
        elif path.startswith("/static/"):
            self._serve_static(path[len("/static/"):])
        else:
            self._send_404()

    def _handle_api(self, path, params):
        from server.api import StatesAPI
        api = StatesAPI()

        if path == "/api/states":
            data = api.get_all_states()
        elif path.startswith("/api/states/") and path.count("/") == 3:
            code = path.split("/")[3].upper()
            data = api.get_state(code)
            if data is None:
                self._send_json({"error": "State not found"}, 404)
                return
        elif path.startswith("/api/states/") and path.endswith("/cities"):
            code = path.split("/")[3].upper()
            data = api.get_cities(code)
            if data is None:
                self._send_json({"error": "State not found"}, 404)
                return
        else:
            self._send_json({"error": "Not found"}, 404)
            return

        self._send_json(data)

    def _serve_template(self, name):
        path = os.path.join(TEMPLATES_DIR, name)
        if not os.path.exists(path):
            self._send_404()
            return
        with open(path, "rb") as f:
            content = f.read()
        self._send_response(200, content, "text/html; charset=utf-8")

    def _serve_static(self, rel_path):
        path = os.path.join(STATIC_DIR, rel_path)
        path = os.path.normpath(path)
        if not path.startswith(STATIC_DIR):
            self._send_404()
            return
        if not os.path.isfile(path):
            self._send_404()
            return
        mime, _ = mimetypes.guess_type(path)
        mime = mime or "application/octet-stream"
        with open(path, "rb") as f:
            content = f.read()
        self._send_response(200, content, mime)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self._send_response(status, body, "application/json; charset=utf-8")

    def _send_response(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", len(body))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _send_404(self):
        self._send_json({"error": "Not found"}, 404)
