const MAP_WIDTH = 960;
const MAP_HEIGHT = 600;

class USAMap {
  constructor(svgId) {
    this.svg = document.getElementById(svgId);
    this.selectedState = null;
    this.cityLayer = null;
    this._listeners = {};
    this._initSVG();
  }

  _initSVG() {
    this.svg.setAttribute("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);
    this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    this.stateLayer = this._makeGroup("state-layer");
    this.cityLayer = this._makeGroup("city-layer");
  }

  _makeGroup(id) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", id);
    this.svg.appendChild(g);
    return g;
  }

  renderStates(geojson) {
    this.stateLayer.innerHTML = "";
    geojson.features.forEach(feature => {
      const code = feature.properties.postal;
      const path = this._featureToPath(feature);
      if (!path) return;

      const el = document.createElementNS("http://www.w3.org/2000/svg", "path");
      el.setAttribute("d", path);
      el.setAttribute("class", "state-path");
      el.setAttribute("data-code", code);
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-label", feature.properties.name);

      el.addEventListener("click", () => this._emit("stateClick", code));
      el.addEventListener("dblclick", () => this._emit("stateDblClick", code));
      el.addEventListener("mouseenter", (e) => this._emit("stateHover", { code, x: e.clientX, y: e.clientY }));
      el.addEventListener("mouseleave", () => this._emit("stateLeave", code));
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this._emit("stateClick", code);
      });

      this.stateLayer.appendChild(el);

      const center = this._featureCenter(feature);
      if (center) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("class", "state-label");
        text.setAttribute("x", center[0]);
        text.setAttribute("y", center[1]);
        text.setAttribute("data-code", code);
        text.textContent = code;
        this.stateLayer.appendChild(text);
      }
    });
  }

  selectState(code) {
    if (this.selectedState) {
      const old = this.stateLayer.querySelector(`[data-code="${this.selectedState}"].state-path`);
      const oldLbl = this.stateLayer.querySelector(`text[data-code="${this.selectedState}"]`);
      if (old) old.classList.remove("selected");
      if (oldLbl) oldLbl.classList.remove("selected");
    }
    this.selectedState = code;
    if (code) {
      const el = this.stateLayer.querySelector(`[data-code="${code}"].state-path`);
      const lbl = this.stateLayer.querySelector(`text[data-code="${code}"]`);
      if (el) el.classList.add("selected");
      if (lbl) lbl.classList.add("selected");
    }
  }

  renderCities(cities) {
    this.cityLayer.innerHTML = "";
    cities.forEach(city => {
      const pt = albersUSA(city.lng, city.lat);
      if (!pt) return;
      const isCapital = !!city.capital;
      const r = isCapital ? 5 : 3.5;

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pt[0]);
      circle.setAttribute("cy", pt[1]);
      circle.setAttribute("r", r);
      circle.setAttribute("class", `city-dot ${isCapital ? "capital-dot" : "regular-dot"}`);
      circle.setAttribute("data-name", city.name);
      circle.addEventListener("mouseenter", (e) => {
        this._emit("cityHover", { name: city.name, pop: city.pop, capital: isCapital, x: e.clientX, y: e.clientY });
      });
      circle.addEventListener("mouseleave", () => this._emit("cityLeave"));
      this.cityLayer.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "city-label");
      text.setAttribute("x", pt[0] + r + 2);
      text.setAttribute("y", pt[1] + 3);
      text.textContent = city.name;
      this.cityLayer.appendChild(text);
    });
  }

  clearCities() { this.cityLayer.innerHTML = ""; }
  on(event, fn) { (this._listeners[event] = this._listeners[event] || []).push(fn); return this; }
  _emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); }

  _featureToPath(feature) {
    try {
      const geom = feature.geometry;
      if (geom.type === "Polygon") return this._polygonPath(geom.coordinates);
      if (geom.type === "MultiPolygon") return geom.coordinates.map(poly => this._polygonPath(poly)).join(" ");
    } catch(e) { return null; }
    return null;
  }

  _polygonPath(coords) {
    return coords.map(ring => {
      const pts = ring.map(([lng, lat]) => albersUSA(lng, lat)).filter(Boolean);
      if (pts.length < 3) return "";
      return "M" + pts.map(p => p.join(",")).join("L") + "Z";
    }).join(" ");
  }

  _featureCenter(feature) {
    try {
      const geom = feature.geometry;
      let rings = [];
      if (geom.type === "Polygon") rings = [geom.coordinates[0]];
      else if (geom.type === "MultiPolygon") {
        const polys = geom.coordinates.map(p => p[0]);
        rings = [polys.reduce((a, b) => a.length > b.length ? a : b)];
      }
      if (!rings[0]) return null;
      const pts = rings[0].map(([lng, lat]) => albersUSA(lng, lat)).filter(Boolean);
      const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      return [x, y];
    } catch(e) { return null; }
  }
}

function albersUSA(lng, lat) {
  const inset = albersUSAInset(lng, lat);
  if (inset) return inset;
  return albersConus(lng, lat);
}

function albersConus(lng, lat) {
  const phi1 = 29.5 * Math.PI / 180;
  const phi2 = 45.5 * Math.PI / 180;
  const phi0 = 37.5 * Math.PI / 180;
  const lam0 = -96 * Math.PI / 180;
  const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
  const c = Math.cos(phi1) * Math.cos(phi1) + 2 * n * Math.sin(phi1);
  const r0 = Math.sqrt(c - 2 * n * Math.sin(phi0)) / n;
  const lam = lng * Math.PI / 180 - lam0;
  const phi = lat * Math.PI / 180;
  const r = Math.sqrt(c - 2 * n * Math.sin(phi)) / n;
  const theta = n * lam;
  const scale = 1070;
  const tx = 480, ty = 310;
  return [scale * (r * Math.sin(theta)) + tx, scale * (r0 - r * Math.cos(theta)) + ty];
}

function albersUSAInset(lng, lat) {
  if (lat > 49 && lat < 72 && lng < -130 && lng > -180) {
    const lam0 = -154 * Math.PI / 180, phi0 = 62 * Math.PI / 180, phi1 = 55 * Math.PI / 180, phi2 = 65 * Math.PI / 180;
    const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
    const c = Math.cos(phi1)**2 + 2*n*Math.sin(phi1);
    const r0 = Math.sqrt(c - 2*n*Math.sin(phi0))/n;
    const lam = lng * Math.PI/180 - lam0, phi = lat * Math.PI/180;
    const r = Math.sqrt(c - 2*n*Math.sin(phi))/n, th = n*lam;
    return [0.35*380*(r*Math.sin(th)) + 130, 0.35*380*(r0-r*Math.cos(th)) + 500];
  }
  if (lat > 18 && lat < 23 && lng > -161 && lng < -154) {
    const lam0 = -157 * Math.PI / 180, phi0 = 20.7 * Math.PI / 180, phi1 = 19 * Math.PI / 180, phi2 = 22 * Math.PI / 180;
    const n = 0.5 * (Math.sin(phi1) + Math.sin(phi2));
    const c = Math.cos(phi1)**2 + 2*n*Math.sin(phi1);
    const r0 = Math.sqrt(c - 2*n*Math.sin(phi0))/n;
    const lam = lng * Math.PI/180 - lam0, phi = lat * Math.PI/180;
    const r = Math.sqrt(c - 2*n*Math.sin(phi))/n, th = n*lam;
    return [0.9*1200*(r*Math.sin(th)) + 300, 0.9*1200*(r0-r*Math.cos(th)) + 520];
  }
  return null;
}
