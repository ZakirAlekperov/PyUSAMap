"""
API layer — business logic for state/city data.
Reads from static JSON (can be swapped for a DB without touching the handler).
"""
import json
import os

DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "static", "data", "states.json"
)

_cache = None


def _load_data():
    global _cache
    if _cache is None:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache


class StatesAPI:
    def get_all_states(self):
        """Return lightweight list for the sidebar (no cities)."""
        data = _load_data()
        result = {}
        for code, info in data.items():
            result[code] = {k: v for k, v in info.items() if k != "cities"}
        return result

    def get_state(self, code: str):
        """Return full state info including cities."""
        data = _load_data()
        state = data.get(code)
        if state is None:
            return None
        return {"code": code, **state}

    def get_cities(self, code: str):
        """Return only the cities list for a state."""
        data = _load_data()
        state = data.get(code)
        if state is None:
            return None
        return {"code": code, "cities": state.get("cities", [])}
