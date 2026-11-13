/* ==========================================================================
   Modul: Abschaltungen
   Zentrale Netz-Sicht, Monats-/Wochen-/Timeline-Ansicht, Filter,
   Verknüpfung mit Wartungen und Standort-Stammdaten, Anlegen/Bearbeiten.
   ========================================================================== */
(function () {
  'use strict';
  const A = window.App;
  const D = A.D;
  const state = A.state;
  const ui = A.ui;

  ui.outages.week = ui.outages.week || new Date();
  ui.outages.day = ui.outages.day || new Date();
  ui.outages.siteScope = ui.outages.siteScope || 'all';

  const SERVICES = ['UKW/FM', 'DAB+', 'DVB-T2 HD', 'Mobilfunk', 'Richtfunk', 'DBOS', 'LoRaWAN'];
  const REASONS = ['Wartung', 'Umbau', 'Störung', 'Netzumschaltung'];
  const SERVICE_COLORS = {
    'UKW/FM': 'var(--svc-ukw)', 'DAB+': 'var(--svc-dab)', 'DVB-T2 HD': 'var(--svc-dvb)',
    Mobilfunk: 'var(--svc-mobil)', Richtfunk: 'var(--svc-richtfunk)', DBOS: 'var(--svc-dbos)', LoRaWAN: 'var(--svc-lora)'
  };
  const REASON_COLORS = {
    Wartung: 'var(--support-warning)', Umbau: 'var(--svc-dab)', 'Störung': 'var(--support-error)', Netzumschaltung: 'var(--svc-richtfunk)'
  };

  let searchTimer = null;

  function colorOf(event) {
    return A.getSetting('outages.colorBy', 'service') === 'reason'
      ? (REASON_COLORS[event.reason] || 'var(--border-strong)')
      : (SERVICE_COLORS[event.service] || 'var(--border-strong)');
  }

  function filtered() {
    let events = A.getOutages();
    if (ui.outages.siteScope === 'current' && state.siteId) events = events.filter((event) => event.siteId === state.siteId);
    if (ui.outages.service !== 'ALL') events = events.filter((event) => event.service === ui.outages.service);
    if (ui.outages.reason !== 'ALL') events = events.filter((event) => event.reason === ui.outages.reason);
    if (ui.outages.status !== 'ALL') events = events.filter((event) => event.status === ui.outages.status);
    const q = ui.outages.q.trim().toLowerCase();
    if (q) events = events.filter((event) => {
      const site = A.getSite(event.siteId);
      return [event.id, event.title, event.service, event.reason, event.description, event.impact, site?.name, site?.nummer, site?.kuerzel].join(' ').toLowerCase().includes(q);
    });
    return events.sort((a, b) => a.start.localeCompare(b.start));
  }

  function overlapping(events, dayStart, dayEnd) {
    return events.filter((event) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      return start < dayEnd && end > dayStart;
    });
  }

  function eventTime(event) {
    return `${A.fmtDateTime(event.start).slice(-5)}–${A.fmtDateTime(event.end).slice(-5)}`;
  }

  function eventChip(event, compact = false) {
    const site = A.getSite(event.siteId);
    return `<button class="cal-event" data-act="out-open" data-id="${A.esc(event.id)}" style="border-left-color:${colorOf(event)};${event.status === 'Abgeschlossen' ? 'opacity:.48' : ''}" title="${A.esc(event.title)} · ${A.esc(site?.name || '')}">
      ${compact ? `<span class="mono">${A.esc(site?.kuerzel || event.siteId)}</span> ` : `<span class="mono">${A.esc(site?.kuerzel || event.siteId)}</span> · `}${A.esc(event.title)}
    </button>`;
  }

  function render() {
    const events = filtered();
    return `<div class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow">Abschaltungen <span class="tag tag-neutral">Neu · Phase 4</span></div>
        <h1>Abschaltungs-Kalender</h1>
        <p class="page-sub">Zentrale Planung über das gesamte Sendernetz. Farbcodierung nach Dienst${A.getSetting('outages.colorBy') === 'reason' ? ' oder Grund' : ''}; Verknüpfung mit Wartungen und Stammdaten.</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-secondary btn-sm" data-act="out-export-ics">${A.icon('download')} ICS</button>
        <button class="btn btn-primary btn-sm" data-act="out-new" ${canCreateAny() ? '' : 'disabled title="Keine Berechtigung für eine Standort-Abschaltung"'}>${A.icon('plus')} Neue Abschaltung</button>
      </div>
    </div>
    <div class="toolbar">
      <div class="search-field">
        ${A.icon('search', 14)}
        <input id="outSearch" class="input input-sm" placeholder="Titel, Standort, Grund …" value="${A.esc(ui.outages.q)}" autocomplete="off">
      </div>
      <select class="select input-sm" data-out-filter="service"><option value="ALL">Alle Dienste</option>${SERVICES.map((svc) => `<option value="${A.esc(svc)}" ${ui.outages.service === svc ? 'selected' : ''}>${A.esc(svc)}</option>`).join('')}</select>
      <select class="select input-sm" data-out-filter="reason"><option value="ALL">Alle Gründe</option>${REASONS.map((reason) => `<option value="${A.esc(reason)}" ${ui.outages.reason === reason ? 'selected' : ''}>${A.esc(reason)}</option>`).join('')}</select>
      <select class="select input-sm" data-out-filter="status"><option value="ALL">Alle Status</option>${['Geplant', 'Laufend', 'Abgeschlossen'].map((status) => `<option ${ui.outages.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select>
      ${state.siteId ? `<select class="select input-sm" data-out-filter="siteScope"><option value="all" ${ui.outages.siteScope === 'all' ? 'selected' : ''}>Gesamtes Netz</option><option value="current" ${ui.outages.siteScope === 'current' ? 'selected' : ''}>Nur Standort ${A.esc(state.siteId)}</option></select>` : ''}
      <div class="toolbar-spacer"></div>
      <div class="view-switch">
        ${[['month', 'Monat'], ['week', 'Woche'], ['day', 'Tag'], ['timeline', 'Timeline']].map(([value, label]) => `<button data-act="out-view" data-view="${value}" class="${ui.outages.view === value ? 'is-active' : ''}">${label}</button>`).join('')}
      </div>
    </div>
    <div class="outage-layout">
      <div id="outResults">${renderResults(events)}</div>
      <aside class="outage-side" id="outSide">${renderSide(events)}</aside>
    </div>`;
  }

  function renderSide(events) {
    return `<div class="card card--plain">
      <div class="card-head"><div><div class="card-title">Legende</div><div class="card-sub">${A.getSetting('outages.colorBy') === 'reason' ? 'Farbcodierung nach Grund' : 'Farbcodierung nach Dienst'}</div></div></div>
      <div class="outage-legend">
        ${(A.getSetting('outages.colorBy') === 'reason' ? REASONS : SERVICES).map((key) => `<span class="legend-item"><span class="legend-swatch" style="background:${A.getSetting('outages.colorBy') === 'reason' ? REASON_COLORS[key] : SERVICE_COLORS[key]}"></span>${A.esc(key)}</span>`).join('')}
      </div>
    </div>
    <div class="card card--plain">
      <div class="card-head"><div><div class="card-title">Nächste Abschaltungen</div><div class="card-sub">Netzweite Vorschau</div></div><span class="tag tag-neutral">${events.filter((event) => event.status !== 'Abgeschlossen').length}</span></div>
      ${upcomingSide(events)}
    </div>
    <div class="card card--plain">
      <div class="card-head"><div><div class="card-title">Verknüpfung</div><div class="card-sub">Stammdaten & Wartungen</div></div></div>
      <p class="small muted" style="line-height:1.55">Jede Abschaltung erscheint automatisch im Stammdaten-Blatt des Standorts. Im Detail kann ein verknüpfter Wartungsauftrag geöffnet werden.</p>
    </div>`;
  }

  function upcomingSide(events) {
    const list = events.filter((event) => event.status !== 'Abgeschlossen').slice(0, 6);
    if (!list.length) return '<div class="muted small">Keine bevorstehenden Abschaltungen im Filter.</div>';
    return `<div class="outage-list">${list.map((event) => {
      const site = A.getSite(event.siteId);
      return `<button class="outage-item" data-act="out-open" data-id="${A.esc(event.id)}" style="border:0;background:transparent;text-align:left;width:100%;color:var(--text);padding:10px 0">
        <span class="outage-color" style="background:${colorOf(event)}"></span>
        <span class="oi-copy"><span class="oi-title">${A.esc(event.title)}</span><span class="oi-meta">${A.esc(site?.nummer || event.siteId)} ${A.esc(site?.kuerzel || '')} · ${A.esc(A.fmtShort(event.start))} · ${A.esc(event.service)}</span></span>
        <span class="tag ${event.status === 'Laufend' ? 'tag-yellow' : 'tag-blue'}">${A.esc(event.status)}</span>
      </button>`;
    }).join('')}</div>`;
  }

  function headerForView() {
    if (ui.outages.view === 'week') {
      const start = weekStart(ui.outages.week);
      const end = new Date(start); end.setDate(end.getDate() + 6);
      return `KW ${getWeek(start)} · ${A.fmtDate(start)} – ${A.fmtDate(end)}`;
    }
    if (ui.outages.view === 'day') {
      return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(ui.outages.day);
    }
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(ui.outages.month);
  }

  function renderResults(events) {
    const nav = `<div class="flex between center mb-16">
      <div class="flex gap-8 center">
        <button class="icon-btn" data-act="out-prev" title="Zurück">${A.icon('chevronLeft')}</button>
        <button class="btn btn-secondary btn-xs" data-act="out-today">Heute</button>
        <button class="icon-btn" data-act="out-next" title="Weiter">${A.icon('chevronRight')}</button>
        <strong style="margin-left:4px">${A.esc(headerForView())}</strong>
        <span class="tag tag-neutral">${events.length} Ereignisse</span>
      </div>
      <span class="muted small">${ui.outages.view === 'month' ? 'Monatsansicht' : ui.outages.view === 'week' ? 'Wochenansicht (vereinfacht)' : ui.outages.view === 'day' ? 'Tagesagenda' : '30-Tage-Timeline'}</span>
    </div>`;
    return nav + (ui.outages.view === 'month' ? renderMonth(events) : ui.outages.view === 'week' ? renderWeek(events) : ui.outages.view === 'day' ? renderDay(events) : renderTimeline(events));
  }

  function refreshResults() {
    const events = filtered();
    const el = document.getElementById('outResults');
    if (el) el.innerHTML = renderResults(events);
    const side = document.getElementById('outSide');
    if (side) side.innerHTML = renderSide(events);
  }

  function renderMonth(events) {
    const monthDate = ui.outages.month;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    const today = A.isoDate();
    const cells = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start); date.setDate(start.getDate() + i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      const dayEvents = overlapping(events, dayStart, dayEnd);
      cells.push({ date, dayEvents, outside: date.getMonth() !== month, key: A.isoDate(date) });
    }
    return `<div class="calendar">
      <div class="calendar-weekdays"><div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div></div>
      <div class="calendar-grid">${cells.map((cell) => `<div class="cal-day ${cell.outside ? 'is-outside' : ''} ${cell.key === today ? 'is-today' : ''}">
        <div class="cal-day-num"><span>${cell.date.getDate()}</span>${cell.dayEvents.length ? `<span>${cell.dayEvents.length}</span>` : ''}</div>
        ${cell.dayEvents.slice(0, 4).map((event) => eventChip(event)).join('')}
        ${cell.dayEvents.length > 4 ? `<button class="cal-more" data-act="out-day" data-date="${cell.key}">+${cell.dayEvents.length - 4} weitere</button>` : ''}
      </div>`).join('')}</div>
    </div>`;
  }

  function weekStart(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d;
  }

  function getWeek(date) {
    const target = new Date(date.valueOf());
    const dayNr = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }

  function renderWeek(events) {
    const start = weekStart(ui.outages.week);
    const today = A.isoDate();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      return { date, events: overlapping(events, dayStart, dayEnd), key: A.isoDate(date) };
    });
    return `<div class="week-grid">${days.map((day) => `<div class="week-col">
      <div class="week-col-head ${day.key === today ? 'is-today' : ''}" style="${day.key === today ? 'box-shadow:inset 0 0 0 2px var(--interactive)' : ''}">
        <strong>${new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(day.date)}</strong> ${A.fmtDate(day.date)}
      </div>
      <div class="week-col-body">${day.events.map((event) => `<button class="week-event" data-act="out-open" data-id="${A.esc(event.id)}" style="border-left-color:${colorOf(event)};width:100%;text-align:left;color:var(--text);${event.status === 'Abgeschlossen' ? 'opacity:.5' : ''}">
        <div class="mono">${A.esc(eventTime(event))}</div>
        <div><strong>${A.esc(A.getSite(event.siteId)?.kuerzel || event.siteId)}</strong> ${A.esc(event.service)}</div>
        <div>${A.esc(event.title)}</div>
      </button>`).join('') || '<span class="muted small">–</span>'}</div>
    </div>`).join('')}</div>`;
  }

  function renderDay(events) {
    const dayStart = new Date(ui.outages.day.getFullYear(), ui.outages.day.getMonth(), ui.outages.day.getDate());
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const dayEvents = overlapping(events, dayStart, dayEnd).sort((a, b) => a.start.localeCompare(b.start));
    if (!dayEvents.length) return A.emptyState('calendar', 'Keine Abschaltungen an diesem Tag', 'Wähle über die Pfeile einen anderen Tag oder wechsle die Ansicht.');
    return `<div class="card card--plain">
      <div class="card-head"><div><div class="card-title">Tagesagenda</div><div class="card-sub">${dayEvents.length} Ereignisse</div></div><span class="tag tag-neutral">${A.esc(A.fmtDate(dayStart))}</span></div>
      <div class="outage-list">${dayEvents.map((event) => {
        const site = A.getSite(event.siteId);
        return `<div class="outage-item">
          <span class="outage-color" style="background:${colorOf(event)}"></span>
          <div class="mono small" style="width:78px;flex:0 0 78px;color:var(--text-3)">${A.esc(eventTime(event))}</div>
          <div class="oi-copy">
            <div class="oi-title">${A.esc(event.title)}</div>
            <div class="oi-meta">${A.esc(site?.nummer)} ${A.esc(site?.name)} · ${A.esc(event.service)} · ${A.esc(event.reason)}</div>
            <div class="small muted" style="margin-top:4px">${A.esc(event.impact || '')}</div>
          </div>
          <span class="tag ${event.status === 'Laufend' ? 'tag-yellow' : event.status === 'Abgeschlossen' ? 'tag-neutral' : 'tag-blue'}">${A.esc(event.status)}</span>
          <button class="btn btn-xs btn-secondary" data-act="out-open" data-id="${A.esc(event.id)}">Öffnen</button>
        </div>`;
      }).join('')}</div>
    </div>`;
  }

  function renderTimeline(events) {
    const first = new Date(ui.outages.month.getFullYear(), ui.outages.month.getMonth(), 1);
    const days = 30;
    const rangeStart = new Date(first);
    const rangeEnd = new Date(first); rangeEnd.setDate(rangeStart.getDate() + days);
    const visible = events.filter((event) => new Date(event.start) < rangeEnd && new Date(event.end) > rangeStart);
    const bySite = new Map();
    for (const event of visible) {
      if (!bySite.has(event.siteId)) bySite.set(event.siteId, []);
      bySite.get(event.siteId).push(event);
    }
    const rows = [...bySite.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    const dayLabels = Array.from({ length: days }, (_, index) => {
      const date = new Date(rangeStart); date.setDate(date.getDate() + index);
      return `<div>${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}</div>`;
    }).join('');
    if (!rows.length) return A.emptyState('calendar', 'Keine Abschaltungen im Zeitraum', 'Für den gewählten Monat sind im aktuellen Filter keine Ereignisse vorhanden.');
    const now = new Date();
    const todayLeft = now >= rangeStart && now <= rangeEnd ? ((now - rangeStart) / (rangeEnd - rangeStart)) * 100 : null;
    return `<div class="timeline-wrap"><div class="timeline" style="--days:${days}">
      <div class="timeline-head"><div class="label">Standort</div><div class="timeline-days">${dayLabels}</div></div>
      ${rows.map(([siteId, siteEvents]) => {
        const site = A.getSite(siteId);
        return `<div class="timeline-row">
          <div class="label"><span class="mono">${A.esc(siteId)}</span> ${A.esc(site?.kuerzel || '')}<div class="muted small">${A.esc(site?.name || '')}</div></div>
          <div class="timeline-track">
            ${todayLeft !== null ? `<span class="timeline-today" style="left:${todayLeft}%"></span>` : ''}
            ${siteEvents.map((event) => {
              const start = Math.max(new Date(event.start), rangeStart);
              const end = Math.min(new Date(event.end), rangeEnd);
              const left = ((start - rangeStart) / (rangeEnd - rangeStart)) * 100;
              const width = Math.max(1.5, ((end - start) / (rangeEnd - rangeStart)) * 100);
              return `<button class="timeline-bar" data-act="out-open" data-id="${A.esc(event.id)}" style="left:${left}%;width:${width}%;border-left-color:${colorOf(event)};${event.status === 'Abgeschlossen' ? 'opacity:.5' : ''}" title="${A.esc(event.title)} · ${A.esc(A.fmtDateTime(event.start))}">${A.esc(event.service)} · ${A.esc(event.title)}</button>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    </div></div>`;
  }

  function openDetail(eventId) {
    const event = A.getOutages().find((entry) => entry.id === eventId);
    if (!event) return;
    const site = A.getSite(event.siteId);
    const task = event.maintenanceId ? A.getMaintenance().find((entry) => entry.id === event.maintenanceId) : null;
    const allowed = A.canManageOutages(site);
    A.openModal({
      title: event.title,
      body: `<div class="flex between center mb-16">
          <div><div class="small muted">${A.esc(event.id)}</div><div class="mono" style="font-size:18px">${A.esc(site?.nummer)} ${A.esc(site?.kuerzel)}</div><div class="small">${A.esc(site?.name)}</div></div>
          <span class="tag ${event.status === 'Laufend' ? 'tag-yellow' : event.status === 'Abgeschlossen' ? 'tag-neutral' : 'tag-blue'}">${A.esc(event.status)}</span>
        </div>
        <dl class="outage-detail-grid">
          <dt>Dienst</dt><dd>${A.serviceTag(event.service)}</dd>
          <dt>Grund</dt><dd>${A.esc(event.reason)}</dd>
          <dt>Zeitraum</dt><dd class="mono">${A.esc(A.fmtDateTime(event.start))} – ${A.esc(A.fmtDateTime(event.end))}</dd>
          <dt>Dauer</dt><dd>${durationLabel(event)}</dd>
          <dt>Auswirkung</dt><dd>${A.esc(event.impact || '–')}</dd>
          <dt>Beschreibung</dt><dd>${A.esc(event.description || '–')}</dd>
          <dt>Verknüpfte Wartung</dt><dd>${task ? `<span class="mono">${A.esc(task.id)}</span> · ${A.esc(task.task)}` : '–'}</dd>
        </dl>
        <div class="modal-callout">Diese Abschaltung erscheint automatisch im Stammdaten-Blatt von <span class="mono">${A.esc(event.siteId)}</span> unter „Bevorstehende Abschaltungen“.</div>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Schließen</button>
        ${site ? `<button class="btn btn-secondary" data-act="out-open-site" data-site="${A.esc(event.siteId)}">${A.icon('building')} Stammdaten</button>` : ''}
        ${task ? `<button class="btn btn-secondary" data-act="out-open-task" data-task="${A.esc(task.id)}" data-site="${A.esc(event.siteId)}">${A.icon('wrench')} Wartung</button>` : ''}
        ${allowed ? `<button class="btn btn-danger" data-act="out-delete" data-id="${A.esc(event.id)}">${A.icon('trash')} Löschen</button><button class="btn btn-primary" data-act="out-edit" data-id="${A.esc(event.id)}">${A.icon('edit')} Bearbeiten</button>` : ''}`
    });
  }

  function durationLabel(event) {
    const ms = new Date(event.end) - new Date(event.start);
    if (!Number.isFinite(ms) || ms <= 0) return '–';
    const hours = ms / 3600000;
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} h`;
  }

  function canCreateAny() {
    return A.isAdminMode() || A.patronSites().length > 0;
  }

  function allowedSites() {
    return A.isAdminMode() ? A.getSites() : A.patronSites();
  }

  function toInput(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function openForm(eventId = null) {
    const existing = eventId ? A.getOutages().find((entry) => entry.id === eventId) : null;
    const allowed = allowedSites();
    if (!allowed.length) { A.toast('Keine Berechtigung zum Anlegen von Abschaltungen.', 'error'); return; }
    if (existing && !A.canManageOutages(A.getSite(existing.siteId))) { A.toast('Keine Berechtigung für diesen Standort.', 'error'); return; }
    const defaultSite = state.siteId && allowed.some((site) => site.nummer === state.siteId) ? state.siteId : allowed[0].nummer;
    const start = existing?.start || A.isoDate() + 'T08:00';
    const end = existing?.end || A.isoDate() + 'T12:00';
    const siteId = existing?.siteId || defaultSite;
    const tasks = A.getMaintenance().filter((task) => task.siteId === siteId);
    A.openModal({
      title: existing ? 'Abschaltung bearbeiten' : 'Neue Abschaltung anlegen',
      size: 'modal-wide',
      body: `<div class="form-grid">
        <div class="field span-2"><label for="outTitle">Titel</label><input class="input" id="outTitle" value="${A.esc(existing?.title || '')}" placeholder="z. B. UKW · Turnusprüfung Senderendstufe"></div>
        <div class="field"><label for="outSite">Standort</label><select class="select" id="outSite">${allowed.sort((a, b) => a.nummer.localeCompare(b.nummer)).map((site) => `<option value="${site.nummer}" ${site.nummer === siteId ? 'selected' : ''}>${site.nummer} · ${A.esc(site.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="outService">Dienst</label><select class="select" id="outService">${SERVICES.map((svc) => `<option ${existing?.service === svc ? 'selected' : ''}>${A.esc(svc)}</option>`).join('')}</select></div>
        <div class="field"><label for="outReason">Grund</label><select class="select" id="outReason">${REASONS.map((reason) => `<option ${existing?.reason === reason ? 'selected' : ''}>${A.esc(reason)}</option>`).join('')}</select></div>
        <div class="field"><label for="outTask">Verknüpfte Wartung (optional)</label><select class="select" id="outTask"><option value="">Keine Verknüpfung</option>${tasks.map((task) => `<option value="${A.esc(task.id)}" ${existing?.maintenanceId === task.id ? 'selected' : ''}>${A.esc(task.task)} · ${A.esc(A.fmtDate(task.due))}</option>`).join('')}</select></div>
        <div class="field"><label for="outStart">Beginn</label><input class="input mono" id="outStart" type="datetime-local" value="${toInput(start)}"></div>
        <div class="field"><label for="outEnd">Ende</label><input class="input mono" id="outEnd" type="datetime-local" value="${toInput(end)}"></div>
        <div class="field span-2"><label for="outImpact">Auswirkung</label><input class="input" id="outImpact" value="${A.esc(existing?.impact || '')}" placeholder="z. B. DVB-T2: Reservefrequenz, kurzzeitige Unterbrechung"></div>
        <div class="field span-2"><label for="outDescription">Beschreibung</label><textarea class="textarea" id="outDescription">${A.esc(existing?.description || '')}</textarea></div>
      </div>
      <div class="modal-callout">Die Abschaltung wird im Prototyp lokal gespeichert und im Audit-Log protokolliert. Sie erscheint sofort im Stammdaten-Blatt des Standorts.</div>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Abbrechen</button><button class="btn btn-primary" data-act="out-save" data-id="${existing ? A.esc(existing.id) : ''}">${A.icon('check')} Speichern</button>`
    });
  }

  function saveForm(eventId) {
    const title = document.getElementById('outTitle')?.value.trim();
    const siteId = document.getElementById('outSite')?.value;
    const service = document.getElementById('outService')?.value;
    const reason = document.getElementById('outReason')?.value;
    const maintenanceId = document.getElementById('outTask')?.value || '';
    const start = document.getElementById('outStart')?.value;
    const end = document.getElementById('outEnd')?.value;
    const impact = document.getElementById('outImpact')?.value.trim();
    const description = document.getElementById('outDescription')?.value.trim();
    const site = A.getSite(siteId);
    if (!title) { A.toast('Titel fehlt.', 'error'); return; }
    if (!site) { A.toast('Standort fehlt.', 'error'); return; }
    if (!A.canManageOutages(site)) { A.toast('Keine Berechtigung für diesen Standort.', 'error'); return; }
    if (!start || !end) { A.toast('Zeitraum fehlt.', 'error'); return; }
    if (new Date(end) <= new Date(start)) { A.toast('Das Ende muss nach dem Beginn liegen.', 'error'); return; }
    const payload = { title, siteId, service, reason, maintenanceId, start, end, impact, description };
    if (eventId) {
      const existing = state.outages.find((entry) => entry.id === eventId);
      if (!existing) return;
      const previousTitle = existing.title;
      Object.assign(existing, payload);
      A.logAudit({ action: 'OUTAGE_UPDATE', siteId, target: eventId, field: 'Abschaltung', oldValue: previousTitle, newValue: title });
      A.toast('Abschaltung aktualisiert.', 'success');
    } else {
      const id = `OUT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      state.outages.push({ id, ...payload });
      A.logAudit({ action: 'OUTAGE_CREATE', siteId, target: id, field: 'Abschaltung', oldValue: '', newValue: title });
      A.toast('Abschaltung angelegt.', 'success');
    }
    A.save();
    A.closeModal();
    A.render();
  }

  function deleteEvent(eventId) {
    const event = A.getOutages().find((entry) => entry.id === eventId);
    if (!event) return;
    if (!A.canManageOutages(A.getSite(event.siteId))) { A.toast('Keine Berechtigung.', 'error'); return; }
    A.openModal({
      title: 'Abschaltung löschen?',
      size: 'modal-sm',
      body: `<p>Die Abschaltung <strong>${A.esc(event.title)}</strong> (${A.esc(event.id)}) wird aus dem Kalender entfernt.</p><div class="modal-callout">Im Prototyp wird der Datensatz lokal gelöscht. In Produktion wird ein Audit-Eintrag mit Soft-Delete empfohlen.</div>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Abbrechen</button><button class="btn btn-danger" data-act="out-delete-confirm" data-id="${A.esc(eventId)}">${A.icon('trash')} Löschen</button>`
    });
  }

  function deleteConfirm(eventId) {
    const event = state.outages.find((entry) => entry.id === eventId);
    if (!event) return;
    state.outages = state.outages.filter((entry) => entry.id !== eventId);
    A.logAudit({ action: 'OUTAGE_DELETE', siteId: event.siteId, target: eventId, field: 'Abschaltung', oldValue: event.title, newValue: '' });
    A.save();
    A.closeModal();
    A.render();
    A.toast('Abschaltung gelöscht.', 'success');
  }

  function openDay(date) {
    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
    const events = overlapping(filtered(), dayStart, dayEnd);
    A.openModal({
      title: `Abschaltungen am ${A.fmtDate(date)}`,
      body: events.length ? `<div class="outage-list">${events.map((event) => {
        const site = A.getSite(event.siteId);
        return `<div class="outage-item"><span class="outage-color" style="background:${colorOf(event)}"></span><div class="oi-copy"><div class="oi-title">${A.esc(event.title)}</div><div class="oi-meta">${A.esc(site?.nummer)} ${A.esc(site?.name)} · ${A.esc(eventTime(event))}</div></div><button class="btn btn-xs btn-secondary" data-act="out-open" data-id="${A.esc(event.id)}">Öffnen</button></div>`;
      }).join('')}</div>` : '<div class="muted">Keine Abschaltungen an diesem Tag.</div>',
      footer: `<button class="btn btn-secondary" data-act="close-modal">Schließen</button>`
    });
  }

  function shift(direction) {
    if (ui.outages.view === 'week') {
      const next = new Date(ui.outages.week); next.setDate(next.getDate() + direction * 7); ui.outages.week = next;
    } else if (ui.outages.view === 'day') {
      const next = new Date(ui.outages.day); next.setDate(next.getDate() + direction); ui.outages.day = next;
    } else {
      ui.outages.month = new Date(ui.outages.month.getFullYear(), ui.outages.month.getMonth() + direction, 1);
    }
    A.render();
  }

  function exportICS() {
    const events = filtered();
    const items = events.map((event) => {
      const site = A.getSite(event.siteId);
      return {
        uid: event.id + '@swr-outages', start: event.start, end: event.end, allDay: false,
        summary: `${event.service} · ${event.title}`,
        description: `${event.reason}\n${event.description || ''}\nAuswirkung: ${event.impact || '–'}`,
        location: `${site?.nummer || event.siteId} ${site?.name || ''}`
      };
    });
    A.download(`SWR_Abschaltungen_${A.isoDate()}.ics`, A.buildICS(items, 'SWR Abschaltungen'), 'text/calendar;charset=utf-8');
    A.toast(`${items.length} Abschaltungen als ICS exportiert.`, 'success');
  }

  function settings() {
    return `
      <div class="setting-block">
        <h4>Standard-Ansicht</h4>
        <select class="select input-sm" data-setting="outages.defaultView" data-rerender="false">
          <option value="month" ${A.getSetting('outages.defaultView') === 'month' ? 'selected' : ''}>Monat</option>
          <option value="week" ${A.getSetting('outages.defaultView') === 'week' ? 'selected' : ''}>Woche</option>
          <option value="day" ${A.getSetting('outages.defaultView') === 'day' ? 'selected' : ''}>Tag</option>
          <option value="timeline" ${A.getSetting('outages.defaultView') === 'timeline' ? 'selected' : ''}>Timeline</option>
        </select>
      </div>
      <div class="setting-block">
        <h4>Farbcodierung</h4>
        <p>Ereignisse nach Dienst oder nach Grund einfärben.</p>
        <select class="select input-sm" data-setting="outages.colorBy" data-rerender="true">
          <option value="service" ${A.getSetting('outages.colorBy') === 'service' ? 'selected' : ''}>Dienst</option>
          <option value="reason" ${A.getSetting('outages.colorBy') === 'reason' ? 'selected' : ''}>Grund</option>
        </select>
      </div>
      <div class="setting-block">
        <h4>Kalender-Export</h4>
        <p>Gefilterte Abschaltungen als ICS-Datei herunterladen.</p>
        <button class="btn btn-secondary btn-sm" data-act="out-export-ics">${A.icon('download', 13)} ICS exportieren</button>
      </div>
      <div class="settings-note">In Produktion wird der Kalender mit den Wartungsaufträgen synchronisiert. Der ICS-Feed dient als Übergangslösung.</div>`;
  }

  A.registerModule('outages', { label: 'Abschaltungen', icon: 'calendar', render, settings });

  A.registerAction('out-view', (el) => { ui.outages.view = el.dataset.view; A.render(); });
  A.registerAction('out-prev', () => shift(-1));
  A.registerAction('out-next', () => shift(1));
  A.registerAction('out-today', () => { ui.outages.month = new Date(); ui.outages.week = new Date(); ui.outages.day = new Date(); A.render(); });
  A.registerAction('out-open', (el) => openDetail(el.dataset.id));
  A.registerAction('out-day', (el) => openDay(el.dataset.date));
  A.registerAction('out-new', () => openForm());
  A.registerAction('out-edit', (el) => { const eventId = el.dataset.id; A.closeModal(); openForm(eventId); });
  A.registerAction('out-save', (el) => saveForm(el.dataset.id));
  A.registerAction('out-delete', (el) => { const eventId = el.dataset.id; A.closeModal(); deleteEvent(eventId); });
  A.registerAction('out-delete-confirm', (el) => deleteConfirm(el.dataset.id));
  A.registerAction('out-export-ics', exportICS);
  A.registerAction('out-open-site', (el) => { A.closeModal(); A.setSite(el.dataset.site, { silent: true }); A.navigate('master'); });
  A.registerAction('out-open-task', (el) => {
    A.closeModal();
    A.setSite(el.dataset.site, { silent: true });
    ui.maintenance.q = el.dataset.task;
    ui.maintenance.allSites = false;
    ui.maintenance.status = 'ALL';
    A.navigate('maintenance');
    A.toast('Verknüpfte Wartung im Filter angezeigt.', 'info');
  });

  A.onInput('#outSearch', (el) => {
    ui.outages.q = el.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshResults, 140);
  });

  A.onChange('[data-out-filter]', (el) => {
    ui.outages[el.dataset.outFilter] = el.value;
    refreshResults();
    A.updateContextBanner();
  });

  A.onChange('#outSite', (el) => {
    const select = document.getElementById('outTask');
    if (!select) return;
    const tasks = A.getMaintenance().filter((task) => task.siteId === el.value);
    select.innerHTML = `<option value="">Keine Verknüpfung</option>` + tasks.map((task) => `<option value="${A.esc(task.id)}">${A.esc(task.task)} · ${A.esc(A.fmtDate(task.due))}</option>`).join('');
  });
})();
