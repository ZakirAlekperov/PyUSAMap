class AppController {
  constructor() {
    this.map = new USAMap("usa-map");
    this.statesData = {};
    this.selectedCode = null;
    this.citiesVisible = false;
    this.searchQuery = "";
    this.activeRegion = "all";
    this.$sidebar = document.getElementById("states-list");
    this.$infoPanel = document.getElementById("info-panel");
    this.$tooltip = document.getElementById("tooltip");
    this.$search = document.getElementById("search-input");
    this.$regionChips = document.querySelectorAll(".region-chip");
    this._bindThemeToggle();
  }

  async init() {
    const [geojson, states] = await Promise.all([
      fetch("/static/data/us-states.geojson").then(r => r.json()),
      fetch("/api/states").then(r => r.json()),
    ]);
    this.statesData = states;
    this.geojson = geojson;
    this.map.renderStates(geojson);
    this._renderSidebar(states);
    this._bindMapEvents();
    this._bindSearchEvents();
    this._bindRegionChips();
    this._bindInfoPanelClose();
  }

  _bindMapEvents() {
    this.map
      .on("stateClick", code => this._selectState(code, false))
      .on("stateDblClick", code => this._selectState(code, true))
      .on("stateHover", ({ code, x, y }) => {
        const s = this.statesData[code];
        if (s) this._showTooltip(s.name, x, y);
      })
      .on("stateLeave", () => this._hideTooltip())
      .on("cityHover", ({ name, pop, capital, x, y }) => {
        const label = capital ? `★ ${name} (capital)` : name;
        const popS = pop ? ` · ${pop.toLocaleString()}` : "";
        this._showTooltip(label + popS, x, y);
      })
      .on("cityLeave", () => this._hideTooltip());
  }

  async _selectState(code, showCities) {
    const alreadySelected = this.selectedCode === code;
    if (alreadySelected && !showCities && !this.citiesVisible) {
      this._deselect();
      return;
    }

    this.selectedCode = code;
    this.map.selectState(code);
    this._highlightSidebarItem(code);

    const data = await fetch(`/api/states/${code}`).then(r => r.json());
    this._renderInfoPanel(data, showCities);

    if (showCities) {
      this.citiesVisible = true;
      this.map.renderCities(data.cities || []);
    } else if (!alreadySelected) {
      this.citiesVisible = false;
      this.map.clearCities();
    }
  }

  _deselect() {
    this.selectedCode = null;
    this.citiesVisible = false;
    this.map.selectState(null);
    this.map.clearCities();
    this._hideInfoPanel();
    this._highlightSidebarItem(null);
  }

  _renderSidebar(states) {
    const sorted = Object.entries(states).sort(([,a],[,b]) => a.name.localeCompare(b.name));
    this._renderStateItems(sorted);
  }

  _renderStateItems(entries) {
    this.$sidebar.innerHTML = "";
    if (!entries.length) {
      this.$sidebar.innerHTML = `<div class="states-empty">No states found</div>`;
      return;
    }
    entries.forEach(([code, info]) => {
      const li = document.createElement("li");
      li.className = "state-item";
      li.dataset.code = code;
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      li.setAttribute("aria-label", `${info.name} — click to select, double-click for cities`);
      li.innerHTML = `
        <span class="state-code">${code}</span>
        <span class="state-name-text">${info.name}</span>
        <span class="state-dblclick-hint" title="Double-click to show cities">↯</span>
      `;
      li.addEventListener("click", () => this._selectState(code, false));
      li.addEventListener("dblclick", () => this._selectState(code, true));
      li.addEventListener("keydown", e => {
        if (e.key === "Enter") this._selectState(code, false);
        if (e.key === " ") this._selectState(code, true);
      });
      this.$sidebar.appendChild(li);
    });
  }

  _highlightSidebarItem(code) {
    this.$sidebar.querySelectorAll(".state-item").forEach(el => {
      el.classList.toggle("active", el.dataset.code === code);
    });
    if (code) {
      const active = this.$sidebar.querySelector(`[data-code="${code}"]`);
      active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  _bindSearchEvents() {
    this.$search.addEventListener("input", () => {
      this.searchQuery = this.$search.value.trim().toLowerCase();
      this._applyFilter();
    });
  }

  _bindRegionChips() {
    this.$regionChips.forEach(chip => {
      chip.addEventListener("click", () => {
        this.$regionChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.activeRegion = chip.dataset.region;
        this._applyFilter();
      });
    });
  }

  _applyFilter() {
    const q = this.searchQuery;
    const r = this.activeRegion;
    const filtered = Object.entries(this.statesData).filter(([code, info]) => {
      const matchRegion = r === "all" || info.region === r;
      const matchSearch = !q || info.name.toLowerCase().includes(q) || code.toLowerCase().includes(q);
      return matchRegion && matchSearch;
    }).sort(([,a],[,b]) => a.name.localeCompare(b.name));
    this._renderStateItems(filtered);
    if (this.selectedCode) this._highlightSidebarItem(this.selectedCode);
  }

  _renderInfoPanel(data, showCities) {
    document.getElementById("ip-code").textContent = data.code;
    document.getElementById("ip-name").textContent = data.name;
    document.getElementById("ip-nickname").textContent = `"${data.nickname}"`;
    document.getElementById("ip-capital").textContent = data.capital;
    document.getElementById("ip-founded").textContent = data.founded;
    document.getElementById("ip-region").textContent = data.region;
    document.getElementById("ip-pop").textContent = (data.population || 0).toLocaleString();
    document.getElementById("ip-area").textContent = (data.area_sq_mi || 0).toLocaleString() + " mi²";

    const citiesSection = document.getElementById("ip-cities-section");
    if (showCities && data.cities?.length) {
      citiesSection.style.display = "block";
      const list = document.getElementById("ip-cities-list");
      list.innerHTML = data.cities
        .sort((a,b) => (b.pop || 0) - (a.pop || 0))
        .map(c => `
          <li class="city-list-item">
            <span class="city-dot-indicator ${c.capital ? 'capital' : 'regular'}"></span>
            <span class="city-list-name">${c.name}${c.capital ? ' <span class="city-capital-badge">Capital</span>' : ''}</span>
            <span class="city-list-pop">${(c.pop || 0).toLocaleString()}</span>
          </li>`).join("");
    } else {
      citiesSection.style.display = "none";
    }

    document.getElementById("ip-hint").textContent = showCities ? "Cities shown on map" : "Double-click state to show cities";
    this._showInfoPanel();
  }

  _showInfoPanel() { this.$infoPanel.classList.add("visible"); }
  _hideInfoPanel() { this.$infoPanel.classList.remove("visible"); }
  _bindInfoPanelClose() { document.getElementById("info-panel-close").addEventListener("click", () => this._deselect()); }
  _showTooltip(text, x, y) { this.$tooltip.textContent = text; this.$tooltip.style.left = (x + 12) + "px"; this.$tooltip.style.top = (y - 28) + "px"; this.$tooltip.classList.add("show"); }
  _hideTooltip() { this.$tooltip.classList.remove("show"); }

  _bindThemeToggle() {
    const html = document.documentElement;
    const btn = document.querySelector("[data-theme-toggle]");
    let theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const update = () => {
      html.setAttribute("data-theme", theme);
      if (btn) {
        btn.innerHTML = theme === "dark"
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        btn.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
      }
    };
    update();
    btn?.addEventListener("click", () => { theme = theme === "dark" ? "light" : "dark"; update(); });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const app = new AppController();
  try { await app.init(); }
  catch (err) { console.error("Failed to initialize PyUSAMap:", err); }
});
