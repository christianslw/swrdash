/* ==========================================================================
   Modul: Standortkarte
   Zweispaltig: Filter/Liste/Tour links, Leaflet-Karte rechts.
   Standortdetails erscheinen als kompaktes Overlay-Drawer.
   ========================================================================== */
(function () {
  'use strict';
  const A = window.App;
  const D = A.D;
  const state = A.state;
  const ui = A.ui;

  let map = null;
  let markerGroup = null;
  let markerBySite = new Map();
  let filterTimer = null;

  const SERVICES = ['UKW/FM', 'DAB+', 'DVB-T2 HD', 'Mobilfunk', 'Richtfunk', 'DBOS', 'LoRaWAN'];
  const BAUARTEN = ['Gittertragwerk', 'Stahlbeton', 'Stahlröhre'];

  function upcomingOutagesFor(siteId) {
    return A.getOutages().filter((event) => event.siteId === siteId && event.status !== 'Abgeschlossen');
  }

  function hasGps(site) {
    return site && site.lat != null && site.lon != null;
  }

  function sourceSites() {
    if (ui.map.allSites === false && state.siteId) {
      const site = A.getSite(state.siteId);
      return site ? [site] : [];
    }
    return A.getSites();
  }

  function filteredSites() {
    const f = ui.map;
    const q = f.q.trim().toLowerCase();
    const outageSites = new Set(A.getOutages().filter((event) => event.status !== 'Abgeschlossen').map((event) => event.siteId));
    return sourceSites().filter((site) => {
      if (q) {
        const haystack = [site.nummer, site.name, site.kuerzel, site.rawName, site.region, ...(site.altNames || [])].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (f.service !== 'ALL' && !(site.services || []).some((service) => service.serviceType === f.service)) return false;
      if (f.bauart !== 'ALL' && site.bauart !== f.bauart) return false;
      if (f.region !== 'ALL' && site.region !== f.region) return false;
      if (f.pate !== 'ALL' && ![site.paten1, site.paten2, site.patenIfs].includes(f.pate)) return false;
      if (f.onlyOutages && !outageSites.has(site.nummer)) return false;
      return true;
    }).sort((a, b) => a.nummer.localeCompare(b.nummer));
  }

  function options(values, selected, allLabel) {
    return `<option value="ALL">${A.esc(allLabel)}</option>` + values.map((value) =>
      `<option value="${A.esc(value)}" ${value === selected ? 'selected' : ''}>${A.esc(value)}</option>`).join('');
  }

  function render() {
    const sites = filteredSites();
    const active = A.getSite(state.siteId);
    return `<div class="map-layout">
      <aside class="map-filters">
        <div class="map-filter-head">
          <div>
            <h2>Standortkarte</h2>
            <div class="result-line"><span>${sites.length} von ${sourceSites().length} Standorten</span><span>${sites.filter((s) => !hasGps(s)).length} ohne GPS</span></div>
          </div>
          <span class="tag tag-neutral">${sites.length}</span>
        </div>
        <div class="search-field">
          ${A.icon('search', 14)}
          <input id="mapSearch" class="input input-sm" type="text" placeholder="Name, Kürzel, Nr., Volksmund …" value="${A.esc(ui.map.q)}" autocomplete="off">
        </div>
        <div class="map-filter-grid">
          <label class="map-filter-field"><span>Dienst</span><select class="select input-sm" data-map-filter="service" aria-label="Dienst filtern">${options(SERVICES, ui.map.service, 'Alle Dienste')}</select></label>
          <label class="map-filter-field"><span>Bauart</span><select class="select input-sm" data-map-filter="bauart" aria-label="Bauart filtern">${options(BAUARTEN, ui.map.bauart, 'Alle Bauarten')}</select></label>
          <label class="map-filter-field"><span>Region</span><select class="select input-sm" data-map-filter="region" aria-label="Region filtern">${options(D.regions, ui.map.region, 'Alle Regionen')}</select></label>
          <label class="map-filter-field"><span>Standortpate</span><select class="select input-sm" data-map-filter="pate" aria-label="Standortpaten filtern">
            <option value="ALL">Alle Paten</option>
            ${D.users.filter((user) => user.roleKey !== 'ADMIN').map((user) => `<option value="${A.esc(user.id)}" ${ui.map.pate === user.id ? 'selected' : ''}>${A.esc(user.name)}</option>`).join('')}
          </select></label>
        </div>
        <div class="flex between center gap-8">
          <label class="check small"><input type="checkbox" data-map-filter="outages" ${ui.map.onlyOutages ? 'checked' : ''}> Nur mit Abschaltung</label>
          <button class="btn btn-xs btn-ghost" data-act="map-reset-filters">Zurücksetzen</button>
        </div>
        <div class="result-line"><span id="mapResultCount">${sites.length} Treffer</span><span class="muted">Liste &amp; Marker synchron</span></div>
        <div class="site-list" id="mapSiteList">${renderSiteList(sites)}</div>
        <div id="mapTourPanel">${renderTourPanel()}</div>
      </aside>

      <section class="map-stage">
        <div id="siteMap" aria-label="Interaktive Standortkarte"></div>
        <div class="map-overlay">
          <div class="map-info-box">
            ${A.icon('layers', 14)}
            <span id="mapVisibleCount">OSM · ${sites.filter(hasGps).length} Standorte sichtbar</span>
          </div>
        </div>
        <aside class="map-detail ${ui.map.detailOpen ? 'is-open' : ''}" id="mapDetail">${renderDetail(active)}</aside>
      </section>
    </div>`;
  }

  function renderSiteList(sites) {
    if (!sites.length) return `<div class="muted small" style="padding:12px 4px">Keine Treffer. Filter anpassen oder zurücksetzen.</div>`;
    return sites.map((site) => {
      const outage = upcomingOutagesFor(site.nummer).length > 0;
      return `<button class="site-list-item ${site.nummer === state.siteId ? 'is-active' : ''}" data-act="map-select" data-site="${A.esc(site.nummer)}">
        <span class="sl-num">${A.esc(site.nummer)}</span>
        <span class="sl-copy">
          <span class="sl-name">${A.esc(site.name)}</span>
          <span class="sl-meta">${A.esc(site.kuerzel || 'ohne Kürzel')} · ${A.esc(site.region || 'Region n/a')}</span>
        </span>
        <span class="sl-badges">
          ${outage ? '<span class="status-dot warn" title="Bevorstehende Abschaltung"></span>' : ''}
          ${hasGps(site) ? '' : '<span class="tag tag-yellow sl-gps">Ohne GPS</span>'}
        </span>
      </button>`;
    }).join('');
  }

  function renderWeather(site) {
    if (!A.getSetting('map.showWeather', true)) return '';
    if (!hasGps(site)) return '<div class="missing-value">Nicht hinterlegt – ohne Koordinaten keine Wetterdaten.</div>';
    return `<div class="map-drawer-section-title">Wetter &amp; Warnlage</div>
      <div data-weather="${A.esc(site.nummer)}" data-weather-compact="1" class="map-drawer-weather">
        <div class="muted small">DWD-Daten werden geladen …</div>
      </div>`;
  }

  function renderDetail(site) {
    if (!site) {
      return `<div class="map-detail-empty">
        <div style="color:var(--text-3)">${A.icon('map', 32)}</div>
        <h3>Standort auswählen</h3>
        <p class="small">Klicke einen Marker oder einen Eintrag in der Liste. Der Standortkontext gilt danach für alle Module.</p>
        <div class="quick-links" style="justify-content:center;margin-top:8px">
          ${['8400', '8700', '8321', '4000'].map((id) => {
            const s = A.getSite(id);
            return s ? `<button class="btn btn-secondary btn-sm" data-act="map-select" data-site="${id}">${A.esc(s.kuerzel || s.nummer)}</button>` : '';
          }).join('')}
        </div>
      </div>`;
    }
    const outages = upcomingOutagesFor(site.nummer).slice(0, 2);
    const inTour = ui.map.tour.includes(site.nummer);
    const gps = hasGps(site);
    return `
      <div class="map-detail-head">
        <div>
          <div class="map-detail-num">Standort ${A.esc(site.nummer)}</div>
          <h2>${A.esc(site.name)}</h2>
          <div class="small muted">${A.esc(site.region || 'Region n/a')}</div>
        </div>
        <button class="icon-btn" data-act="map-close-detail" title="Detail schließen" aria-label="Detail schließen">${A.icon('close', 14)}</button>
      </div>
      <div class="site-tags">
        <span class="tag">${A.esc(site.kuerzel || 'ohne Kürzel')}</span>
        ${site.bauart ? `<span class="tag tag-neutral">${A.esc(site.bauart)}</span>` : ''}
        ${site.towerHeight != null ? `<span class="tag tag-neutral">${A.esc(site.towerHeight)} m</span>` : ''}
        ${site.elevator === true ? '<span class="tag tag-green">Aufzug</span>' : site.elevator === false ? '<span class="tag tag-neutral">kein Aufzug</span>' : ''}
        ${gps ? '' : '<span class="tag tag-yellow">Ohne GPS</span>'}
      </div>
      <div class="map-drawer-facts">
        <div><span>Adresse</span><strong>${site.address ? A.esc(site.address) : '<span class="missing-value">Nicht hinterlegt</span>'}</strong></div>
        <div><span>Koordinaten</span><strong class="mono">${gps ? `${A.esc(site.lat)}, ${A.esc(site.lon)}` : 'Ohne GPS'}</strong>${gps ? `<button class="icon-btn" data-act="copy" data-copy="${site.lat}, ${site.lon}" title="Koordinaten kopieren">${A.icon('copy', 12)}</button>` : ''}</div>
        <div><span>Dienste</span><strong>${site.services?.length ? A.esc(site.services.map((service) => service.serviceType).join(' · ')) : '<span class="missing-value">Nicht hinterlegt</span>'}</strong></div>
      </div>
      <div class="map-drawer-section-title">Direkt öffnen</div>
      <div class="map-detail-links">
        <button class="hotlink" data-act="nav" data-module="master">${A.icon('building')} Stammdaten <span class="mono">Akte</span></button>
        <button class="hotlink" data-act="nav" data-module="maintenance">${A.icon('wrench')} Wartungen <span class="mono">${A.getMaintenance().filter((task) => task.siteId === site.nummer && task.status !== 'DONE').length} offen</span></button>
        <button class="hotlink" data-act="nav" data-module="protocols">${A.icon('document')} Protokolle <span class="mono">${state.protocols.filter((entry) => entry.siteId === site.nummer).length}</span></button>
        <button class="hotlink" data-act="nav" data-module="images">${A.icon('image')} Bildertool <span class="mono">Batch</span></button>
        <button class="hotlink" data-act="nav" data-module="outages">${A.icon('calendar')} Abschaltungen <span class="mono">${outages.length ? outages.length + ' geplant' : 'keine'}</span></button>
        ${site.folderLink ? `<a class="hotlink" href="${A.esc(site.folderLink)}" target="_blank" rel="noopener">${A.icon('folder')} SharePoint Ordner <span class="mono">extern</span></a>` : `<span class="hotlink is-disabled">${A.icon('folder')} SharePoint Ordner <span class="mono">Nicht hinterlegt</span></span>`}
        ${site.link ? `<a class="hotlink" href="${A.esc(site.link)}" target="_blank" rel="noopener">${A.icon('book')} Betriebstagebuch <span class="mono">XLSX</span></a>` : `<span class="hotlink is-disabled">${A.icon('book')} Betriebstagebuch <span class="mono">Nicht hinterlegt</span></span>`}
      </div>
      <div class="flex gap-8 mt-8">
        <button class="btn btn-secondary btn-sm grow" data-act="${inTour ? 'map-remove-tour' : 'map-add-tour'}" data-site="${A.esc(site.nummer)}">${A.icon(inTour ? 'check' : 'route')} ${inTour ? 'Aus Tour entfernen' : 'Zur Tour'}</button>
        ${gps ? `<a class="btn btn-secondary btn-sm" href="https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}" target="_blank" rel="noopener">${A.icon('route')} Route</a>` : ''}
      </div>
      ${renderWeather(site)}
      ${outages.length ? `<div class="map-drawer-outages">${outages.map((event) => `<div class="outage-mini">
        <div class="date-box"><div class="d">${A.esc(A.fmtShort(event.start).split(' ')[0])}</div><div class="m">${A.esc(A.fmtShort(event.start).split(' ').slice(1).join(' '))}</div></div>
        <div class="oc"><strong>${A.esc(event.title)}</strong><span>${A.esc(event.service)} · ${A.esc(A.fmtDateTime(event.start))}</span></div>
      </div>`).join('')}</div>` : ''}
    `;
  }

  function renderTourPanel() {
    const stops = ui.map.tour.map((id) => A.getSite(id)).filter(Boolean);
    const home = A.getSite(A.getSetting('map.homeSite', '8000'));
    const routePoints = [home, ...stops].filter((s) => hasGps(s));
    let distance = 0;
    for (let i = 1; i < routePoints.length; i += 1) distance += haversine(routePoints[i - 1], routePoints[i]);
    const minutes = Math.round((distance * 1.25 / 65) * 60 + Math.max(0, stops.length - 1) * 12);
    const timeLabel = `${minutes >= 60 ? Math.floor(minutes / 60) + ' h ' : ''}${minutes % 60} min`;
    return `<div class="map-tour">
      <div class="map-tour-head"><span>${A.icon('route', 13)} Tourplanung</span><span class="mono small">${stops.length} Stopp${stops.length === 1 ? '' : 's'}</span></div>
      <div class="map-tour-list">
        ${stops.length ? stops.map((site, index) => `<div class="map-tour-stop">
          <span class="mono">${index + 1}</span><span class="grow">${A.esc(site.nummer)} ${A.esc(site.kuerzel || '')}</span>
          <button class="icon-btn" data-act="map-remove-tour" data-site="${A.esc(site.nummer)}" title="Entfernen">${A.icon('close', 12)}</button>
        </div>`).join('') : '<div class="map-tour-empty">Noch keine Stopps. Standort über Detail oder Liste hinzufügen.</div>'}
      </div>
      <div class="map-tour-foot">
        <span>Fahrt ca. <strong>${Math.round(distance * 1.25)} km</strong> · <strong>${timeLabel}</strong></span>
        <div class="flex gap-4">
          ${stops.length ? `<button class="icon-btn" data-act="map-clear-tour" title="Tour leeren">${A.icon('trash', 13)}</button>` : ''}
          <button class="btn btn-xs btn-primary" data-act="map-route" ${stops.length ? '' : 'disabled'}>Route</button>
        </div>
      </div>
      <div class="map-tour-note">Start: ${A.esc(home ? `${home.nummer} ${home.name}` : 'Heimatstandort nicht gesetzt')} · Schätzung ohne Live-Verkehr</div>
    </div>`;
  }

  function haversine(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return 0;
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function openRoute() {
    const home = A.getSite(A.getSetting('map.homeSite', '8000'));
    const stops = ui.map.tour.map((id) => A.getSite(id)).filter((s) => hasGps(s));
    const active = A.getSite(state.siteId);
    const points = [...(ui.map.tour.length && home && hasGps(home) ? [home] : []), ...stops];
    if (!points.length && hasGps(active)) points.push(active);
    if (points.length < 2) {
      A.toast('Bitte mindestens einen Start- und Zielpunkt wählen (Tour oder Heimatstandort).', 'warning');
      return;
    }
    const route = points.map((s) => `${s.lat},${s.lon}`).join(';');
    window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`, '_blank', 'noopener');
  }

  function tileURL() {
    return A.getSetting('map.layer', 'osm') === 'topo'
      ? 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }

  function tileAttribution() {
    return A.getSetting('map.layer', 'osm') === 'topo'
      ? '&copy; OpenStreetMap, SRTM · OpenTopoMap (CC-BY-SA)'
      : '&copy; OpenStreetMap contributors';
  }

  function dotBadge(site) {
    const outage = upcomingOutagesFor(site.nummer).length > 0;
    const selected = site.nummer === state.siteId;
    return `<div class="marker-dot ${selected ? 'is-selected' : ''} ${outage && !selected ? 'has-outage' : ''}"></div>`;
  }

  function addMarkers(sites) {
    if (!map) return;
    markerGroup.clearLayers();
    markerBySite.clear();
    for (const site of sites) {
      if (!hasGps(site)) continue;
      const marker = L.marker([site.lat, site.lon], {
        icon: L.divIcon({ className: 'swr-marker', html: dotBadge(site), iconSize: [16, 16], iconAnchor: [8, 8] }),
        title: `${site.nummer} ${site.name}`,
        riseOnHover: true
      });
      marker.bindTooltip(`${site.nummer} · ${site.name}${hasGps(site) ? '' : ' · Ohne GPS'}`, { direction: 'top', offset: [0, -6] });
      marker.on('click', () => selectSite(site.nummer, true));
      marker.addTo(markerGroup);
      markerBySite.set(site.nummer, marker);
    }
  }

  function fitSites(sites) {
    if (!map) return;
    const coords = sites.filter(hasGps).map((s) => [s.lat, s.lon]);
    if (!coords.length) return;
    if (coords.length === 1) map.setView(coords[0], 11);
    else map.fitBounds(L.latLngBounds(coords).pad(0.12));
  }

  function renderFallback(container, sites) {
    const withCoords = sites.filter(hasGps);
    container.innerHTML = `<div class="fallback-map">
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Vereinfachte Standortkarte">
        <g class="fallback-grid">
          ${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 100}" y1="0" x2="${i * 100}" y2="500"/>`).join('')}
          ${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 100}" x2="800" y2="${i * 100}"/>`).join('')}
        </g>
        ${renderFallbackSites(withCoords)}
      </svg>
      <div class="fallback-note">Leaflet ist offline nicht verfügbar – vereinfachte Kartenansicht. Bei Online-Verbindung wird die OSM-Karte automatisch geladen.</div>
    </div>`;
  }

  function renderFallbackSites(sites) {
    if (!sites.length) return '';
    const lats = sites.map((s) => s.lat); const lons = sites.map((s) => s.lon);
    const minLat = Math.min(...lats) - 0.2; const maxLat = Math.max(...lats) + 0.2;
    const minLon = Math.min(...lons) - 0.2; const maxLon = Math.max(...lons) + 0.2;
    return sites.map((site) => {
      const x = 40 + ((site.lon - minLon) / (maxLon - minLon || 1)) * 720;
      const y = 460 - ((site.lat - minLat) / (maxLat - minLat || 1)) * 420;
      return `<circle class="fallback-site ${site.nummer === state.siteId ? 'is-selected' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${site.nummer === state.siteId ? 7 : 4}" data-act="map-select" data-site="${A.esc(site.nummer)}"><title>${A.esc(site.nummer)} ${A.esc(site.name)}</title></circle>`;
    }).join('');
  }

  function refreshMap(fit = true) {
    const sites = filteredSites();
    const count = document.getElementById('mapResultCount');
    if (count) count.textContent = `${sites.length} Treffer`;
    const list = document.getElementById('mapSiteList');
    if (list) list.innerHTML = renderSiteList(sites);
    const info = document.getElementById('mapVisibleCount');
    if (info) info.textContent = `OSM · ${sites.filter(hasGps).length} Standorte sichtbar · ${sites.filter((s) => !hasGps(s)).length} ohne GPS`;
    if (map) {
      addMarkers(sites);
      if (fit) fitSites(sites);
    } else {
      const stage = document.getElementById('siteMap');
      if (stage) renderFallback(stage, sites);
    }
  }

  function refreshTour() {
    const panel = document.getElementById('mapTourPanel');
    if (panel) panel.innerHTML = renderTourPanel();
    const detail = document.getElementById('mapDetail');
    const active = A.getSite(state.siteId);
    if (detail && ui.map.detailOpen && active) detail.innerHTML = renderDetail(active);
  }

  function selectSite(siteId, fromMap = false) {
    const site = A.getSite(siteId);
    if (!site) return;
    ui.map.detailOpen = true;
    A.setSite(siteId, { render: false, silent: true });
    const detail = document.getElementById('mapDetail');
    if (detail) {
      detail.classList.add('is-open');
      detail.innerHTML = renderDetail(site);
    }
    document.querySelectorAll('.site-list-item').forEach((el) => el.classList.toggle('is-active', el.dataset.site === siteId));
    markerBySite.forEach((marker, id) => {
      const s = A.getSite(id);
      if (!s) return;
      marker.setIcon(L.divIcon({ className: 'swr-marker', html: dotBadge(s), iconSize: [16, 16], iconAnchor: [8, 8] }));
    });
    if (map && hasGps(site)) map.setView([site.lat, site.lon], fromMap ? Math.max(map.getZoom(), 10) : 11);
    A.loadWeatherWidgets();
  }

  function closeDetail() {
    ui.map.detailOpen = false;
    document.getElementById('mapDetail')?.classList.remove('is-open');
  }

  function addTour(siteId) {
    if (!ui.map.tour.includes(siteId)) ui.map.tour.push(siteId);
    refreshTour();
    A.toast(`Standort ${siteId} zur Tour hinzugefügt.`, 'success');
  }

  function removeTour(siteId) {
    ui.map.tour = ui.map.tour.filter((id) => id !== siteId);
    refreshTour();
  }

  function resetFilters() {
    ui.map.q = ''; ui.map.service = 'ALL'; ui.map.bauart = 'ALL'; ui.map.region = 'ALL'; ui.map.pate = 'ALL'; ui.map.onlyOutages = false;
    const search = document.getElementById('mapSearch');
    if (search) search.value = '';
    document.querySelectorAll('[data-map-filter]').forEach((el) => {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = 'ALL';
    });
    refreshMap(true);
  }

  function setScope(all) {
    ui.map.allSites = !!all;
    refreshMap(true);
  }

  function settings() {
    return `
      <div class="setting-block">
        <h4>Karten-Layer</h4>
        <p>Standard-Layer beim Öffnen der Standortkarte.</p>
        <select class="select input-sm" data-setting="map.layer" data-rerender="true">
          <option value="osm" ${A.getSetting('map.layer') === 'osm' ? 'selected' : ''}>OpenStreetMap Standard</option>
          <option value="topo" ${A.getSetting('map.layer') === 'topo' ? 'selected' : ''}>OpenTopoMap (Topografie)</option>
        </select>
      </div>
      <div class="setting-block">
        <h4>Routing-Heimatstandort</h4>
        <p>Startpunkt für Tourplanung und Fahrtzeitschätzung.</p>
        <select class="select input-sm" data-setting="map.homeSite" data-rerender="true">
          ${A.getSites().sort((a, b) => a.nummer.localeCompare(b.nummer)).map((site) => `<option value="${site.nummer}" ${A.getSetting('map.homeSite') === site.nummer ? 'selected' : ''}>${site.nummer} · ${A.esc(site.name)}</option>`).join('')}
        </select>
      </div>
      <div class="setting-block">
        <div class="setting-inline">
          <div><h4 style="margin:0">DWD-Wetter anzeigen</h4><p style="margin:2px 0 0">Warnungen und Kurzvorhersage im Standort-Drawer.</p></div>
          <label class="switch"><input type="checkbox" data-setting="map.showWeather" data-rerender="true" ${A.getSetting('map.showWeather', true) ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="setting-block">
        <h4>Tourplanung</h4>
        <p>${ui.map.tour.length} Stopp(s) in der aktuellen Tour. Fahrtzeit wird im Prototyp geschätzt.</p>
        <button class="btn btn-secondary btn-sm" data-act="map-clear-tour">Tour leeren</button>
      </div>
      <div class="settings-note">OSM-Routing erfolgt über einen externen OSRM-Link. Echtzeit-Verkehr und Multi-Stop-ETA werden in Phase 3 angebunden.</div>`;
  }

  function mount() {
    const container = document.getElementById('siteMap');
    if (!container) return;
    const sites = filteredSites();
    if (!window.L) {
      renderFallback(container, sites);
      return;
    }
    map = L.map(container, { zoomControl: true, scrollWheelZoom: true, preferCanvas: true }).setView([48.8, 9.2], 7);
    L.tileLayer(tileURL(), { maxZoom: 18, attribution: tileAttribution() }).addTo(map);
    markerGroup = L.layerGroup().addTo(map);
    addMarkers(sites);
    const active = A.getSite(state.siteId);
    if (ui.map.initialized && hasGps(active)) map.setView([active.lat, active.lon], 10);
    else fitSites(sites);
    ui.map.initialized = true;
    setTimeout(() => map?.invalidateSize(), 30);
  }

  function cleanup() {
    if (map) { map.remove(); map = null; markerGroup = null; markerBySite = new Map(); }
    if (filterTimer) { clearTimeout(filterTimer); filterTimer = null; }
  }

  A.registerModule('map', { label: 'Standortkarte', icon: 'map', flush: true, render, mount, cleanup, settings, setScope });

  A.registerAction('map-select', (el) => selectSite(el.dataset.site, false));
  A.registerAction('map-close-detail', closeDetail);
  A.registerAction('map-add-tour', (el) => addTour(el.dataset.site || state.siteId));
  A.registerAction('map-remove-tour', (el) => removeTour(el.dataset.site));
  A.registerAction('map-clear-tour', () => { ui.map.tour = []; refreshTour(); A.toast('Tour geleert.', 'info'); });
  A.registerAction('map-route', openRoute);
  A.registerAction('map-reset-filters', resetFilters);

  A.onInput('#mapSearch', (el) => {
    ui.map.q = el.value;
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => refreshMap(false), 160);
  });

  A.onChange('[data-map-filter]', (el) => {
    const key = el.dataset.mapFilter;
    if (key === 'outages') ui.map.onlyOutages = el.checked;
    else ui.map[key] = el.value;
    refreshMap(true);
  });
})();
