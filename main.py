"""
Entry point — starts the HTTP server.
Usage: python main.py [port]
"""
import sys
from http.server import HTTPServer
from server.handler import USAMapHandler

DEFAULT_PORT = 8000


def run(port: int = DEFAULT_PORT):
    addr = ("", port)
    server = HTTPServer(addr, USAMapHandler)
    print(f"PyUSAMap server running → http://localhost:{port}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    run(port)
