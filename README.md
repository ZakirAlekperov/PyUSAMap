# PyUSAMap

Interactive USA map web app built with pure Python and vanilla web technologies.

## Features

- Interactive SVG map of the United States
- Click a state to highlight it and open state info
- Double-click a state or state name to show major cities
- State list with search and region filters
- Dark and light mode
- Clean architecture with separated server, API, renderer, and UI layers
- No frameworks, no external Python dependencies

## Quick start

```bash
python main.py
```

Open: http://localhost:8000

Custom port:

```bash
python main.py 9000
```

## Project structure

```text
PyUSAMap/
├── main.py
├── server/
│   ├── __init__.py
│   ├── api.py
│   └── handler.py
├── templates/
│   └── index.html
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── map.js
│   │   └── app.js
│   └── data/
│       ├── states.json
│       └── us-states.geojson
└── README.md
```

## API

- `GET /api/states` — list of states
- `GET /api/states/{CODE}` — full state info
- `GET /api/states/{CODE}/cities` — state cities only

## Notes

The current dataset contains an initial subset of states for UI and architecture demonstration. The next step is to add the full 50-state dataset and `us-states.geojson` geometry file.
