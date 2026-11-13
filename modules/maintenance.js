/* ==========================================================================
   Modul: Wartungen
   Bestand aus dem Wartungstool, Suche/Filter, Gruppen, Custom Views,
   Kalenderansicht, ICS-Export, Erledigung und Standort-Kontext.
   ========================================================================== */
(function () {
  'use strict';
  const A = window.App;
  const state = A.state;
  const ui = A.ui;

  const STATUS_LABEL = { OPEN: 'Offen', IN_PROGRESS: 'In Arbeit', DONE: 'Erledigt' };
  const GROUP_LABEL = { none: 'Keine Gruppierung', site: 'Standort', assignee: 'Bearbeiter', due: 'Fälligkeit', status: 'Status' };

  let searchTimer = null;

  function scopedTasks() {
    let tasks = A.getMaintenance();
    if (state.siteId && !ui.maintenance.allSites) tasks = tasks.filter((task) => task.siteId === state.siteId);
    const q = ui.maintenance.q.trim().toLowerCase();
    if (q) {
      tasks = tasks.filter((task) => [task.id, task.siteId, task.siteName, task.task, task.assignee, task.comment, task.interval]
        .join(' ').toLowerCase().includes(q));
    }
    if (ui.maintenance.status === 'OPEN') tasks = tasks.filter((task) => task.status === 'OPEN');
    if (ui.maintenance.status === 'IN_PROGRESS') tasks = tasks.filter((task) => task.status === 'IN_PROGRESS');
    if (ui.maintenance.status === 'DONE') tasks = tasks.filter((task) => task.status === 'DONE');
    if (ui.maintenance.status === 'OVERDUE') tasks = tasks.filter((task) => task.status !== 'DONE' && A.daysUntil(task.due) < 0);
    if (ui.maintenance.onlyMine) tasks = tasks.filter((task) => task.assignee === A.currentUser().name);
    return tasks.sort((a, b) => String(a.due).localeCompare(String(b.due)) || a.id.localeCompare(b.id));
  }

  function isOverdue(task) {
    return task.status !== 'DONE' && A.daysUntil(task.due) < 0;
  }

  function statusTag(task) {
    const cls = task.status === 'DONE' ? 'tag-green' : isOverdue(task) ? 'tag-red' : task.status === 'IN_PROGRESS' ? 'tag-blue' : 'tag-yellow';
    return `<span class="tag ${cls}">${A.esc(STATUS_LABEL[task.status] || task.status)}</span>`;
  }

  function dueCell(task) {
    const days = A.daysUntil(task.due);
    const hint = task.status === 'DONE'
      ? `erledigt ${task.completedAt ? A.esc(A.fmtDate(task.completedAt)) : ''}`
      : days < 0 ? `${Math.abs(days)} Tag${Math.abs(days) === 1 ? '' : 'e'} überfällig`
        : days === 0 ? 'heute' : days <= 21 ? `in ${days} Tagen` : '';
    const hintClass = task.status !== 'DONE' && days < 0 ? 'overdue' : task.status !== 'DONE' && days <= 21 ? 'due-soon' : '';
    let windowBar = '';
    if (task.dueStart && task.dueStart !== task.due && task.status !== 'DONE') {
      const start = new Date(task.dueStart + 'T00:00:00').getTime();
      const end = new Date(task.due + 'T00:00:00').getTime();
      const pct = end > start ? Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100))) : 100;
      windowBar = `<span class="window-bar ${days < 0 ? 'is-late' : ''}" title="Ausführungsfenster ${A.esc(A.fmtDate(task.dueStart))} – ${A.esc(A.fmtDate(task.due))}"><span style="width:${pct}%"></span></span>`;
    }
    return `<input class="cell-input cell-date" type="date" value="${A.esc(String(task.due).slice(0, 10))}" data-maint-inline="due" data-id="${A.esc(task.id)}" aria-label="Fälligkeit ${A.esc(task.task)}">
      ${hint ? `<div class="cell-sub ${hintClass}">${hint}</div>` : ''}${windowBar}`;
  }

  function groupTasks(tasks) {
    const group = ui.maintenance.group;
    if (group === 'none') return [{ key: 'alle', label: 'Alle Wartungsaufgaben', tasks }];
    const buckets = new Map();
    for (const task of tasks) {
      let key;
      let label;
      if (group === 'site') { key = task.siteId; label = `${task.siteId} · ${task.siteName}`; }
      else if (group === 'assignee') { key = task.assignee || 'unbekannt'; label = task.assignee || 'Ohne Bearbeiter'; }
      else if (group === 'status') { key = task.status; label = STATUS_LABEL[task.status] || task.status; }
      else {
        const date = new Date(String(task.due).slice(0, 10) + 'T00:00:00');
        key = `${date.getFullYear()}-${date.getMonth()}`;
        label = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(date);
      }
      if (!buckets.has(key)) buckets.set(key, { key, label, tasks: [] });
      buckets.get(key).tasks.push(task);
    }
    return [...buckets.values()];
  }

  function assigneeOptions(selected) {
    const names = A.D.users.filter((user) => user.roleKey !== 'ADMIN').map((user) => user.name);
    if (selected && !names.includes(selected)) names.unshift(selected);
    return names.map((name) => `<option value="${A.esc(name)}" ${name === selected ? 'selected' : ''}>${A.esc(name)}</option>`).join('');
  }

  function rowHTML(task) {
    return `<tr class="${task.status === 'DONE' ? 'is-done' : ''}">
      <td class="num">${A.esc(task.id.replace(/^TSK_/, 'W-').slice(0, 18))}${task.id.length > 22 ? '…' : ''}</td>
      <td><button class="row-button" data-act="maint-open" data-id="${A.esc(task.id)}"><span class="num">${A.esc(task.siteId)}</span> <span class="cell-sub">${A.esc(task.siteName)}</span></button></td>
      <td><button class="row-button" data-act="maint-open" data-id="${A.esc(task.id)}"><span class="cell-title">${A.esc(task.task)}</span><div class="cell-sub">${A.esc(task.interval || 'manuell')}${task.comment ? ' · ' + A.esc(task.comment) : ''}</div></button></td>
      <td>${dueCell(task)}</td>
      <td><select class="cell-input cell-assignee" data-maint-inline="assignee" data-id="${A.esc(task.id)}" aria-label="Bearbeiter ${A.esc(task.task)}">${assigneeOptions(task.assignee)}</select></td>
      <td><select class="cell-input cell-status" data-maint-inline="status" data-id="${A.esc(task.id)}" aria-label="Status ${A.esc(task.task)}">${Object.entries(STATUS_LABEL).map(([value, label]) => `<option value="${value}" ${task.status === value ? 'selected' : ''}>${label}</option>`).join('')}</select></td>
      <td class="actions">
        ${task.status !== 'DONE'
          ? `<button class="btn btn-secondary btn-xs" data-act="maint-toggle" data-id="${A.esc(task.id)}">${A.icon('check', 12)} Erledigen</button>`
          : `<button class="btn btn-ghost btn-xs" data-act="maint-toggle" data-id="${A.esc(task.id)}">Wieder öffnen</button>`}
        <button class="icon-btn" data-act="maint-open" data-id="${A.esc(task.id)}" title="Details">${A.icon('arrowRight', 14)}</button>
      </td>
    </tr>`;
  }

  function renderList(tasks) {
    if (!tasks.length) return A.emptyState('wrench', 'Keine Wartungen gefunden', 'Suche oder Filter anpassen – oder die Standortkopplung aufheben.');
    const groups = groupTasks(tasks);
    return groups.map((group) => {
      const done = group.tasks.filter((task) => task.status === 'DONE').length;
      const percent = group.tasks.length ? Math.round((done / group.tasks.length) * 100) : 0;
      return `<div>
      <div class="group-head">
        <span class="group-title">${A.esc(group.label)}</span>
        <span class="group-progress"><span class="bar"><span style="width:${percent}%"></span></span><span class="count">${done}/${group.tasks.length}</span></span>
      </div>
      <div class="table-wrap group-table">
        <table class="data-table maint-table">
          <thead><tr><th>ID</th><th>Standort</th><th>Wartung</th><th>Fälligkeit</th><th>Bearbeiter</th><th>Status</th><th></th></tr></thead>
          <tbody>${group.tasks.map(rowHTML).join('')}</tbody>
        </table>
      </div>
    </div>`;
    }).join('');
  }

  function renderCalendar(tasks) {
    const monthDate = ui.maintenance.month;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    const today = A.isoDate();
    const byDate = new Map();
    for (const task of tasks) {
      const key = String(task.due).slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(task);
    }
    const weeks = [];
    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start); date.setDate(start.getDate() + i);
      weeks.push(date);
    }
    return `<div class="calendar">
      <div class="calendar-head">
        <h3>${A.esc(new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(first))}</h3>
        <div class="flex gap-4 center">
          <button class="icon-btn" data-act="maint-prev-month" title="Vorheriger Monat">${A.icon('chevronLeft', 14)}</button>
          <button class="btn btn-secondary btn-xs" data-act="maint-today">Heute</button>
          <button class="icon-btn" data-act="maint-next-month" title="Nächster Monat">${A.icon('chevronRight', 14)}</button>
        </div>
      </div>
      <div class="calendar-weekdays"><div>Mo</div><div>Di</div><div>Mi</div><div>Do</div><div>Fr</div><div>Sa</div><div>So</div></div>
      <div class="calendar-grid">${weeks.map((date) => {
        const key = A.isoDate(date);
        const dayTasks = byDate.get(key) || [];
        const outside = date.getMonth() !== month;
        return `<div class="cal-day ${outside ? 'is-outside' : ''} ${key === today ? 'is-today' : ''}">
          <div class="cal-day-num"><span>${date.getDate()}</span>${dayTasks.length > 3 ? `<span>${dayTasks.length}</span>` : ''}</div>
          ${dayTasks.slice(0, 3).map((task) => `<button class="cal-event" data-act="maint-open" data-id="${A.esc(task.id)}" style="${task.status === 'DONE' ? 'opacity:.5' : isOverdue(task) ? 'border-left-color:var(--support-error)' : ''}" title="${A.esc(task.siteId + ' · ' + task.task)}">
            <span class="mono">${A.esc(task.siteId)}</span> ${A.esc(task.task)}
          </button>`).join('')}
          ${dayTasks.length > 3 ? `<button class="cal-more" data-act="maint-day" data-date="${key}">+${dayTasks.length - 3} weitere</button>` : ''}
        </div>`;
      }).join('')}</div>
    </div>`;
  }

  function renderResults() {
    const tasks = scopedTasks();
    const overdue = tasks.filter(isOverdue).length;
    const summary = `<div class="flex between center mb-16">
      <div class="flex gap-12 center">
        <span class="small"><strong>${tasks.length}</strong> Aufgaben</span>
        ${overdue ? `<span class="tag tag-red">${overdue} überfällig</span>` : `<span class="tag tag-green">keine überfällig</span>`}
        ${state.siteId && !ui.maintenance.allSites ? `<span class="filter-chip">${A.icon('filter', 12)} Standort ${A.esc(state.siteId)}<button data-act="maint-show-all" title="Standortfilter aufheben">${A.icon('close', 11)}</button></span>` : ''}
      </div>
      <button class="btn btn-ghost btn-xs" data-act="maint-export-ics">${A.icon('download', 13)} ICS exportieren</button>
    </div>`;
    return summary + (ui.maintenance.view === 'calendar' ? renderCalendar(tasks) : renderList(tasks));
  }

  function toolbar() {
    const matchingView = state.views.find((view) =>
      view.group === ui.maintenance.group && view.status === ui.maintenance.status &&
      view.onlyMine === ui.maintenance.onlyMine && view.q === ui.maintenance.q);
    return `<div class="toolbar">
      <div class="search-field">
        ${A.icon('search', 14)}
        <input id="maintSearch" class="input input-sm" type="text" placeholder="Standort, Wartung, Bearbeiter …" value="${A.esc(ui.maintenance.q)}" autocomplete="off">
      </div>
      <select class="select input-sm" data-maint-filter="status" aria-label="Status filtern">
        <option value="ALL" ${ui.maintenance.status === 'ALL' ? 'selected' : ''}>Alle Status</option>
        <option value="OPEN" ${ui.maintenance.status === 'OPEN' ? 'selected' : ''}>Nur offen</option>
        <option value="IN_PROGRESS" ${ui.maintenance.status === 'IN_PROGRESS' ? 'selected' : ''}>Nur in Arbeit</option>
        <option value="DONE" ${ui.maintenance.status === 'DONE' ? 'selected' : ''}>Nur erledigt</option>
        <option value="OVERDUE" ${ui.maintenance.status === 'OVERDUE' ? 'selected' : ''}>Nur überfällig</option>
      </select>
      <select class="select input-sm" data-maint-filter="group" aria-label="Gruppieren nach">
        ${Object.entries(GROUP_LABEL).map(([value, label]) => `<option value="${value}" ${ui.maintenance.group === value ? 'selected' : ''}>Gruppe: ${label}</option>`).join('')}
      </select>
      <label class="check"><input type="checkbox" data-maint-filter="mine" ${ui.maintenance.onlyMine ? 'checked' : ''}> Nur meine</label>
      <div class="toolbar-spacer"></div>
      <select class="select input-sm" id="maintCustomView" aria-label="Benutzerdefinierte Ansicht">
        <option value="">Ansicht wählen …</option>
        ${state.views.map((view) => `<option value="${A.esc(view.id)}" ${matchingView?.id === view.id ? 'selected' : ''}>${A.esc(view.name)}</option>`).join('')}
      </select>
      <button class="btn btn-secondary btn-sm" data-act="maint-save-view">${A.icon('plus', 13)} Ansicht speichern</button>
      <div class="view-switch">
        <button data-act="maint-view" data-view="list" class="${ui.maintenance.view === 'list' ? 'is-active' : ''}">${A.icon('list', 12)} Liste</button>
        <button data-act="maint-view" data-view="calendar" class="${ui.maintenance.view === 'calendar' ? 'is-active' : ''}">${A.icon('calendar', 12)} Kalender</button>
      </div>
      <button class="btn btn-primary btn-sm" data-act="maint-new" ${A.isAdminMode() ? '' : 'title="Im Prototyp nur mit aktivem Admin-Modus"'} ${A.isAdminMode() ? '' : 'disabled'}>${A.icon('plus', 13)} Wartung anlegen</button>
    </div>`;
  }

  function render() {
    return `<div class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow">Wartungen <span class="tag tag-neutral">Wartungstool</span></div>
        <h1>Wartungsmanagement</h1>
        <p class="page-sub">Fällige Prüfungen, Turnuswartungen und Bearbeiter-Zuweisung. ${state.siteId ? 'Der Standortfilter folgt dem globalen Kontext.' : ''}</p>
      </div>
      <div class="head-actions">
        ${state.siteId ? `<button class="btn btn-secondary btn-sm" data-act="nav" data-module="master">${A.icon('building')} Stammdaten</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-act="nav" data-module="protocols">${A.icon('document')} Protokolle</button>
      </div>
    </div>
    ${state.siteId && !ui.maintenance.allSites ? '' : ''}
    ${toolbar()}
    <div id="maintResults">${renderResults()}</div>`;
  }

  function refreshResults() {
    const el = document.getElementById('maintResults');
    if (el) el.innerHTML = renderResults();
  }

  function openTaskModal(taskId) {
    const task = A.getMaintenance().find((entry) => entry.id === taskId);
    if (!task) { A.toast('Wartung nicht gefunden.', 'error'); return; }
    const site = A.getSite(task.siteId);
    const days = A.daysUntil(task.due);
    A.openModal({
      title: `Wartung ${task.id.replace(/^TSK_/, 'W-').slice(0, 26)}`,
      body: `<div class="flex between center mb-16">
          <div><strong>${A.esc(task.task)}</strong><div class="small muted">${A.esc(task.siteName)} · Standort ${A.esc(task.siteId)}</div></div>
          ${statusTag(task)}
        </div>
        <dl class="kv-list">
          <div class="kv-row"><dt>Fälligkeit</dt><dd class="mono">${A.esc(A.fmtDate(task.due))} ${task.status !== 'DONE' ? `<span class="${isOverdue(task) ? 'overdue' : 'muted'}">(${days < 0 ? Math.abs(days) + ' Tage überfällig' : days === 0 ? 'heute' : 'in ' + days + ' Tagen'})</span>` : ''}</dd></div>
          <div class="kv-row"><dt>Turnus</dt><dd>${A.esc(task.interval || 'manuell')}</dd></div>
          <div class="kv-row"><dt>Bearbeiter</dt><dd>${A.esc(task.assignee || '–')}</dd></div>
          <div class="kv-row"><dt>Kommentar</dt><dd>${A.esc(task.comment || '–')}</dd></div>
          <div class="kv-row"><dt>Erledigt am</dt><dd>${task.completedAt ? A.esc(A.fmtDate(task.completedAt)) : '–'}</dd></div>
          <div class="kv-row"><dt>Standort</dt><dd>${site ? `<a href="#" data-act="maint-open-site" data-site="${A.esc(task.siteId)}">${A.esc(task.siteId)} · ${A.esc(site.name)}</a>` : A.esc(task.siteName)}</dd></div>
        </dl>
        ${site ? `<div class="modal-callout">Schreibzugriff auf Wartungsstammdaten ist im Prototyp auf Admin beschränkt. Die Erledigung selbst ist für Techniker freigegeben.</div>` : ''}`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Schließen</button>
        ${site ? `<button class="btn btn-secondary" data-act="maint-goto-protocol" data-site="${A.esc(task.siteId)}">${A.icon('document')} Protokolle</button>` : ''}
        <button class="btn ${task.status !== 'DONE' ? 'btn-primary' : 'btn-secondary'}" data-act="maint-toggle" data-id="${A.esc(task.id)}">${task.status !== 'DONE' ? A.icon('check') + ' Als erledigt markieren' : 'Wieder öffnen'}</button>`
    });
  }

  function setTaskStatus(taskId, status) {
    const task = A.getMaintenance().find((entry) => entry.id === taskId);
    if (!task || task.status === status) return;
    const oldLabel = STATUS_LABEL[task.status] || task.status;
    if (status === 'DONE') {
      state.maintenanceDone[taskId] = { status: 'DONE', completedAt: A.isoDate() };
    } else {
      delete state.maintenanceDone[taskId];
      state.maintenanceEdits[taskId] = { ...(state.maintenanceEdits[taskId] || {}), status };
    }
    A.logAudit({ action: status === 'DONE' ? 'MAINTENANCE_DONE' : 'MAINTENANCE_STATUS', siteId: task.siteId, target: task.id, field: 'Status', oldValue: oldLabel, newValue: STATUS_LABEL[status] || status });
    A.save();
  }

  function toggleTask(taskId) {
    const task = A.getMaintenance().find((entry) => entry.id === taskId);
    if (!task) return;
    const done = task.status === 'DONE';
    setTaskStatus(taskId, done ? 'OPEN' : 'DONE');
    A.closeModal();
    A.render();
    A.toast(done ? 'Wartung wieder geöffnet.' : `Wartung erledigt: ${task.task}`, 'success');
  }

  function updateInline(taskId, field, value) {
    const task = A.getMaintenance().find((entry) => entry.id === taskId);
    if (!task) return;
    if (field === 'status') { setTaskStatus(taskId, value); refreshResults(); return; }
    if (field === 'due') {
      if (!value) return;
      state.maintenanceEdits[taskId] = { ...(state.maintenanceEdits[taskId] || {}), due: value };
      A.logAudit({ action: 'MAINTENANCE_EDIT', siteId: task.siteId, target: task.id, field: 'Fälligkeit', oldValue: task.due, newValue: value });
    } else if (field === 'assignee') {
      state.maintenanceEdits[taskId] = { ...(state.maintenanceEdits[taskId] || {}), assignee: value };
      A.logAudit({ action: 'MAINTENANCE_EDIT', siteId: task.siteId, target: task.id, field: 'Bearbeiter', oldValue: task.assignee, newValue: value });
    }
    A.save();
    refreshResults();
  }

  function applyView(viewId) {
    const view = state.views.find((entry) => entry.id === viewId);
    if (!view) return;
    ui.maintenance.q = view.q || '';
    ui.maintenance.group = view.group || 'due';
    ui.maintenance.status = view.status || 'ALL';
    ui.maintenance.onlyMine = !!view.onlyMine;
    A.render();
    A.toast(`Ansicht „${view.name}“ angewendet.`, 'info');
  }

  function saveView() {
    const name = window.prompt('Name der Ansicht:', 'Meine Ansicht');
    if (!name || !name.trim()) return;
    state.views.push({
      id: 'v-' + Date.now().toString(36), name: name.trim(),
      group: ui.maintenance.group, status: ui.maintenance.status,
      onlyMine: ui.maintenance.onlyMine, q: ui.maintenance.q
    });
    A.save();
    A.render();
    A.toast(`Ansicht „${name.trim()}“ gespeichert.`, 'success');
  }

  function exportICS() {
    const tasks = scopedTasks();
    const items = tasks.map((task) => ({
      uid: task.id + '@swr-prototype',
      start: task.due, end: task.due, allDay: true,
      summary: `[${task.siteId}] ${task.task}`,
      description: `Status: ${STATUS_LABEL[task.status]}\nBearbeiter: ${task.assignee || '–'}\nTurnus: ${task.interval || 'manuell'}${task.comment ? '\nKommentar: ' + task.comment : ''}`,
      location: task.siteName
    }));
    A.download(`SWR_Wartungen_${A.isoDate()}.ics`, A.buildICS(items, 'SWR Wartungen'), 'text/calendar;charset=utf-8');
    A.toast(`${items.length} Wartungen als ICS exportiert.`, 'success');
  }

  function openDay(date) {
    const tasks = scopedTasks().filter((task) => String(task.due).slice(0, 10) === date);
    A.openModal({
      title: `Wartungen am ${A.fmtDate(date)}`,
      body: tasks.length ? `<div class="outage-list">${tasks.map((task) => `<div class="outage-item">
        <span class="status-dot ${task.status === 'DONE' ? '' : isOverdue(task) ? 'error' : 'warn'}"></span>
        <div class="oi-copy"><div class="oi-title">${A.esc(task.task)}</div><div class="oi-meta">${A.esc(task.siteId)} · ${A.esc(task.siteName)} · ${A.esc(task.assignee)}</div></div>
        <button class="btn btn-xs btn-secondary" data-act="maint-open" data-id="${A.esc(task.id)}">Öffnen</button>
      </div>`).join('')}</div>` : '<div class="muted">Keine Wartungen an diesem Tag.</div>',
      footer: `<button class="btn btn-secondary" data-act="close-modal">Schließen</button>`
    });
  }

  function newTaskModal() {
    if (!A.isAdminMode()) { A.toast('Wartungsstammdaten anlegen ist im Prototyp nur im Admin-Modus möglich.', 'warning'); return; }
    const sites = A.getSites().sort((a, b) => a.nummer.localeCompare(b.nummer));
    A.openModal({
      title: 'Neue Wartung anlegen',
      body: `<div class="form-grid">
        <div class="field span-2"><label for="newTaskName">Wartungsbezeichnung</label><input class="input" id="newTaskName" placeholder="z. B. NSV, VDE-Messung"></div>
        <div class="field"><label for="newTaskSite">Standort</label><select class="select" id="newTaskSite">${sites.map((site) => `<option value="${site.nummer}" ${site.nummer === state.siteId ? 'selected' : ''}>${site.nummer} · ${A.esc(site.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="newTaskDue">Fälligkeit</label><input class="input mono" id="newTaskDue" type="date" value="${A.isoDate(new Date(Date.now() + 30 * 86400000))}"></div>
        <div class="field"><label for="newTaskAssignee">Bearbeiter</label><select class="select" id="newTaskAssignee">${A.D.users.filter((user) => user.roleKey !== 'ADMIN').map((user) => `<option value="${A.esc(user.name)}" ${user.id === state.userId ? 'selected' : ''}>${A.esc(user.name)}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label><input class="input" value="Offen" disabled></div>
        <div class="field span-2"><label for="newTaskComment">Kommentar / Hinweis</label><textarea class="textarea" id="newTaskComment" placeholder="Optional"></textarea></div>
      </div>
      <div class="modal-callout">Admin-Modus aktiv. Die neue Wartung wird im Prototyp lokal gespeichert und im Audit-Log erfasst.</div>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Abbrechen</button><button class="btn btn-primary" data-act="maint-create">Wartung anlegen</button>`
    });
  }

  function createTask() {
    if (!A.isAdminMode()) { A.toast('Keine Berechtigung.', 'error'); return; }
    const name = document.getElementById('newTaskName').value.trim();
    const siteId = document.getElementById('newTaskSite').value;
    const due = document.getElementById('newTaskDue').value;
    const assignee = document.getElementById('newTaskAssignee').value;
    const comment = document.getElementById('newTaskComment').value.trim();
    if (!name) { A.toast('Wartungsbezeichnung fehlt.', 'error'); return; }
    if (!due) { A.toast('Fälligkeit fehlt.', 'error'); return; }
    const site = A.getSite(siteId);
    const task = {
      id: 'W-EXT-' + Date.now().toString(36).toUpperCase(), siteId, siteName: site?.name || '',
      task: name, dueStart: due, due, assignee, interval: 'manuell', status: 'OPEN', completedAt: '', comment
    };
    state.extraMaintenance.push(task);
    A.logAudit({ action: 'CREATE', siteId, target: task.id, field: 'Wartung', oldValue: '', newValue: name });
    A.save();
    A.closeModal();
    ui.maintenance.allSites = false;
    A.render();
    A.toast(`Wartung „${name}“ angelegt.`, 'success');
  }

  function settings() {
    return `
      <div class="setting-block">
        <h4>Standard-Ansicht</h4>
        <p>Wird beim nächsten Öffnen des Moduls verwendet.</p>
        <select class="select input-sm" data-setting="maintenance.defaultView" data-rerender="false">
          <option value="list" ${A.getSetting('maintenance.defaultView') === 'list' ? 'selected' : ''}>Liste</option>
          <option value="calendar" ${A.getSetting('maintenance.defaultView') === 'calendar' ? 'selected' : ''}>Kalender</option>
        </select>
      </div>
      <div class="setting-block">
        <h4>Standard-Gruppierung</h4>
        <select class="select input-sm" data-setting="maintenance.defaultGroup" data-rerender="false">
          ${Object.entries(GROUP_LABEL).map(([value, label]) => `<option value="${value}" ${A.getSetting('maintenance.defaultGroup') === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="setting-block">
        <div class="setting-inline">
          <div><h4 style="margin:0">Standortkopplung</h4><p style="margin:2px 0 0">Beim Öffnen automatisch auf den globalen Standort filtern.</p></div>
          <label class="switch"><input type="checkbox" data-setting="maintenance.autoSiteFilter" data-rerender="false" ${A.getSetting('maintenance.autoSiteFilter', true) ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="setting-block">
        <h4>Kalender-Sync</h4>
        <p>Im Prototyp als ICS-Download. Ein abonnierbarer Feed (WebCal) folgt in Phase 3.</p>
        <button class="btn btn-secondary btn-sm" data-act="maint-export-ics">${A.icon('download', 13)} Aktuelle Auswahl als ICS</button>
      </div>
      <div class="setting-block">
        <h4>Gespeicherte Ansichten</h4>
        ${state.views.length ? state.views.map((view) => `<div class="flex between center" style="padding:6px 0;border-bottom:1px solid var(--border-subtle)">
          <span class="small">${A.esc(view.name)}</span>
          <button class="icon-btn" data-act="maint-delete-view" data-id="${A.esc(view.id)}" title="Ansicht löschen">${A.icon('trash', 13)}</button>
        </div>`).join('') : '<p class="small muted">Keine eigenen Ansichten.</p>'}
      </div>
      <div class="settings-note">Eigene Ansichten und Erledigungen werden im Prototyp im Browser gespeichert. In Produktion übernimmt die API die Persistenz pro Benutzer.</div>`;
  }

  A.registerModule('maintenance', { label: 'Wartungen', icon: 'wrench', render, settings });

  A.registerAction('maint-view', (el) => { ui.maintenance.view = el.dataset.view; A.render(); });
  A.registerAction('maint-prev-month', () => { ui.maintenance.month = new Date(ui.maintenance.month.getFullYear(), ui.maintenance.month.getMonth() - 1, 1); A.render(); });
  A.registerAction('maint-next-month', () => { ui.maintenance.month = new Date(ui.maintenance.month.getFullYear(), ui.maintenance.month.getMonth() + 1, 1); A.render(); });
  A.registerAction('maint-today', () => { ui.maintenance.month = new Date(); A.render(); });
  A.registerAction('maint-open', (el) => openTaskModal(el.dataset.id));
  A.registerAction('maint-toggle', (el) => toggleTask(el.dataset.id));
  A.registerAction('maint-show-all', () => { ui.maintenance.allSites = true; A.render(); });
  A.registerAction('maint-save-view', saveView);
  A.registerAction('maint-delete-view', (el) => {
    state.views = state.views.filter((view) => view.id !== el.dataset.id);
    A.save(); A.closePanel(); A.render(); A.toast('Ansicht gelöscht.', 'success');
  });
  A.registerAction('maint-export-ics', exportICS);
  A.registerAction('maint-new', newTaskModal);
  A.registerAction('maint-create', createTask);
  A.registerAction('maint-day', (el) => openDay(el.dataset.date));
  A.registerAction('maint-open-site', (el) => { A.closeModal(); A.setSite(el.dataset.site, { silent: true }); A.navigate('master'); });
  A.registerAction('maint-goto-protocol', (el) => { A.closeModal(); A.setSite(el.dataset.site, { silent: true }); A.navigate('protocols'); });

  A.onInput('#maintSearch', (el) => {
    ui.maintenance.q = el.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(refreshResults, 140);
  });

  A.onChange('[data-maint-filter]', (el) => {
    const key = el.dataset.maintFilter;
    if (key === 'mine') ui.maintenance.onlyMine = el.checked;
    else ui.maintenance[key] = el.value;
    refreshResults();
  });

  A.onChange('[data-maint-inline]', (el) => {
    updateInline(el.dataset.id, el.dataset.maintInline, el.value);
  });

  A.onChange('#maintCustomView', (el) => { if (el.value) applyView(el.value); });
})();
