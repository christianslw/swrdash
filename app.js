/* ==========================================================================
   SWR Senderinfrastruktur · Prototyp
   App-Shell, globaler Standortkontext, Demo-RBAC, Einstellungen, Utilities
   ========================================================================== */
(function () {
  'use strict';

  const D = window.SWR_DATA;
  const LS_KEY = 'swr.portal.prototype.v1';
  const clone = (value) => JSON.parse(JSON.stringify(value));

  /* ------------------------------------------------------------- Icons --- */
  const ICONS = {
    map: '<path d="M2 4.2 6 2v10l-4 1.8V4.2Zm4-2.2 4 2v10l-4-2V2Zm4 2 4-2v10l-4 2V4Z"/>',
    building: '<path d="M3 14V2h7v4h3v8M3 14h10M5 4h3v2H5V4Zm0 4h3v2H5V8Zm0 4h3v2H5v-2Zm5-3h2v2h-2V9Zm0 4h2v2h-2v-2Z"/>',
    wrench: '<path d="M10.5 2a3.5 3.5 0 0 0-3.3 4.7L2 11.9V14h2.1l5.2-5.2A3.5 3.5 0 1 0 10.5 2Zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>',
    document: '<path d="M4 1h5l3 3v11H4V1Zm5 0v3h3M6 7h4M6 9h4M6 11h4"/>',
    image: '<path d="M2 3h12v10H2V3Zm0 7 3-3 3 3 2-2 4 4M5.5 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>',
    calendar: '<path d="M3 2v2m10-2v2M2 5h12v9H2V5Zm0 3h12M5 2v2h6V2M5 10h2m2 0h2"/>',
    settings: '<path d="M8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5Zm5.4 2.5.9 1.1-1.4 1.4-.1 1.3-1.1.9-1.3-.3-1.1.7-1.1-.7-1.3.3-1.1-.9-.1-1.3L2 8.6l.9-1.1.1-1.3 1.1-.9 1.3.3L6.5 5l1.1.7 1.3-.3 1.1.9.1 1.3.8.9Z"/>',
    user: '<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 6c0-2.5 2.7-4 6-4s6 1.5 6 4v1H2v-1Z"/>',
    search: '<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/>',
    close: '<path d="m3 3 10 10M13 3 3 13"/>',
    chevronDown: '<path d="m3 6 5 5 5-5"/>',
    chevronLeft: '<path d="m10 3-5 5 5 5"/>',
    chevronRight: '<path d="m6 3 5 5-5 5"/>',
    plus: '<path d="M8 2v12M2 8h12"/>',
    check: '<path d="m2 8 4 4 8-8"/>',
    alert: '<path d="M8 1 15 14H1L8 1Zm0 4v5m0 2v1"/>',
    external: '<path d="M9 2h5v5M14 2 7 9M6 3H2v11h11V9"/>',
    copy: '<path d="M5 4V2h9v9h-2M2 5h9v9H2V5Z"/>',
    route: '<path d="M3 13c0-3 3-3 3-6a3 3 0 1 1 6 0c0 2-2 3-2 6M10.5 13H13"/>',
    download: '<path d="M8 2v8m-3-3 3 3 3-3M2 12v2h12v-2"/>',
    lock: '<path d="M4 7V5a4 4 0 0 1 8 0v2M3 7h10v7H3V7Zm5 3v2"/>',
    history: '<path d="M2 8a6 6 0 1 0 2-4.5M2 2v4h4M8 4v4l3 2"/>',
    upload: '<path d="M8 11V2M5 5l3-3 3 3M2 11v3h12v-3"/>',
    cloud: '<path d="M4.5 12h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 3.5 7.5 2.3 2.3 0 0 0 4.5 12Z"/>',
    folder: '<path d="M1 4h5l1.5 2H15v8H1V4Zm0 2h14"/>',
    book: '<path d="M2 2h5a2 2 0 0 1 2 2v10a2 2 0 0 0-2-2H2V2Zm13 0H10a2 2 0 0 0-2 2v10a2 2 0 0 1 2-2h5V2Z"/>',
    phone: '<path d="M3 2h3l1 3-2 1a8 8 0 0 0 5 5l1-2 3 1v3c0 1-1 2-2 2A13 13 0 0 1 1 4c0-1 1-2 2-2Z"/>',
    mail: '<path d="M1 3h14v10H1V3Zm0 1 7 5 7-5"/>',
    mobile: '<rect x="4" y="1" width="8" height="14" rx="1"/><path d="M7 12h2"/>',
    pin: '<path d="M8 15s5-5 5-9a5 5 0 1 0-10 0c0 4 5 9 5 9Zm0-7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    list: '<path d="M5 3h10M5 8h10M5 13h10M2 3h.01M2 8h.01M2 13h.01"/>',
    grid: '<path d="M2 2h5v5H2V2Zm7 0h5v5H9V2ZM2 9h5v5H2V9Zm7 0h5v5H9V9Z"/>',
    trash: '<path d="M3 4h10M6 4V2h4v2m-6 0 1 10h6l1-10M7 7v4m2-4v4"/>',
    edit: '<path d="m11 2 3 3-9 9H2v-3l9-9ZM9 4l3 3"/>',
    info: '<circle cx="8" cy="8" r="6.5"/><path d="M8 7v5M8 4.5v.5"/>',
    filter: '<path d="M2 3h12L9.5 8.5V13l-3 1.5V8.5L2 3Z"/>',
    refresh: '<path d="M14 8a6 6 0 1 1-2-4.5M14 2v4h-4"/>',
    layers: '<path d="m8 2 6 3-6 3-6-3 6-3Zm-6 6 6 3 6-3M2 11l6 3 6-3"/>',
    clock: '<circle cx="8" cy="8" r="6.5"/><path d="M8 4v4l3 2"/>',
    shield: '<path d="M8 1 14 3v5c0 4-3 6-6 7-3-1-6-3-6-7V3l6-2Zm-3 7 2 2 4-4"/>',
    sun: '<circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M3 13l1.5-1.5M11.5 4.5 13 3"/>',
    moon: '<path d="M13 10A6 6 0 0 1 6 3a6 6 0 1 0 7 7Z"/>',
    monitor: '<rect x="1" y="2" width="14" height="9" rx="1"/><path d="M5 14h6m-3-3v3"/>',
    arrowRight: '<path d="M2 8h11m-4-4 4 4-4 4"/>',
    play: '<path d="M4 2v12l10-6L4 2Z"/>',
    file: '<path d="M4 1h5l3 3v11H4V1Zm5 0v3h3M6 8h4M6 11h4"/>',
    spark: '<path d="m8 1 1.7 5.3L15 8l-5.3 1.7L8 15 6.3 9.7 1 8l5.3-1.7L8 1Z"/>',
    wlan: '<path d="M2 6a9 9 0 0 1 12 0M4 9a6 6 0 0 1 8 0M6.5 12a3 3 0 0 1 3 0M8 14.5v.5"/>'
  };

  function icon(name, size = 16) {
    const body = ICONS[name] || ICONS.info;
    return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /* ------------------------------------------------------------- Defaults - */
  const DEFAULT_SETTINGS = {
    map: { layer: 'osm', homeSite: '8000', showWeather: true },
    master: { showWeather: true, showAudit: true },
    maintenance: { defaultView: 'list', defaultGroup: 'due', autoSiteFilter: true },
    protocols: { historyDepth: 3, autoOverlay: false, device: 'GMC PROFITEST MF XTRA · SN 1849204' },
    images: {
      sharpness: 120, quality: 80, ocr: true,
      folder: '<Standortnr>_<Kuerzel>/<Jahr>/<Kategorie>/<Unterkategorie>'
    },
    outages: { defaultView: 'month', colorBy: 'service' }
  };

  const SEED_VIEWS = [
    { id: 'v-meine', name: 'Meine offenen Aufgaben', group: 'due', status: 'OPEN', onlyMine: true, q: '' },
    { id: 'v-faellig', name: 'Überfällig · Stuttgart', group: 'site', status: 'OVERDUE', onlyMine: false, q: 'Stuttgart' }
  ];

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
  })();

  const state = {
    module: saved.module || 'map',
    siteId: saved.siteId === undefined ? '8400' : saved.siteId,
    userId: saved.userId || 'u-salwa',
    adminMode: !!saved.adminMode,
    theme: saved.theme || 'auto',
    settings: deepMerge(clone(DEFAULT_SETTINGS), saved.settings || {}),
    siteOverrides: saved.siteOverrides || {},
    protocols: saved.protocols || clone(D.protocols),
    outages: saved.outages || clone(D.outages),
    audit: saved.audit || [],
    maintenanceDone: saved.maintenanceDone || {},
    maintenanceEdits: saved.maintenanceEdits || {},
    extraMaintenance: saved.extraMaintenance || [],
    views: saved.views || clone(SEED_VIEWS)
  };

  const ui = {
    searchResults: [],
    searchIndex: -1,
    images: [],
    imagesSelected: new Set(),
    imagesAllSites: false,
    map: {
      q: '', service: 'ALL', bauart: 'ALL', region: 'ALL', pate: 'ALL', onlyOutages: false,
      allSites: true, detailOpen: false, selectedId: null, tour: [], leaflet: null, miniMaps: []
    },
    maintenance: { allSites: !state.siteId, q: '', group: state.settings.maintenance.defaultGroup, status: 'ALL', onlyMine: false, view: state.settings.maintenance.defaultView, month: new Date(), focusTask: null },
    protocols: { view: 'list', id: null, templateId: null, editor: null, overlay: false, filterStatus: 'ALL', q: '', allSites: false },
    outages: { view: state.settings.outages.defaultView, month: new Date(), service: 'ALL', reason: 'ALL', status: 'ALL', q: '' },
    master: { edit: false, draft: null, allSites: false }
  };

  const weatherCache = new Map();
  const modules = {};

  /* ------------------------------------------------------------- Helpers -- */
  function deepMerge(target, source) {
    for (const [key, value] of Object.entries(source || {})) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        target[key] = deepMerge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
      } else {
        target[key] = value;
      }
    }
    return target;
  }

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(value, opts = {}) {
    if (!value) return '–';
    const raw = String(value);
    const date = new Date(raw.length <= 10 ? raw + 'T00:00:00' : raw);
    if (Number.isNaN(date.getTime())) return esc(value);
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', ...opts }).format(date);
  }

  function fmtDateTime(value) {
    if (!value) return '–';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function fmtShort(value) {
    if (!value) return '–';
    const date = new Date(String(value).length <= 10 ? value + 'T00:00:00' : value);
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' }).format(date);
  }

  function isoDate(date = new Date()) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function daysUntil(value) {
    if (!value) return null;
    const target = new Date(String(value).slice(0, 10) + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  function serviceClass(service) {
    const s = String(service || '');
    if (s.includes('UKW') || s.includes('FM')) return 'svc-UKW';
    if (s.includes('DAB')) return 'svc-DAB';
    if (s.includes('DVB')) return 'svc-DVB';
    if (s.includes('Mobil')) return 'svc-Mobilfunk';
    if (s.includes('Richtfunk')) return 'svc-Richtfunk';
    if (s.includes('DBOS')) return 'svc-DBOS';
    if (s.includes('LoRa')) return 'svc-LoRaWAN';
    return '';
  }

  function eventStatus(event) {
    const now = new Date();
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (now < start) return 'Geplant';
    if (now > end) return 'Abgeschlossen';
    return 'Laufend';
  }

  function currentUser() {
    return D.users.find((u) => u.id === state.userId) || D.users[0];
  }

  function userById(id) {
    return D.users.find((u) => u.id === id) || { id, name: id, initials: '?', role: '', email: '', phone: '', mobile: '', team: '' };
  }

  function getSites() {
    return D.sites.map((site) => state.siteOverrides[site.nummer] ? { ...site, ...state.siteOverrides[site.nummer] } : site);
  }

  function getSite(id) {
    if (!id) return null;
    const base = D.sites.find((site) => site.nummer === String(id));
    if (!base) return null;
    return state.siteOverrides[base.nummer] ? { ...base, ...state.siteOverrides[base.nummer] } : base;
  }

  function isAdminMode() {
    return currentUser().roleKey === 'ADMIN' && state.adminMode;
  }

  function isPatron(site) {
    if (!site) return false;
    const user = currentUser();
    return [site.paten1, site.paten2, site.patenIfs].includes(user.id);
  }

  function canEditSite(site) {
    return isPatron(site) || isAdminMode();
  }

  function canManageOutages(site) {
    return isAdminMode() || isPatron(site);
  }

  function patronSites() {
    return getSites().filter((site) => isPatron(site));
  }

  function getSetting(path, fallback) {
    const value = String(path).split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), state.settings);
    return value === undefined ? fallback : value;
  }

  function setSetting(path, value) {
    const keys = String(path).split('.');
    let cursor = state.settings;
    for (let i = 0; i < keys.length - 1; i += 1) {
      if (typeof cursor[keys[i]] !== 'object' || cursor[keys[i]] === null) cursor[keys[i]] = {};
      cursor = cursor[keys[i]];
    }
    cursor[keys[keys.length - 1]] = value;
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        module: state.module, siteId: state.siteId, userId: state.userId,
        adminMode: state.adminMode, theme: state.theme, settings: state.settings,
        siteOverrides: state.siteOverrides, protocols: state.protocols,
        outages: state.outages, audit: state.audit.slice(0, 250),
        maintenanceDone: state.maintenanceDone, maintenanceEdits: state.maintenanceEdits,
        extraMaintenance: state.extraMaintenance, views: state.views
      }));
    } catch (error) {
      console.warn('Speichern fehlgeschlagen', error);
    }
  }

  function logAudit({ action, siteId = null, target = '', field = '', oldValue = '', newValue = '' }) {
    state.audit.unshift({
      id: 'A-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      at: new Date().toISOString(), userId: state.userId, userName: currentUser().name,
      action, siteId, target, field,
      oldValue: oldValue == null ? '' : String(oldValue),
      newValue: newValue == null ? '' : String(newValue)
    });
    state.audit = state.audit.slice(0, 250);
    save();
  }

  function getMaintenance() {
    const all = [...D.maintenance, ...state.extraMaintenance];
    return all.map((task) => {
      const done = state.maintenanceDone[task.id];
      const edit = state.maintenanceEdits[task.id];
      if (!done && !edit) return task;
      const merged = { ...task, ...(edit || {}) };
      if (done) {
        merged.status = done.status;
        merged.completedAt = done.completedAt || '';
      }
      return merged;
    });
  }

  function getOutages() {
    return state.outages.map((event) => ({ ...event, status: eventStatus(event) }));
  }

  function getProtocols() {
    return state.protocols;
  }

  function getTemplate(id) {
    return D.templates.find((template) => template.id === id) || null;
  }

  function getProtocol(id) {
    return state.protocols.find((protocol) => protocol.id === id) || null;
  }

  function historyFor(protocol, fieldKey, depth = 3) {
    if (!protocol) return [];
    return state.protocols
      .filter((entry) => entry.siteId === protocol.siteId && entry.templateId === protocol.templateId && entry.status === 'SUBMITTED' && entry.id !== protocol.id)
      .sort((a, b) => String(b.pruefdatum).localeCompare(String(a.pruefdatum)))
      .map((entry) => ({ protocol: entry, value: entry.data[fieldKey] }))
      .filter((entry) => entry.value !== undefined && entry.value !== '')
      .slice(0, depth);
  }

  function numeric(value) {
    if (value === null || value === undefined || value === '') return null;
    const cleaned = String(value).replace(/\s/g, '').replace(/[>≥<≤]/g, '').replace(',', '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function formatNumbers(value) {
    const n = numeric(value);
    if (n === null) return String(value ?? '–');
    return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(n);
  }

  function copyText(text) {
    const value = String(text ?? '');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => toast('In die Zwischenablage kopiert.', 'success')).catch(() => fallbackCopy(value));
    } else {
      fallbackCopy(value);
    }
  }

  function fallbackCopy(value) {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); toast('In die Zwischenablage kopiert.', 'success'); }
    catch { toast('Kopieren nicht möglich.', 'error'); }
    area.remove();
  }

  function download(filename, content, mime = 'application/octet-stream') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function buildICS(items, calendarName) {
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SWR//Senderinfrastruktur Prototyp//DE',
      'CALSCALE:GREGORIAN', `X-WR-CALNAME:${calendarName.replace(/[\r\n]/g, ' ')}`
    ];
    for (const item of items) {
      const start = item.allDay ? String(item.start).slice(0, 10).replace(/-/g, '') : new Date(item.start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      let end;
      if (item.allDay) {
        const date = new Date(String(item.end || item.start).slice(0, 10) + 'T00:00:00');
        date.setDate(date.getDate() + 1);
        end = isoDate(date).replace(/-/g, '');
      } else {
        end = new Date(item.end).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      }
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${item.uid || ('swr-' + Math.random().toString(36).slice(2) + '@prototype.local')}`);
      lines.push(item.allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`);
      lines.push(item.allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`);
      lines.push(`SUMMARY:${String(item.summary || '').replace(/[\r\n]/g, ' ').replace(/,/g, '\\,')}`);
      if (item.description) lines.push(`DESCRIPTION:${String(item.description).replace(/\r?\n/g, '\\n').replace(/,/g, '\\,')}`);
      if (item.location) lines.push(`LOCATION:${String(item.location).replace(/\r?\n/g, ' ').replace(/,/g, '\\,')}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function toast(message, kind = 'info') {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast is-${kind}`;
    const ico = kind === 'error' ? icon('alert') : kind === 'success' ? icon('check') : icon('info');
    el.innerHTML = `${ico}<div class="toast-copy">${esc(message)}</div><button aria-label="Schließen">${icon('close', 14)}</button>`;
    el.querySelector('button').addEventListener('click', () => el.remove());
    root.appendChild(el);
    setTimeout(() => el.remove(), 4800);
  }

  function emptyState(iconName, title, text, actionsHtml = '') {
    return `<div class="empty-state">
      <div class="empty-icon">${icon(iconName, 28)}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${actionsHtml ? `<div class="empty-actions">${actionsHtml}</div>` : ''}
    </div>`;
  }

  function serviceTag(service, extra = '') {
    return `<span class="tag service-tag ${serviceClass(service)}">${esc(service)}${extra ? ' · ' + esc(extra) : ''}</span>`;
  }

  /* ------------------------------------------------------------- Modal ---- */
  function openModal({ title, body, footer = '', size = '' }) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop" data-modal-backdrop>
      <section class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="modal-head">
          <h3>${esc(title)}</h3>
          <button class="icon-btn" data-act="close-modal" aria-label="Schließen">${icon('close')}</button>
        </header>
        <div class="modal-body">${body}</div>
        ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
      </section>
    </div>`;
    root.querySelector('[data-modal-backdrop]').addEventListener('mousedown', (event) => {
      if (event.target === event.currentTarget) closeModal();
    });
  }

  function closeModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }

  function openPanel(title, body, footer = '') {
    const root = document.getElementById('sidepanel-root');
    root.innerHTML = `<div class="scrim" data-panel-scrim></div>
      <aside class="sidepanel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="sidepanel-head">
          <h3>${esc(title)}</h3>
          <button class="icon-btn" data-act="close-panel" aria-label="Schließen">${icon('close')}</button>
        </header>
        <div class="sidepanel-body">${body}</div>
        <footer class="sidepanel-foot">${footer || 'Änderungen werden lokal im Prototyp gespeichert.'}</footer>
      </aside>`;
    root.querySelector('[data-panel-scrim]').addEventListener('click', closePanel);
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.classList.add('is-active');
  }

  function closePanel() {
    const root = document.getElementById('sidepanel-root');
    if (root) root.innerHTML = '';
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.classList.remove('is-active');
  }

  /* ------------------------------------------------------------- Theme ---- */
  let colorSchemeQuery = null;

  function applyTheme() {
    if (!colorSchemeQuery) colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const resolved = state.theme === 'auto' ? (colorSchemeQuery.matches ? 'dark' : 'light') : state.theme;
    document.documentElement.setAttribute('data-theme', resolved);
  }

  colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  colorSchemeQuery.addEventListener?.('change', () => {
    if (state.theme === 'auto') applyTheme();
  });

  /* ------------------------------------------------------------- Search --- */
  function searchSites(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const scored = [];
    for (const site of getSites()) {
      const num = site.nummer;
      const name = site.name.toLowerCase();
      const kuerzel = (site.kuerzel || '').toLowerCase();
      const alt = (site.altNames || []).join(' ').toLowerCase();
      const region = (site.region || '').toLowerCase();
      let score = 0;
      if (num === q) score = 100;
      else if (num.startsWith(q)) score = 80;
      else if (name.startsWith(q)) score = 70;
      else if (kuerzel && kuerzel === q) score = 68;
      else if (name.includes(q)) score = 50;
      else if (alt.includes(q)) score = 45;
      else if (kuerzel && kuerzel.includes(q)) score = 35;
      else if (region.includes(q)) score = 20;
      if (score) scored.push({ site, score });
    }
    return scored.sort((a, b) => b.score - a.score || a.site.nummer.localeCompare(b.site.nummer)).slice(0, 9).map((x) => x.site);
  }

  function bindSearch() {
    const input = document.getElementById('globalSearch');
    const dropdown = document.getElementById('globalSearchDropdown');
    const clear = document.getElementById('globalSearchClear');
    if (!input) return;

    const render = () => {
      const q = input.value;
      clear.classList.toggle('hidden', !q);
      ui.searchResults = searchSites(q);
      ui.searchIndex = -1;
      if (!q.trim()) { dropdown.classList.add('hidden'); dropdown.innerHTML = ''; return; }
      if (!ui.searchResults.length) {
        dropdown.innerHTML = `<div class="search-empty">Kein Standort zu „${esc(q)}“ gefunden.</div>`;
        dropdown.classList.remove('hidden');
        return;
      }
      dropdown.innerHTML = ui.searchResults.map((site, index) => `
        <button class="search-result" data-act="pick-search" data-site="${esc(site.nummer)}" data-index="${index}">
          <span class="sr-num">${esc(site.nummer)}</span>
          <span class="sr-name">${esc(site.name)}${site.altNames?.length ? `<span class="sr-meta"> · ${esc(site.altNames[0])}</span>` : ''}${site.incomplete ? ' <span class="tag tag-yellow" style="height:16px">unvollständig</span>' : ''}</span>
          <span class="sr-meta">${esc(site.region)}</span>
        </button>`).join('') + `<div class="search-hint">${ui.searchResults.length} Treffer · ↑↓ navigieren · Enter öffnen</div>`;
      dropdown.classList.remove('hidden');
    };

    input.addEventListener('input', render);
    input.addEventListener('focus', () => { if (input.value.trim()) render(); });
    input.addEventListener('keydown', (event) => {
      const items = dropdown.querySelectorAll('.search-result');
      if (event.key === 'Escape') { dropdown.classList.add('hidden'); input.blur(); return; }
      if (!items.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        ui.searchIndex = (ui.searchIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((item, index) => item.classList.toggle('is-focused', index === ui.searchIndex));
        items[ui.searchIndex].scrollIntoView({ block: 'nearest' });
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const target = ui.searchResults[ui.searchIndex >= 0 ? ui.searchIndex : 0];
        if (target) pickSearch(target.nummer);
      }
    });
    clear.addEventListener('click', () => {
      input.value = '';
      clear.classList.add('hidden');
      dropdown.classList.add('hidden');
      input.focus();
    });
  }

  function pickSearch(siteId) {
    const dropdown = document.getElementById('globalSearchDropdown');
    const input = document.getElementById('globalSearch');
    if (dropdown) dropdown.classList.add('hidden');
    if (input) { input.value = ''; }
    document.getElementById('globalSearchClear')?.classList.add('hidden');
    setSite(siteId);
  }

  /* ------------------------------------------------------------- Weather -- */
  const WEATHER_ICON_PATHS = {
    'clear-day': '<circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M3 13l1.5-1.5M11.5 4.5 13 3"/>',
    'clear-night': '<path d="M13 10A6 6 0 0 1 6 3a6 6 0 1 0 7 7Z"/>',
    'partly-cloudy-day': '<circle cx="5" cy="5" r="2"/><path d="M5 1v2M1 5h2M2.2 2.2l1.4 1.4"/><path d="M5 12h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 4 7.5 2.3 2.3 0 0 0 5 12Z"/>',
    'partly-cloudy-night': '<path d="M9 6A4 4 0 0 1 6 3a4 4 0 1 0 4 4Z"/><path d="M5 12h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 4 7.5 2.3 2.3 0 0 0 5 12Z"/>',
    cloudy: '<path d="M4.5 12h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 3.5 7.5 2.3 2.3 0 0 0 4.5 12Z"/>',
    fog: '<path d="M2 5h12M1 8h14M3 11h10M1 14h12"/>',
    wind: '<path d="M1 6h8a2 2 0 1 0-2-2M1 9h11a2 2 0 1 1-2 2M1 12h6"/>',
    rain: '<path d="M4.5 10h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 3.5 5.5 2.3 2.3 0 0 0 4.5 10Z"/><path d="M5 12v2M8 12v2M11 12v2"/>',
    sleet: '<path d="M4.5 10h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 3.5 5.5 2.3 2.3 0 0 0 4.5 10Z"/><path d="M5 13v2M4 14h2M8 13v2M7 14h2M11 13v2M10 14h2"/>',
    snow: '<path d="M4.5 10h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 3.5 5.5 2.3 2.3 0 0 0 4.5 10Z"/><path d="M5 13v2M4 14h2M8 13v2M7 14h2M11 13v2M10 14h2"/>',
    hail: '<path d="M4.5 10h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 3.5 5.5 2.3 2.3 0 0 0 4.5 10Z"/><circle cx="5" cy="14" r="1"/><circle cx="8" cy="14" r="1"/><circle cx="11" cy="14" r="1"/>',
    thunderstorm: '<path d="M4.5 10h7a3 3 0 0 0 .4-6A4.5 4.5 0 0 0 3.5 5.5 2.3 2.3 0 0 0 4.5 10Z"/><path d="M8 11 6 14h3l-1 2"/>',
    dry: '<circle cx="8" cy="8" r="3"/><path d="M8 2v1M8 13v1M2 8h1M13 8h1"/>',
    'dry-day': '<circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M3 13l1.5-1.5M11.5 4.5 13 3"/>',
    'dry-night': '<path d="M13 10A6 6 0 0 1 6 3a6 6 0 1 0 7 7Z"/>'
  };

  function weatherIcon(name) {
    const paths = WEATHER_ICON_PATHS[name] || WEATHER_ICON_PATHS.dry;
    return `<svg width="30" height="30" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  }

  async function fetchWeather(site) {
    if (!site || site.lat == null || site.lon == null) return { unavailable: true };
    const key = `${site.nummer}`;
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.data;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const today = new Date();
    const end = new Date(today); end.setDate(end.getDate() + 2);
    const base = 'https://api.brightsky.dev';
    try {
      const [currentRes, alertRes, forecastRes] = await Promise.all([
        fetch(`${base}/current_weather?lat=${site.lat}&lon=${site.lon}`, { signal: controller.signal }),
        fetch(`${base}/alerts?lat=${site.lat}&lon=${site.lon}`, { signal: controller.signal }),
        fetch(`${base}/weather?lat=${site.lat}&lon=${site.lon}&date=${isoDate(today)}&last_date=${isoDate(end)}`, { signal: controller.signal })
      ]);
      if (!currentRes.ok) throw new Error('Wetterdaten nicht erreichbar');
      const current = await currentRes.json();
      const alerts = alertRes.ok ? await alertRes.json() : { alerts: [] };
      const forecastRaw = forecastRes.ok ? await forecastRes.json() : { weather: [] };
      const w = current.weather || {};
      const forecast = [];
      const byDate = new Map();
      for (const entry of forecastRaw.weather || []) {
        const day = String(entry.timestamp || '').slice(0, 10);
        if (!day) continue;
        if (!byDate.has(day)) byDate.set(day, []);
        byDate.get(day).push(entry);
      }
      for (const [day, entries] of byDate) {
        const noon = entries.find((entry) => String(entry.timestamp).includes('T12:00')) || entries[Math.floor(entries.length / 2)];
        const temps = entries.map((entry) => entry.temperature).filter((t) => typeof t === 'number');
        forecast.push({
          date: day, icon: noon?.icon, temp: noon?.temperature,
          min: temps.length ? Math.min(...temps) : null, max: temps.length ? Math.max(...temps) : null
        });
      }
      const data = {
        temp: w.temperature, icon: w.icon, condition: w.condition,
        wind: w.wind_speed_30 ?? w.wind_speed_10,
        precip: w.precipitation_10, humidity: w.relative_humidity,
        alerts: alerts.alerts || [], forecast, demo: false, at: Date.now()
      };
      weatherCache.set(key, { at: Date.now(), data });
      return data;
    } catch (error) {
      const hour = new Date().getHours();
      const demo = {
        temp: 8 + ((new Date().getDate() + (site.lat || 0)) % 5),
        icon: hour > 7 && hour < 18 ? 'partly-cloudy-day' : 'cloudy',
        condition: 'Teilweise bewölkt', wind: 14 + (site.nummer % 12), precip: 0.0, humidity: 74,
        alerts: [], demo: true,
        forecast: [0, 1, 2].map((offset) => {
          const date = new Date(); date.setDate(date.getDate() + offset);
          return { date: isoDate(date), icon: ['partly-cloudy-day', 'cloudy', 'rain'][offset], temp: 9 - offset, min: 4 - offset, max: 11 - offset };
        })
      };
      weatherCache.set(key, { at: Date.now() - 9 * 60 * 1000, data: demo });
      return demo;
    } finally {
      clearTimeout(timer);
    }
  }

  function weatherHTML(data, compact = false) {
    if (!data || data.unavailable) return '<div class="muted small">Keine Wetterdaten (Standort ohne Koordinaten).</div>';
    const alert = (data.alerts || []).slice().sort((a, b) => rankSeverity(b.severity) - rankSeverity(a.severity))[0];
    return `
      <div class="weather-current">
        <div class="weather-icon">${weatherIcon(data.icon)}</div>
        <div>
          <div class="weather-temp">${data.temp == null ? '–' : Math.round(data.temp)} °C</div>
          <div class="weather-meta">${esc(data.condition || 'Wetter')} · Wind ${data.wind == null ? '–' : Math.round(data.wind)} km/h · ${data.precip ?? 0} mm</div>
        </div>
      </div>
      ${alert ? `<div class="warning-box ${rankSeverity(alert.severity) >= 3 ? 'is-error' : ''}"><strong>DWD-Warnung:</strong> ${esc(alert.event_de || alert.headline_de || 'Wetterwarnung')} <span class="muted">(${esc(alert.severity || '')})</span></div>` : '<div class="small muted">Keine amtlichen DWD-Warnungen.</div>'}
      ${compact ? '' : `<div class="mini-forecast">${(data.forecast || []).slice(0, 3).map((day) => `
        <div class="forecast-day">
          <div class="d">${new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(new Date(day.date + 'T12:00:00'))}</div>
          <div class="i">${weatherIcon(day.icon)}</div>
          <div class="t">${day.max == null ? '–' : Math.round(day.max)}° / ${day.min == null ? '–' : Math.round(day.min)}°</div>
        </div>`).join('')}</div>`}
      <div class="weather-meta" style="margin-top:8px">${data.demo ? 'Demo-Wetterdaten (offline)' : 'Quelle: DWD / Bright Sky'} · Stand ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>`;
  }

  function rankSeverity(severity) {
    return ({ minor: 1, moderate: 2, severe: 3, extreme: 4 })[String(severity || '').toLowerCase()] || 0;
  }

  function loadWeatherWidgets() {
    const nodes = document.querySelectorAll('[data-weather]');
    for (const node of nodes) {
      if (node.dataset.weatherState === 'loading' || node.dataset.weatherState === 'done') continue;
      const site = getSite(node.dataset.weather);
      if (!site) continue;
      node.dataset.weatherState = 'loading';
      fetchWeather(site).then((data) => {
        if (!document.body.contains(node)) return;
        node.innerHTML = weatherHTML(data, node.dataset.weatherCompact === '1');
        node.dataset.weatherState = 'done';
      });
    }
  }

  /* ------------------------------------------------------------- User menu */
  function closeUserMenu() {
    document.getElementById('userPopover')?.remove();
    document.getElementById('userBtn')?.classList.remove('is-active');
  }

  function toggleUserMenu() {
    if (document.getElementById('userPopover')) { closeUserMenu(); return; }
    const user = currentUser();
    const sites = patronSites();
    const menu = document.createElement('div');
    menu.className = 'popover';
    menu.id = 'userPopover';
    const isAdmin = user.roleKey === 'ADMIN';
    menu.innerHTML = `
      <div class="popover-head">
        <span class="avatar avatar-lg">${esc(user.initials)}</span>
        <div class="grow">
          <div class="name">${esc(user.name)}</div>
          <div class="role">${esc(user.role)}${sites.length ? ` · ${sites.length} Standort${sites.length === 1 ? '' : 'e'} als Pate` : ''}</div>
        </div>
        <button class="icon-btn" data-act="close-user-menu" aria-label="Schließen">${icon('close')}</button>
      </div>
      <div class="menu-section">
        <div class="menu-label">Darstellung</div>
        <div class="theme-segment">
          <button data-act="set-theme" data-theme-choice="light" class="${state.theme === 'light' ? 'is-active' : ''}">Hell</button>
          <button data-act="set-theme" data-theme-choice="dark" class="${state.theme === 'dark' ? 'is-active' : ''}">Dunkel</button>
          <button data-act="set-theme" data-theme-choice="auto" class="${state.theme === 'auto' ? 'is-active' : ''}">System</button>
        </div>
      </div>
      <div class="menu-section">
        <div class="menu-label">Berechtigungen</div>
        <div class="admin-row">
          <div class="copy">Admin-Modus aktivieren<small>${isAdmin ? 'Privilege Elevation · alle Standorte editierbar' : 'Nur für Benutzer mit Admin-Rolle'}</small></div>
          <label class="switch" title="${isAdmin ? 'Admin-Modus umschalten' : 'Keine Admin-Rolle'}">
            <input type="checkbox" data-admin-toggle ${state.adminMode ? 'checked' : ''} ${isAdmin ? '' : 'disabled'}>
            <span></span>
          </label>
        </div>
        ${isAdmin && state.adminMode ? `<div class="menu-note" style="color:var(--support-warning)">Admin-Modus ist aktiv. Änderungen an allen Standorten werden im Audit-Log protokolliert.</div>` : ''}
      </div>
      <div class="menu-section">
        <div class="menu-label">Demo · Benutzer wechseln</div>
        ${D.users.map((entry) => `
          <button class="menu-item" data-act="set-user" data-user="${esc(entry.id)}">
            <span class="avatar avatar-sm">${esc(entry.initials)}</span>
            <span>${esc(entry.name)} <span class="muted small">· ${esc(entry.role)}</span></span>
            ${entry.id === user.id ? `<span class="menu-check">${icon('check', 14)}</span>` : ''}
          </button>`).join('')}
        <div class="menu-note">Rollenwechsel dient nur der Demo. In Produktion übernimmt Entra ID die Identität und Rollen.</div>
      </div>
      <div class="menu-section">
        <button class="menu-item" data-act="open-account">${icon('user')} Konto & Anmeldung</button>
        <button class="menu-item" data-act="open-about">${icon('info')} Über den Prototyp</button>
        <button class="menu-item" data-act="logout-demo">${icon('arrowRight')} Abmelden (Demo)</button>
      </div>`;
    document.body.appendChild(menu);
    document.getElementById('userBtn')?.classList.add('is-active');
  }

  function setTheme(theme) {
    state.theme = theme;
    applyTheme();
    save();
    closeUserMenu();
    toast(`Design: ${theme === 'light' ? 'Hell' : theme === 'dark' ? 'Dunkel (OLED)' : 'System'}`, 'success');
  }

  function switchUser(userId) {
    if (!D.users.some((u) => u.id === userId)) return;
    state.userId = userId;
    state.adminMode = false;
    ui.master.edit = false;
    ui.master.draft = null;
    save();
    closeUserMenu();
    toast(`Testbenutzer: ${currentUser().name} · ${currentUser().role}`, 'info');
    renderModule();
    updateShell();
  }

  function toggleAdminMode(checked) {
    if (currentUser().roleKey !== 'ADMIN') return;
    state.adminMode = !!checked;
    logAudit({ action: state.adminMode ? 'ADMIN_MODE_ON' : 'ADMIN_MODE_OFF', target: 'Benutzerkonto', field: 'admin_mode', oldValue: !checked, newValue: !!checked });
    save();
    closeUserMenu();
    toast(state.adminMode ? 'Admin-Modus aktiviert. Alle Standorte sind editierbar.' : 'Admin-Modus deaktiviert.', state.adminMode ? 'warning' : 'info');
    renderModule();
    updateShell();
  }

  function openAbout() {
    closeUserMenu();
    openModal({
      title: 'Über den Prototyp',
      body: `<div class="flex between center mb-16">
          <div><strong style="font-size:18px">SWR Senderinfrastruktur</strong><div class="small muted">Unified Enterprise Portal · Prototyp v0.3.0</div></div>
          <span class="tag tag-yellow">Demo-Daten</span>
        </div>
        <p class="small" style="line-height:1.6">Dieser Prototyp validiert App-Shell, Menüs, Layouts, Rollen und zentrale Workflows, bevor die Produktiv-Implementierung mit Datenbank und Entra ID beginnt. Er ist kein Produktivsystem.</p>
        <dl class="kv-list mt-16">
          <div class="kv-row"><dt>Standorte</dt><dd>${D.sites.length} (380 nach Deduplizierung des Altdatensatzes)</dd></div>
          <div class="kv-row"><dt>Wartungen</dt><dd>${D.maintenance.length} Demo-/Import-Aufgaben</dd></div>
          <div class="kv-row"><dt>Protokolle</dt><dd>${D.protocols.length} Seed-Protokolle, 3 Vorlagen</dd></div>
          <div class="kv-row"><dt>Abschaltungen</dt><dd>${D.outages.length} Seed-Ereignisse</dd></div>
          <div class="kv-row"><dt>Persistenz</dt><dd>localStorage · keine Serverdatenbank</dd></div>
          <div class="kv-row"><dt>Auth</dt><dd>Demo-Benutzerwechsel · Entra ID in Phase 1</dd></div>
        </dl>
        <div class="modal-callout"><strong>Nächste Schritte:</strong> PostgreSQL/PostGIS, Entra-OIDC, RBAC serverseitig, Immutability-Trigger, PDF-Ablage und echte Dateispeicherung. Details im Manifest.</div>
        <div class="quick-links mt-16">
          <a class="btn btn-secondary btn-sm" href="MANIFEST.md" target="_blank" rel="noopener">${icon('document')} Manifest öffnen</a>
          <a class="btn btn-secondary btn-sm" href="README.md" target="_blank" rel="noopener">${icon('file')} README öffnen</a>
        </div>`,
      footer: `<button class="btn btn-primary" data-act="close-modal">Schließen</button>`
    });
  }

  function openAccount() {    const user = currentUser();
    openModal({
      title: 'Konto & Anmeldung',
      body: `
        <div class="flex gap-12 center mb-16">
          <span class="avatar avatar-lg">${esc(user.initials)}</span>
          <div><strong>${esc(user.name)}</strong><div class="small muted">${esc(user.role)}</div></div>
        </div>
        <dl class="kv-list">
          <div class="kv-row"><dt>E-Mail</dt><dd><a href="mailto:${esc(user.email)}">${esc(user.email)}</a></dd></div>
          <div class="kv-row"><dt>Festnetz</dt><dd><a href="tel:${esc(user.phone)}">${esc(user.phone)}</a></dd></div>
          <div class="kv-row"><dt>Mobil</dt><dd>${user.mobile ? `<a href="tel:${esc(user.mobile)}">${esc(user.mobile)}</a>` : '–'}</dd></div>
          <div class="kv-row"><dt>Team</dt><dd>${esc(user.team)}</dd></div>
          <div class="kv-row"><dt>Rolle</dt><dd>${esc(user.roles.join(' · '))}</dd></div>
        </dl>
        <div class="modal-callout"><strong>Auth-Provider:</strong> Im Prototyp lokale Demo-Identität. Der Produktivpfad ist für Entra ID (OIDC) vorbereitet; Auth-Logik bleibt in der Business-Schicht identisch.</div>
        <div class="settings-note">Standortpatenschaften: ${patronSites().length ? patronSites().map((s) => `<span class="mono">${esc(s.nummer)}</span> ${esc(s.kuerzel)}`).join(' · ') : 'keine'}</div>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Schließen</button>`
    });
  }

  /* ------------------------------------------------------------- Settings - */
  function moduleSettingsHTML() {
    const mod = modules[state.module];
    if (mod?.settings) return mod.settings();
    return `<div class="module-settings-empty">${icon('settings', 24)}<p style="margin-top:8px">Für dieses Modul sind keine spezifischen Einstellungen hinterlegt.</p></div>`;
  }

  function openSettings() {
    closeUserMenu();
    const mod = modules[state.module];
    openPanel(
      `Einstellungen · ${mod?.label || 'Modul'}`,
      moduleSettingsHTML(),
      `Gilt für den aktuellen Prototyp-Nutzer · ${esc(currentUser().name)}`
    );
  }

  function rangeControl(path, value, min, max, step, unit) {
    return `<div class="range-row">
      <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-setting="${esc(path)}" data-rerender="true">
      <span class="range-value" data-range-value="${esc(path)}">${value}${unit || ''}</span>
    </div>`;
  }

  /* ------------------------------------------------------------- Shell ---- */
  const NAV = [
    { id: 'map', label: 'Standortkarte', icon: 'map' },
    { id: 'master', label: 'Stammdaten', icon: 'building' },
    { id: 'maintenance', label: 'Wartungen', icon: 'wrench' },
    { id: 'protocols', label: 'Protokolle', icon: 'document' },
    { id: 'images', label: 'Bildertool', icon: 'image' },
    { id: 'outages', label: 'Abschaltungen', icon: 'calendar' }
  ];

  function renderShell() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="app">
      <header class="topbar">
        <button class="topbar-brand" data-act="nav" data-module="map" title="Zur Standortkarte">
          <span class="brand-mark">SWR</span>
          <span class="brand-divider"></span>
          <span class="brand-name">Senderinfrastruktur<small>Unified Portal</small></span>
        </button>
        <div class="topbar-search">
          <span class="search-icon">${icon('search')}</span>
          <input id="globalSearch" type="text" placeholder="Standort, Nummer, Kürzel oder Volksmund …" autocomplete="off" aria-label="Globale Standortsuche">
          <button id="globalSearchClear" class="search-clear hidden" aria-label="Suche leeren">${icon('close', 14)}</button>
          <div id="globalSearchDropdown" class="search-dropdown hidden" role="listbox"></div>
        </div>
        <div class="topbar-context" id="topbarContext"></div>
        <div class="topbar-right">
          <button class="topbar-icon" id="settingsBtn" data-act="open-settings" title="Modul-Einstellungen" aria-label="Modul-Einstellungen">${icon('settings')}</button>
          <button class="topbar-user" id="userBtn" data-act="toggle-user-menu" aria-label="Benutzermenü">
            <span class="avatar" id="headerAvatar">CS</span>
            <span class="user-copy"><strong id="headerUserName">Christian Salwa</strong><span id="headerUserRole">Techniker · EFK</span></span>
            ${icon('chevronDown', 12)}
          </button>
        </div>
      </header>
      <div id="contextBannerHost" class="context-banner-host"></div>
      <div class="shell">
        <nav class="sidenav" aria-label="Hauptnavigation">
          <div class="nav-label">Module</div>
          ${NAV.map((item) => `<button class="nav-item" data-act="nav" data-module="${item.id}">
            ${icon(item.icon)}<span>${item.label}</span><span class="nav-count" data-count="${item.id}"></span>
          </button>`).join('')}
        </nav>
        <main class="workspace" id="workspace"></main>
      </div>
    </div>`;
    bindSearch();
    updateShell();
  }

  function updateShell() {
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.module === state.module);
    });
    const openTasks = getMaintenance().filter((task) => task.status !== 'DONE').length;
    const upcoming = getOutages().filter((event) => event.status !== 'Abgeschlossen').length;
    const counts = {
      map: getSites().filter((site) => site.lat != null && site.lon != null).length,
      master: '',
      maintenance: openTasks,
      protocols: state.protocols.filter((protocol) => protocol.status === 'DRAFT').length,
      images: ui.images.length || '',
      outages: upcoming
    };
    for (const [key, value] of Object.entries(counts)) {
      const node = document.querySelector(`[data-count="${key}"]`);
      if (node) node.textContent = value === '' ? '' : value;
    }
    const user = currentUser();
    const avatar = document.getElementById('headerAvatar');
    const name = document.getElementById('headerUserName');
    const role = document.getElementById('headerUserRole');
    if (avatar) avatar.textContent = user.initials;
    if (name) name.textContent = user.name;
    if (role) role.textContent = user.role;

    const context = document.getElementById('topbarContext');
    if (context) {
      context.innerHTML = isAdminMode()
        ? `<span class="admin-pill">${icon('shield', 12)} Admin-Modus</span>`
        : '';
    }
    updateContextBanner();
  }

  function isScopeAll(moduleId = state.module) {
    switch (moduleId) {
      case 'map': return ui.map.allSites !== false;
      case 'master': return !!ui.master.allSites;
      case 'maintenance': return !!ui.maintenance.allSites;
      case 'protocols': return !!ui.protocols.allSites;
      case 'images': return !!ui.imagesAllSites;
      case 'outages': return ui.outages.siteScope === 'all';
      default: return false;
    }
  }

  function setScopeAll(all) {
    const mod = modules[state.module];
    if (!mod) return;
    if (state.module === 'map') {
      ui.map.allSites = !!all;
      if (mod.setScope) mod.setScope(!!all);
      updateContextBanner();
      updateShell();
      return;
    }
    if (state.module === 'master') ui.master.allSites = !!all;
    if (state.module === 'maintenance') ui.maintenance.allSites = !!all;
    if (state.module === 'protocols') ui.protocols.allSites = !!all;
    if (state.module === 'images') ui.imagesAllSites = !!all;
    if (state.module === 'outages') ui.outages.siteScope = all ? 'all' : 'current';
    renderModule();
  }

  function renderContextBanner() {
    const site = getSite(state.siteId);
    if (!site) return '';
    const all = isScopeAll();
    return `<div class="context-banner" id="contextBanner">
      <div class="cb-site">
        <span class="cb-num mono">${esc(site.nummer)}</span>
        <span class="cb-kuerzel mono">${site.kuerzel ? esc(site.kuerzel) : '–'}</span>
        <span class="cb-name">${esc(site.name)}</span>
        <span class="cb-region">${esc(site.region || '')}</span>
        ${site.incomplete ? '<span class="tag tag-yellow">Stammdaten unvollständig</span>' : ''}
      </div>
      <div class="cb-links">
        ${site.folderLink ? `<a class="cb-link" href="${esc(site.folderLink)}" target="_blank" rel="noopener">${icon('folder', 14)} SharePoint Ordner</a>` : ''}
        ${site.link ? `<a class="cb-link" href="${esc(site.link)}" target="_blank" rel="noopener">${icon('book', 14)} Betriebstagebuch</a>` : ''}
      </div>
      <div class="scope-toggle" role="group" aria-label="Standortfilter">
        <button data-act="scope-site" aria-pressed="${!all}" class="${all ? '' : 'is-active'}">Nur Standort ${esc(site.nummer)}</button>
        <button data-act="scope-all" aria-pressed="${all}" class="${all ? 'is-active' : ''}">Alle Standorte</button>
      </div>
      <button class="cb-close" data-act="clear-site" title="Standortkontext löschen" aria-label="Standortkontext löschen">${icon('close', 14)}</button>
    </div>`;
  }

  function updateContextBanner() {
    const host = document.getElementById('contextBannerHost');
    if (!host) return;
    host.innerHTML = state.siteId ? renderContextBanner() : '';
  }

  function renderModule() {
    const mod = modules[state.module];
    if (!mod) return;
    if (mod.cleanup) mod.cleanup();
    const workspace = document.getElementById('workspace');
    if (!workspace) return;
    workspace.className = 'workspace' + (mod.flush ? ' flush' : '');
    const content = mod.render() || '';
    workspace.innerHTML = mod.flush ? content : `<div class="workspace-pad">${content}</div>`;
    window.scrollTo?.(0, 0);
    workspace.scrollTop = 0;
    if (mod.mount) mod.mount(workspace);
    if (mod.afterRender) mod.afterRender(workspace);
    updateShell();
    loadWeatherWidgets();
  }

  function navigate(moduleId, opts = {}) {
    if (!modules[moduleId]) return;
    if (opts.site) state.siteId = opts.site;
    if (state.module === 'master' && moduleId !== 'master') {
      ui.master.edit = false;
      ui.master.draft = null;
    }
    if (moduleId === 'maintenance' && state.siteId && moduleId !== state.module && getSetting('maintenance.autoSiteFilter', true)) ui.maintenance.allSites = false;
    if (moduleId === 'maintenance' && moduleId !== state.module) {
      ui.maintenance.view = getSetting('maintenance.defaultView', ui.maintenance.view);
      ui.maintenance.group = getSetting('maintenance.defaultGroup', ui.maintenance.group);
    }
    if (moduleId === 'outages' && moduleId !== state.module) {
      ui.outages.view = getSetting('outages.defaultView', ui.outages.view);
    }
    if (moduleId !== state.module) {
      const current = modules[state.module];
      if (current?.cleanup) current.cleanup();
      state.module = moduleId;
    }
    if (opts.reset && modules[moduleId]?.reset) modules[moduleId].reset();
    save();
    closePanel();
    closeUserMenu();
    document.getElementById('globalSearchDropdown')?.classList.add('hidden');
    renderModule();
    updateShell();
  }

  function setSite(siteId, opts = {}) {
    const site = getSite(siteId);
    if (!site) return;
    state.siteId = site.nummer;
    ui.master.edit = false;
    ui.master.draft = null;
    ui.master.allSites = false;
    ui.imagesAllSites = false;
    if (state.module === 'map') ui.map.detailOpen = true;
    if (ui.maintenance && getSetting('maintenance.autoSiteFilter', true)) ui.maintenance.allSites = false;
    if (ui.protocols) ui.protocols.allSites = false;
    save();
    updateShell();
    if (opts.render !== false) {
      renderModule();
    }
    if (!opts.silent) toast(`Standortkontext: ${site.nummer} · ${site.name}`, 'info');
  }

  function clearSite() {
    state.siteId = null;
    ui.master.edit = false;
    ui.master.draft = null;
    ui.map.detailOpen = false;
    save();
    updateShell();
    renderModule();
    toast('Standortkontext gelöscht.', 'info');
  }

  /* ------------------------------------------------------------- Actions -- */
  const actions = {
    nav: (el) => navigate(el.dataset.module, { site: el.dataset.site || undefined }),
    'set-site': (el) => setSite(el.dataset.site),
    'pick-search': (el) => pickSearch(el.dataset.site),
    'clear-site': () => clearSite(),
    'scope-site': () => setScopeAll(false),
    'scope-all': () => setScopeAll(true),
    'open-settings': () => openSettings(),
    'close-panel': () => closePanel(),
    'close-modal': () => closeModal(),
    'close-user-menu': () => closeUserMenu(),
    'toggle-user-menu': () => toggleUserMenu(),
    'set-theme': (el) => setTheme(el.dataset.themeChoice),
    'set-user': (el) => switchUser(el.dataset.user),
    'open-account': () => { closeUserMenu(); openAccount(); },
    'open-about': openAbout,
    'logout-demo': () => { closeUserMenu(); toast('Abmeldung ist im Prototyp deaktiviert. In Produktion übernimmt Entra ID den Logout.', 'info'); },
    copy: (el) => copyText(el.dataset.copy),
    'demo': (el) => toast(el.dataset.message || 'Diese Funktion ist im Prototyp noch nicht implementiert.', 'info')
  };

  function registerModule(id, module) {
    modules[id] = { id, ...module };
  }

  function registerAction(name, handler) {
    actions[name] = handler;
  }

  /* ------------------------------------------------------------- Events --- */
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-act]');
    if (target) {
      const handler = actions[target.dataset.act];
      if (handler) {
        event.preventDefault();
        handler(target, event);
      }
    }
    const menu = document.getElementById('userPopover');
    if (menu && !menu.contains(event.target) && !event.target.closest('[data-act="toggle-user-menu"]')) closeUserMenu();
    const dropdown = document.getElementById('globalSearchDropdown');
    if (dropdown && !event.target.closest('.topbar-search')) dropdown.classList.add('hidden');
  });

  document.addEventListener('change', (event) => {
    const el = event.target;
    if (el.matches('[data-admin-toggle]')) {
      toggleAdminMode(el.checked);
      return;
    }
    if (el.matches('[data-setting]')) {
      const value = el.type === 'checkbox' ? el.checked : (el.type === 'number' || el.type === 'range') ? Number(el.value) : el.value;
      setSetting(el.dataset.setting, value);
      save();
      const rangeValue = document.querySelector(`[data-range-value="${CSS.escape(el.dataset.setting)}"]`);
      if (rangeValue) rangeValue.textContent = `${value}${el.dataset.unit || ''}`;
      modules[state.module]?.onSettingChange?.(el.dataset.setting, value);
      return;
    }
    const handler = moduleChangeHandlers.find((entry) => el.matches(entry.selector));
    if (handler) handler.handler(el, event);
  });

  document.addEventListener('input', (event) => {
    const el = event.target;
    if (el.matches('[data-setting][type="range"]')) {
      const node = document.querySelector(`[data-range-value="${CSS.escape(el.dataset.setting)}"]`);
      if (node) node.textContent = `${el.value}${el.dataset.unit || ''}`;
    }
    const handler = moduleInputHandlers.find((entry) => el.matches(entry.selector));
    if (handler) handler.handler(el, event);
  });

  const moduleChangeHandlers = [];
  const moduleInputHandlers = [];

  function onChange(selector, handler) {
    moduleChangeHandlers.push({ selector, handler });
  }

  function onInput(selector, handler) {
    moduleInputHandlers.push({ selector, handler });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const modal = document.querySelector('.modal-backdrop');
      if (modal) { closeModal(); return; }
      const panel = document.querySelector('.sidepanel');
      if (panel) { closePanel(); return; }
    }
  });

  /* ------------------------------------------------------------- Start ---- */
  function start() {
    applyTheme();
    if (state.siteId !== null && !getSite(state.siteId)) state.siteId = '8400';
    if (!modules[state.module]) state.module = 'map';
    if (state.adminMode && currentUser().roleKey !== 'ADMIN') state.adminMode = false;
    renderShell();
    renderModule();
    save();
  }

  window.addEventListener('leaflet-ready', () => {
    if (window.L && state.module === 'map') renderModule();
  });

  window.App = {
    D, state, ui, modules,
    start, save, registerModule, registerAction, navigate, setSite, clearSite,
    render: renderModule, renderModule, updateShell, isScopeAll, setScopeAll,
    renderContextBanner, updateContextBanner,
    toast, openModal, closeModal, openPanel, closePanel, emptyState,
    esc, fmtDate, fmtDateTime, fmtShort, isoDate, daysUntil, numeric, formatNumbers,
    icon, currentUser, userById, getSites, getSite, patronSites,
    isAdminMode, isPatron, canEditSite, canManageOutages,
    getMaintenance, getOutages, getProtocols, getProtocol, getTemplate, historyFor,
    getSetting, setSetting, logAudit, serviceClass, serviceTag, eventStatus,
    buildICS, download, copyText, rangeControl,
    fetchWeather, loadWeatherWidgets, weatherHTML, weatherIcon,
    changeHandlers: moduleChangeHandlers, inputHandlers: moduleInputHandlers,
    onChange, onInput, clone, deepMerge
  };
})();
