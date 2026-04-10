# PyUSAMap

Interactive USA map web app. Pure Python + Vanilla JS, no frameworks.

## Quick start

```bash
python main.py          # runs on http://localhost:8000
python main.py 9000     # custom port
```

## Setup (first time)

```bash
# Download and convert state geometry
curl -sL "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json" -o states-topo.json
python convert_topo.py
rm states-topo.json
```

## Architecture

```text
server/handler.py   HTTP routing only
server/api.py       Business logic / data layer
static/js/map.js    SVG renderer + Albers USA projection
static/js/app.js    UI orchestration
static/data/        JSON data (swappable with DB)
```

## API endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/` | Web app |
| GET | `/api/states` | All states (no cities) |
| GET | `/api/states/{CODE}` | Full state info + cities |
| GET | `/api/states/{CODE}/cities` | Cities only |
