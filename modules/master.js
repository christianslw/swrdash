/* ==========================================================================
   Modul: Stammdaten
   Kompakte Standortakte: links Bauwerk/Adresse/Anfahrt/Paten, rechts Dienste,
   Wetter, OSM-Verkehr und Abschaltungen. Null-sicher für unvollständige Daten.
   ========================================================================== */
(function () {
  'use strict';
  const A = window.App;
  const state = A.state;
  const ui = A.ui;

  let miniMap = null;
  let dirTimer = null;

  const ROLE_LABELS = {
    paten1: '1. Standortpate',
    paten2: '2. Standortpate',
    patenIfs: 'IFS-Standortpate'
  };

  function canEdit(site) {
    return A.canEditSite(site);
  }

  function missing() {
    return '<span class="missing-value">Nicht hinterlegt</span>';
  }

  function valueOr(value, formatter = (input) => A.esc(input)) {
    return value == null || value === '' ? missing() : formatter(value);
  }

  function hasGps(site) {
    return site && site.lat != null && site.lon != null;
  }

  function missingLabels(site) {
    const checks = [
      ['Kürzel', site.kuerzel],
      ['Adresse', site.address],
      ['Koordinaten', hasGps(site) ? true : null],
      ['Bauart', site.bauart],
      ['Turmhöhe', site.towerHeight],
      ['Aufzug', site.elevator],
      ['Anfahrt', site.approach],
      ['Standortpaten', site.paten1 || site.paten2 || site.patenIfs],
      ['Dienste', site.services && site.services.length ? true : null]
    ];
    return checks.filter(([, value]) => value == null || value === '').map(([label]) => label);
  }

  /* ------------------------------------------------------------- Render --- */
  function render() {
    const site = A.getSite(state.siteId);
    if (!site) {
      return ui.master.allSites
        ? renderDirectory()
        : `<div class="page-head">
          <div class="page-head-copy"><div class="eyebrow">Stammdaten</div><h1>Standortakte</h1><p class="page-sub">Wähle einen Standort über die globale Suche oder die Karte.</p></div>
        </div>
        ${A.emptyState('building', 'Kein Standort ausgewählt', 'Die Stammdaten sind immer an den globalen Standortkontext gebunden. Öffne die Karte oder nutze die Suche im Kopfbereich.', `<button class="btn btn-primary" data-act="nav" data-module="map">${A.icon('map')} Zur Standortkarte</button>`)}`;
    }
    if (ui.master.allSites) return renderDirectory();

    const editing = ui.master.edit;
    const draft = ui.master.draft || {};
    const allowed = canEdit(site);
    const missingFields = missingLabels(site);
    const gps = hasGps(site);

    return `<div class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow">Stammdaten <span class="tag tag-neutral">Standortakte</span></div>
        <h1>Stammdaten</h1>
        <p class="page-sub">${A.esc(site.region || 'Region n/a')} · ${site.address ? A.esc(site.address) : 'Adresse nicht hinterlegt'} · ${(site.services || []).length} Dienste</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-secondary btn-sm" data-act="nav" data-module="map">${A.icon('map')} Karte</button>
        <button class="btn btn-secondary btn-sm" data-act="nav" data-module="maintenance">${A.icon('wrench')} Wartungen</button>
        <button class="btn btn-secondary btn-sm" data-act="nav" data-module="protocols">${A.icon('document')} Protokolle</button>
        <button class="btn btn-secondary btn-sm" data-act="nav" data-module="images">${A.icon('image')} Bildertool</button>
        <button class="btn btn-secondary btn-sm" data-act="nav" data-module="outages">${A.icon('calendar')} Abschaltungen</button>
        ${editing
          ? `<button class="btn btn-secondary btn-sm" data-act="master-cancel">Abbrechen</button><button class="btn btn-primary btn-sm" data-act="master-save">${A.icon('check')} Speichern</button>`
          : `<button class="btn btn-primary btn-sm" data-act="master-edit" ${allowed ? '' : 'disabled title="Kein Schreibzugriff für diesen Standort"'}>${A.icon('edit')} Bearbeiten</button>`}
      </div>
    </div>

    <div class="site-hero">
      <div class="site-hero-num">${A.esc(site.nummer)}</div>
      <div class="site-hero-copy">
        <h2>${A.esc(site.name)}</h2>
        <div class="site-sub">
          <span class="mono">${site.kuerzel ? A.esc(site.kuerzel) : 'ohne Kürzel'}</span><span>·</span><span>${A.esc(site.region || 'Region n/a')}</span>
          ${site.bauart ? `<span>·</span><span>${A.esc(site.bauart)}${site.towerHeight != null ? ' · ' + A.esc(site.towerHeight) + ' m' : ''}</span>` : ''}
          ${(site.altNames || []).length ? `<span>·</span><span class="muted">auch: ${A.esc(site.altNames.join(', '))}</span>` : ''}
        </div>
      </div>
      <div class="site-hero-actions">
        <span class="tag ${allowed ? 'tag-green' : 'tag-neutral'}">${A.icon('lock', 12)} ${editing ? 'Editiermodus' : allowed ? 'Schreibzugriff' : 'Lesemodus'}</span>
      </div>
    </div>

    ${site.incomplete ? `<div class="incomplete-banner">${A.icon('alert', 16)}<div><strong>Stammdaten unvollständig.</strong> ${missingFields.length ? `Nicht hinterlegt: ${A.esc(missingFields.join(', '))}.` : ''} Daten stammen aus dem importierten Standortverzeichnis und werden in Phase 3 ergänzt.</div></div>` : ''}

    <div class="master-grid">
      <div class="stack">
        <section class="card card--plain master-panel">
          <div class="card-head">
            <div><div class="card-title">Gebäude & Adresse</div><div class="card-sub">Stammdaten, Koordinaten und Bauwerk</div></div>
            ${gps ? `<a class="btn btn-xs btn-ghost" href="https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lon}" target="_blank" rel="noopener">${A.icon('external', 12)} Google Maps</a>` : ''}
          </div>
          ${editing ? renderEditFields(site, draft) : renderReadFields(site)}
        </section>

        <section class="card card--plain master-panel">
          <div class="card-head"><div><div class="card-title">Anfahrt</div><div class="card-sub">Letzter Streckenabschnitt</div></div><span class="tag tag-neutral">OSM</span></div>
          <div class="mini-map" id="masterMiniMap"><div class="muted small" style="padding:12px">Kartenausschnitt wird geladen …</div></div>
          <p class="small" style="margin-top:8px;color:var(--text-2);line-height:1.5">${site.approach ? A.esc(site.approach) : missing()}</p>
          <div class="quick-links" style="margin-top:8px">
            ${gps ? `<a class="btn btn-secondary btn-sm" href="https://www.google.com/maps/dir/?api=1&destination=${site.lat},${site.lon}" target="_blank" rel="noopener">${A.icon('route')} Route öffnen</a>` : ''}
            ${site.folderLink ? `<a class="btn btn-secondary btn-sm" href="${A.esc(site.folderLink)}" target="_blank" rel="noopener">${A.icon('external')} Standortordner</a>` : ''}
          </div>
        </section>

        <section class="card card--plain master-panel">
          <div class="card-head"><div><div class="card-title">Standortpaten</div><div class="card-sub">Kontaktdaten aus der Benutzertabelle</div></div><span class="tag tag-neutral">RBAC</span></div>
          <div class="contact-grid">
            ${['paten1', 'paten2', 'patenIfs'].map((key) => contactCard(site, key)).join('')}
          </div>
        </section>

        ${A.getSetting('master.showAudit', true) ? `<section class="card card--plain master-panel">
          <div class="card-head"><div><div class="card-title">Audit-Log</div><div class="card-sub">Letzte Änderungen an diesem Standort</div></div><span class="tag tag-neutral">${auditEntries(site).length}</span></div>
          ${auditHtml(site)}
        </section>` : ''}
      </div>

      <div class="stack">
        <section class="card card--plain master-panel">
          <div class="card-head"><div><div class="card-title">Dienste-Matrix</div><div class="card-sub">Normalisierte site_services · ${(site.services || []).length} Einträge</div></div><span class="tag tag-neutral">read-only</span></div>
          ${(site.services || []).length ? `<div class="table-wrap">
            <table class="data-table service-table">
              <thead><tr><th>Dienst</th><th>Betreiber</th><th>Frequenz / Kanal</th></tr></thead>
              <tbody>${site.services.map((service) => `<tr>
                <td>${A.serviceTag(service.serviceType)}</td>
                <td>${A.esc(service.operator)}</td>
                <td class="num">${A.esc(service.frequency)} ${service.channelBlock && service.channelBlock !== '–' ? `<span class="muted">· ${A.esc(service.channelBlock)}</span>` : ''}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div>` : `<div class="muted small">${missing()}</div>`}
        </section>

        ${A.getSetting('master.showWeather', true) ? `<section class="card card--plain master-panel">
          <div class="card-head"><div><div class="card-title">Wetter & Warnlage</div><div class="card-sub">DWD über Bright Sky</div></div><span class="tag tag-neutral">DWD</span></div>
          <div data-weather="${A.esc(site.nummer)}">${gps ? '<div class="muted small">Wetterdaten werden geladen …</div>' : `<div class="muted small">${missing()} – ohne Koordinaten keine Wetterdaten.</div>`}</div>
        </section>` : ''}

        <section class="card card--plain master-panel">
          <div class="card-head"><div><div class="card-title">Verkehrslage</div><div class="card-sub">OSM / OSRM · ohne Live-Verkehr</div></div><span class="tag tag-neutral">OSM</span></div>
          ${trafficBox(site)}
        </section>

        <section class="card card--plain master-panel">
          <div class="card-head"><div><div class="card-title">Bevorstehende Abschaltungen</div><div class="card-sub">Verknüpft mit dem Abschaltungs-Kalender</div></div><button class="btn btn-xs btn-ghost" data-act="nav" data-module="outages">Kalender</button></div>
          ${upcomingOutages(site)}
        </section>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------ Directory -- */
  function renderDirectory() {
    const sites = A.getSites().sort((a, b) => a.nummer.localeCompare(b.nummer));
    return `<div class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow">Stammdaten <span class="tag tag-neutral">Alle Standorte</span></div>
        <h1>Standortverzeichnis</h1>
        <p class="page-sub">${sites.length} Standorte. Zeile öffnet die vollständige Akte und setzt den Standortkontext.</p>
      </div>
    </div>
    <div class="toolbar">
      <div class="search-field">
        ${A.icon('search', 14)}
        <input id="masterDirSearch" class="input input-sm" type="text" placeholder="Nummer, Kürzel, Name, Volksmund …" autocomplete="off">
      </div>
      <div class="toolbar-spacer"></div>
      <span class="small muted" id="masterDirCount">${sites.length} ${sites.length === 1 ? 'Standort' : 'Standorte'}</span>
    </div>
    <div id="masterDirTable">${directoryTable(sites)}</div>`;
  }

  function directoryTable(sites) {
    if (!sites.length) return A.emptyState('building', 'Keine Standorte gefunden', 'Suchbegriff anpassen.', '');
    return `<div class="table-wrap"><table class="data-table directory-table">
      <thead><tr><th>Nr.</th><th>Kürzel</th><th>Standort</th><th>Region</th><th>Dienste</th><th>Status</th></tr></thead>
      <tbody>${sites.map((site) => `<tr data-act="set-site" data-site="${A.esc(site.nummer)}">
        <td class="num">${A.esc(site.nummer)}</td>
        <td class="mono">${site.kuerzel ? A.esc(site.kuerzel) : missing()}</td>
        <td><span class="cell-title">${A.esc(site.name)}</span>${site.address ? `<div class="cell-sub">${A.esc(site.address)}</div>` : ''}</td>
        <td>${A.esc(site.region || '–')}</td>
        <td>${(site.services || []).length ? A.esc((site.services || []).map((service) => service.serviceType).join(' · ')) : missing()}</td>
        <td>${site.incomplete ? '<span class="tag tag-yellow">unvollständig</span>' : '<span class="tag tag-green">vollständig</span>'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function refreshDirectory() {
    const q = (document.getElementById('masterDirSearch')?.value || '').trim().toLowerCase();
    const sites = A.getSites().filter((site) => !q || [site.nummer, site.name, site.kuerzel, site.region, ...(site.altNames || [])].join(' ').toLowerCase().includes(q)).sort((a, b) => a.nummer.localeCompare(b.nummer));
    const table = document.getElementById('masterDirTable');
    const count = document.getElementById('masterDirCount');
    if (table) table.innerHTML = directoryTable(sites);
    if (count) count.textContent = `${sites.length} ${sites.length === 1 ? 'Standort' : 'Standorte'}`;
  }

  /* ------------------------------------------------------------- Fields --- */
  function contactCard(site, key) {
    const userId = site[key];
    if (!userId) {
      return `<div class="contact-card">
        <div class="contact-role">${ROLE_LABELS[key]}</div>
        <div class="muted small">${missing()}</div>
      </div>`;
    }
    const user = A.userById(userId);
    const line = (iconName, value, href) => value ? `<div class="copy-line"><a href="${href}">${A.icon(iconName, 11)} ${A.esc(value)}</a><button class="icon-btn" data-act="copy" data-copy="${A.esc(value)}" title="Kopieren">${A.icon('copy', 11)}</button></div>` : '';
    return `<div class="contact-card">
      <div class="contact-role">${ROLE_LABELS[key]}</div>
      <div class="contact-person">
        <span class="avatar avatar-sm">${A.esc(user.initials)}</span>
        <div class="grow"><div class="contact-name">${A.esc(user.name)}</div><div class="contact-team">${A.esc(user.role)}</div></div>
      </div>
      <div class="contact-links">
        ${line('mail', user.email, `mailto:${A.esc(user.email)}`)}
        ${line('phone', user.phone, `tel:${A.esc(user.phone)}`)}
        ${line('mobile', user.mobile, `tel:${A.esc(user.mobile)}`)}
      </div>
    </div>`;
  }

  function renderReadFields(site) {
    const gps = hasGps(site);
    return `<dl class="master-kv">
      <dt>Adresse</dt><dd>${site.address ? `${A.esc(site.address)} <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}" target="_blank" rel="noopener" class="small">Karte ${A.icon('external', 10)}</a>` : missing()}</dd>
      <dt>Koordinaten</dt><dd>${gps ? `<span class="coords-line"><span class="mono">${A.esc(site.lat)}, ${A.esc(site.lon)}</span><button class="icon-btn" data-act="copy" data-copy="${site.lat}, ${site.lon}" title="Koordinaten kopieren">${A.icon('copy', 12)}</button></span>` : missing()}</dd>
      <dt>Alternative Bezeichnungen</dt><dd>${(site.altNames || []).length ? site.altNames.map((name) => `<span class="tag tag-neutral">${A.esc(name)}</span>`).join(' ') : missing()}</dd>
      <dt>Turmhöhe</dt><dd>${valueOr(site.towerHeight, (value) => `<span class="mono">${A.esc(value)} m</span>`)}</dd>
      <dt>Bauart</dt><dd>${valueOr(site.bauart)}</dd>
      <dt>Aufzug vorhanden</dt><dd>${site.elevator == null ? missing() : site.elevator ? '<span class="tag tag-green">Ja</span>' : '<span class="tag tag-neutral">Nein</span>'}</dd>
      <dt>Kürzel</dt><dd>${valueOr(site.kuerzel, (value) => `<span class="mono">${A.esc(value)}</span>`)}</dd>
      <dt>Region</dt><dd>${valueOr(site.region)}</dd>
    </dl>`;
  }

  function renderEditFields(site, draft) {
    const value = (key) => A.esc(draft[key] ?? site[key] ?? '');
    return `<div class="edit-grid">
      <div class="field span-2"><label for="editAddress">Adresse</label><input class="input" id="editAddress" data-master-field="address" value="${value('address')}" placeholder="Straße, PLZ Ort"></div>
      <div class="field span-2"><label for="editAlt">Alternative Bezeichnungen / Volksmund</label><input class="input" id="editAlt" data-master-field="altNames" value="${A.esc((draft.altNames ?? (site.altNames || [])).join(', '))}" placeholder="Komma-getrennt"><span class="field-help">Diese Begriffe werden in der globalen Suche gefunden.</span></div>
      <div class="field"><label for="editLat">Breitengrad</label><input class="input mono" id="editLat" data-master-field="lat" type="number" step="0.000001" value="${value('lat')}"></div>
      <div class="field"><label for="editLon">Längengrad</label><input class="input mono" id="editLon" data-master-field="lon" type="number" step="0.000001" value="${value('lon')}"></div>
      <div class="field"><label for="editTower">Turmhöhe (m)</label><input class="input mono" id="editTower" data-master-field="towerHeight" type="number" min="0" max="500" value="${value('towerHeight')}"></div>
      <div class="field"><label for="editBauart">Bauart</label><select class="select" id="editBauart" data-master-field="bauart">
        ${['Gittertragwerk', 'Stahlbeton', 'Stahlröhre'].map((option) => `<option ${site.bauart === option ? 'selected' : ''}>${option}</option>`).join('')}
      </select></div>
      <div class="field span-2"><label class="check"><input type="checkbox" data-master-field="elevator" ${site.elevator ? 'checked' : ''}> Aufzug vorhanden</label></div>
      <div class="field span-2"><label for="editApproach">Anfahrtsbeschreibung / Besonderheiten</label><textarea class="textarea" id="editApproach" data-master-field="approach">${value('approach')}</textarea></div>
    </div>
    <div class="settings-note">Dienste-Matrix und Standortpaten werden in Phase 3 über eigene Admin-Masken gepflegt. Änderungen an den Stammdaten werden im Audit-Log erfasst.</div>`;
  }

  /* ------------------------------------------------------------- Content -- */
  function trafficBox(site) {
    const home = A.getSite(A.getSetting('map.homeSite', '8000'));
    let line = '<div class="traffic-line"><span>Heimatstandort</span><span>Nicht gesetzt</span></div>';
    if (home && hasGps(site) && hasGps(home)) {
      const distance = haversine(home.lat, home.lon, site.lat, site.lon) * 1.25;
      const minutes = Math.round((distance / 65) * 60);
      line = `<div class="traffic-line"><span>Route ab ${A.esc(home.nummer)} ${A.esc(home.name)}</span><span class="mono">${distance.toFixed(0)} km · ca. ${minutes} min</span></div>`;
    }
    return `<div class="traffic-box">
      ${line}
      <div class="traffic-line"><span>Live-Verkehr</span><span class="tag tag-neutral">nicht angebunden</span></div>
      <div class="flex gap-8 wrap mt-8">
        ${hasGps(site) ? `<a class="btn btn-secondary btn-sm" href="https://www.openstreetmap.org/#map=14/${site.lat}/${site.lon}" target="_blank" rel="noopener">${A.icon('map', 13)} OSM öffnen</a>` : ''}
        ${hasGps(site) ? `<a class="btn btn-secondary btn-sm" href="https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${home && hasGps(home) ? `${home.lat},${home.lon};` : ''}${site.lat},${site.lon}" target="_blank" rel="noopener">${A.icon('route', 13)} OSRM-Route</a>` : ''}
      </div>
      <div class="small muted" style="margin-top:6px">Fahrtzeit ist eine Schätzung ohne Staulage. Echtzeit-Verkehr folgt in Phase 3.</div>
    </div>`;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function upcomingOutages(site) {
    const events = A.getOutages().filter((event) => event.siteId === site.nummer && event.status !== 'Abgeschlossen').sort((a, b) => a.start.localeCompare(b.start));
    if (!events.length) return '<div class="muted small">Keine bevorstehenden Abschaltungen.</div>';
    return events.slice(0, 4).map((event) => {
      const short = A.fmtShort(event.start).split(' ');
      return `<div class="outage-mini">
        <div class="date-box"><div class="d">${A.esc(short[0])}</div><div class="m">${A.esc(short.slice(1).join(' '))}</div></div>
        <div class="oc"><strong>${A.esc(event.title)}</strong><span>${A.esc(event.service)} · ${A.esc(event.reason)} · ${A.esc(A.fmtDateTime(event.start).slice(-5))}–${A.esc(A.fmtDateTime(event.end).slice(-5))}</span></div>
        <span class="tag ${event.status === 'Laufend' ? 'tag-yellow' : 'tag-neutral'}">${A.esc(event.status)}</span>
      </div>`;
    }).join('');
  }

  function auditEntries(site) {
    return state.audit.filter((entry) => entry.siteId === site.nummer);
  }

  function auditHtml(site) {
    const entries = auditEntries(site).slice(0, 6);
    if (!entries.length) return '<div class="muted small">Noch keine Änderungen im Prototyp protokolliert.</div>';
    return `<div class="audit-list">${entries.map((entry) => `
      <div class="audit-item">
        <strong>${A.esc(entry.userName)}</strong> · ${A.esc(entry.field || entry.action)}:
        ${entry.oldValue ? `<span class="mono">${A.esc(entry.oldValue)}</span> → ` : ''}<span class="mono">${A.esc(entry.newValue || entry.action)}</span>
        <div class="audit-meta">${A.esc(A.fmtDateTime(entry.at))} · ${A.esc(entry.action)}</div>
      </div>`).join('')}</div>`;
  }

  /* ------------------------------------------------------------- Edit ----- */
  function startEdit() {
    const site = A.getSite(state.siteId);
    if (!site || !canEdit(site)) {
      A.toast('Kein Schreibzugriff für diesen Standort.', 'error');
      return;
    }
    ui.master.edit = true;
    ui.master.draft = {
      address: site.address, altNames: site.altNames || [], lat: site.lat, lon: site.lon,
      towerHeight: site.towerHeight, bauart: site.bauart, elevator: site.elevator, approach: site.approach
    };
    A.render();
  }

  function cancelEdit() {
    ui.master.edit = false;
    ui.master.draft = null;
    A.render();
  }

  function saveEdit() {
    const site = A.getSite(state.siteId);
    if (!site || !canEdit(site)) { A.toast('Kein Schreibzugriff.', 'error'); return; }
    const get = (field) => document.querySelector(`[data-master-field="${field}"]`);
    const address = get('address')?.value.trim();
    const altRaw = get('altNames')?.value || '';
    const lat = Number(get('lat')?.value);
    const lon = Number(get('lon')?.value);
    const towerHeight = Number(get('towerHeight')?.value);
    const bauart = get('bauart')?.value;
    const elevator = !!get('elevator')?.checked;
    const approach = get('approach')?.value.trim();

    if (!address) { A.toast('Adresse ist ein Pflichtfeld.', 'error'); return; }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) { A.toast('Breitengrad ist ungültig.', 'error'); return; }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) { A.toast('Längengrad ist ungültig.', 'error'); return; }
    if (!Number.isFinite(towerHeight) || towerHeight <= 0 || towerHeight > 500) { A.toast('Turmhöhe muss zwischen 1 und 500 m liegen.', 'error'); return; }

    const previous = state.siteOverrides[site.nummer] || {};
    const changes = {
      address,
      altNames: altRaw.split(',').map((part) => part.trim()).filter(Boolean),
      lat, lon, towerHeight, bauart, elevator, approach
    };
    const labels = {
      address: 'Adresse', altNames: 'Alternative Bezeichnungen', lat: 'Breitengrad', lon: 'Längengrad',
      towerHeight: 'Turmhöhe', bauart: 'Bauart', elevator: 'Aufzug', approach: 'Anfahrtsbeschreibung'
    };
    let changed = 0;
    for (const [field, value] of Object.entries(changes)) {
      const oldValue = site[field];
      const oldComparable = Array.isArray(oldValue) ? oldValue.join(', ') : oldValue;
      const newComparable = Array.isArray(value) ? value.join(', ') : value;
      if (String(oldComparable ?? '') !== String(newComparable ?? '')) {
        changed += 1;
        A.logAudit({
          action: 'UPDATE', siteId: site.nummer, target: `${site.nummer} ${site.kuerzel || ''}`,
          field: labels[field] || field, oldValue: oldComparable, newValue: newComparable
        });
      }
    }
    state.siteOverrides[site.nummer] = { ...previous, ...changes };
    A.save();
    ui.master.edit = false;
    ui.master.draft = null;
    A.render();
    A.toast(changed ? `${changed} Feld${changed === 1 ? '' : 'er'} gespeichert. Audit-Log aktualisiert.` : 'Keine Änderungen.', changed ? 'success' : 'info');
  }

  /* ------------------------------------------------------------- Mount ---- */
  function mount() {
    if (miniMap) { miniMap.remove(); miniMap = null; }
    const container = document.getElementById('masterMiniMap');
    const site = A.getSite(state.siteId);
    if (!container) return;
    if (!site || !hasGps(site)) {
      container.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px"><span class="muted small">Für diesen Standort sind keine Koordinaten hinterlegt.</span></div>';
      return;
    }
    if (!window.L) {
      container.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px"><span class="mono small">${site.lat}, ${site.lon}</span><span class="muted small">Mini-Karte offline</span></div>`;
      return;
    }
    miniMap = L.map(container, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false }).setView([site.lat, site.lon], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(miniMap);
    L.marker([site.lat, site.lon], {
      icon: L.divIcon({ className: 'swr-marker', html: '<div class="marker-dot is-selected"></div>', iconSize: [16, 16], iconAnchor: [8, 8] })
    }).addTo(miniMap);
    setTimeout(() => miniMap?.invalidateSize(), 30);
  }

  function cleanup() {
    if (miniMap) { miniMap.remove(); miniMap = null; }
    if (dirTimer) { clearTimeout(dirTimer); dirTimer = null; }
  }

  function settings() {
    return `
      <div class="setting-block">
        <div class="setting-inline">
          <div><h4 style="margin:0">Wetter & Warnlage anzeigen</h4><p style="margin:2px 0 0">DWD-Widget in der Standortakte.</p></div>
          <label class="switch"><input type="checkbox" data-setting="master.showWeather" data-rerender="true" ${A.getSetting('master.showWeather', true) ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="setting-block">
        <div class="setting-inline">
          <div><h4 style="margin:0">Audit-Log anzeigen</h4><p style="margin:2px 0 0">Letzte Änderungen an diesem Standort.</p></div>
          <label class="switch"><input type="checkbox" data-setting="master.showAudit" data-rerender="true" ${A.getSetting('master.showAudit', true) ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="settings-note">Berechtigungen: Standortpaten werden aus der <span class="mono">sites</span>-Tabelle auf <span class="mono">users</span> aufgelöst. Der Admin-Modus ist eine zusätzliche Privilegien-Ebene im Benutzermenü.</div>`;
  }

  A.registerModule('master', { label: 'Stammdaten', icon: 'building', render, mount, cleanup, settings });
  A.registerAction('master-edit', startEdit);
  A.registerAction('master-cancel', cancelEdit);
  A.registerAction('master-save', saveEdit);

  A.onInput('#masterDirSearch', () => {
    clearTimeout(dirTimer);
    dirTimer = setTimeout(refreshDirectory, 120);
  });
})();
