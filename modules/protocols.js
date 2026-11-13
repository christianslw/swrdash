/* ==========================================================================
   Modul: Protokolle
   Modulare Vorlagen, Messwert-Historie inline, Draft/Submit,
   Immutability nach Abschluss, Revisionen und Druck-/PDF-Ansicht.
   ========================================================================== */
(function () {
  'use strict';
  const A = window.App;
  const state = A.state;
  const ui = A.ui;
  const P = () => ui.protocols;

  const STATUS_LABEL = { DRAFT: 'Entwurf', SUBMITTED: 'Abgeschlossen' };

  /* ------------------------------------------------------------- Helpers -- */
  function templateOf(protocol) {
    return protocol ? A.getTemplate(protocol.templateId) : null;
  }

  function allMeasurementFields(template) {
    return (template?.blocks || []).filter((block) => block.type === 'measurements').flatMap((block) => block.fields);
  }

  function allChecklistFields(template) {
    return (template?.blocks || []).filter((block) => block.type === 'checklist').flatMap((block) => block.fields);
  }

  function requiredFields(template) {
    return allMeasurementFields(template).filter((field) => field.required);
  }

  function progress(protocol) {
    const template = templateOf(protocol);
    if (!template) return { filled: 0, total: 0, percent: 0 };
    const required = requiredFields(template);
    const filled = required.filter((field) => A.numeric(protocol.data?.[field.key]) !== null).length;
    return { filled, total: required.length, percent: required.length ? Math.round((filled / required.length) * 100) : 100 };
  }

  function isViolation(field, value) {
    const numericValue = A.numeric(value);
    if (numericValue === null) return false;
    if (field.min != null && numericValue < field.min) return true;
    if (field.max != null && numericValue > field.max) return true;
    return false;
  }

  function isNearLimit(field, value) {
    const numericValue = A.numeric(value);
    if (numericValue === null) return false;
    if (field.max != null && numericValue > field.max * 0.8) return true;
    if (field.min != null && numericValue < field.min * 1.25) return true;
    return false;
  }

  function trendFor(protocol, field, previous) {
    const current = A.numeric(protocol.data?.[field.key]);
    const prev = A.numeric(previous);
    if (current === null || prev === null) return { symbol: '', className: 'trend-flat', percent: 0, worse: false };
    const percent = prev === 0 ? 0 : ((current - prev) / Math.abs(prev)) * 100;
    const worse = field.min != null ? current < prev : current > prev;
    const symbol = current === prev ? '■' : current > prev ? '▲' : '▼';
    return {
      symbol,
      percent,
      worse,
      className: Math.abs(percent) < 0.5 ? 'trend-flat' : worse ? 'trend-bad' : 'trend-good'
    };
  }

  function rowState(protocol, field) {
    const value = protocol.data?.[field.key];
    const previous = A.historyFor(protocol, field.key, 1)[0];
    const trend = previous ? trendFor(protocol, field, previous.value) : null;
    if (isViolation(field, value)) return { className: 'has-error', label: 'Grenzwert verletzt' };
    if (trend && trend.worse && Math.abs(trend.percent) > 15) return { className: 'has-warning', label: 'Verschlechterung' };
    if (isNearLimit(field, value)) return { className: 'has-warning', label: 'Grenznah' };
    return { className: '', label: '' };
  }

  function inlineHistoryHTML(field, history) {
    if (!history.length) return '<div class="inline-history"><span class="ih-label">Verlauf</span><span class="muted">Keine früheren Werte vorhanden.</span></div>';
    const items = history.map((entry, index) => {
      const older = history[index + 1];
      const currentValue = A.numeric(entry.value);
      const olderValue = older ? A.numeric(older.value) : null;
      const delta = currentValue !== null && olderValue !== null && olderValue !== 0 ? ((currentValue - olderValue) / Math.abs(olderValue)) * 100 : null;
      const worse = delta !== null && (field.min != null ? delta < 0 : delta > 0);
      const deltaClass = delta === null || Math.abs(delta) < 0.5 ? 'is-flat' : worse ? 'is-bad' : 'is-good';
      return `<span class="ih-item">${A.esc(A.fmtDate(entry.protocol.pruefdatum))}: ${A.esc(A.formatNumbers(entry.value))} ${A.esc(field.unit)}${delta === null ? '' : ` <span class="ih-delta ${deltaClass}">${delta > 0 ? '+' : ''}${delta.toFixed(1)}%</span>`}</span>`;
    }).join('');
    return `<div class="inline-history"><span class="ih-label">Letzte ${history.length}</span>${items}</div>`;
  }

  function makeId(siteId, templateId) {
    const suffix = templateId.replace('tpl-', '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 7);
    return `P-${siteId}-${new Date().getFullYear()}-${suffix}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  function blankData(template) {
    const data = {};
    for (const field of allMeasurementFields(template)) data[field.key] = '';
    for (const field of allChecklistFields(template)) data[field.key] = false;
    for (const block of template.blocks.filter((entry) => entry.type === 'text')) data[block.key] = '';
    return data;
  }

  function startProtocol(templateId) {
    const site = A.getSite(state.siteId);
    if (!site) { A.toast('Bitte zuerst einen Standortkontext wählen.', 'warning'); return; }
    const template = A.getTemplate(templateId);
    if (!template) return;
    const protocol = {
      id: makeId(site.nummer, templateId), siteId: site.nummer, templateId,
      status: 'DRAFT', pruefdatum: A.isoDate(), submittedAt: '', submittedBy: '',
      revision: 1, revisionOf: null, hash: '', data: blankData(template), notes: ''
    };
    state.protocols.unshift(protocol);
    A.logAudit({ action: 'PROTOCOL_CREATE', siteId: site.nummer, target: protocol.id, field: 'Protokoll', oldValue: '', newValue: template.name });
    A.save();
    openEditor(protocol.id);
    A.toast(`Neuer Entwurf: ${template.name}`, 'success');
  }

  function openProtocol(protocolId) {
    const protocol = A.getProtocol(protocolId);
    if (!protocol) return;
    if (protocol.status === 'DRAFT') {
      openEditor(protocolId);
    } else {
      P().view = 'detail';
      P().id = protocolId;
      P().editor = null;
      A.render();
    }
  }

  function openEditor(protocolId) {
    const protocol = A.getProtocol(protocolId);
    if (!protocol) return;
    P().editor = protocol;
    P().id = protocol.id;
    P().view = 'editor';
    P().overlay = A.getSetting('protocols.autoOverlay', false);
    A.render();
  }

  function backToList() {
    P().view = 'list';
    P().editor = null;
    P().id = null;
    A.render();
  }

  /* ------------------------------------------------------------- Render --- */
  function render() {
    if (P().view === 'editor') return renderEditor();
    if (P().view === 'detail') return renderDetail();
    return renderList();
  }

  function renderList() {
    const site = A.getSite(state.siteId);
    const protocols = filteredProtocols();
    const allProtocols = state.protocols;
    const drafts = allProtocols.filter((entry) => entry.status === 'DRAFT').length;
    const submitted = allProtocols.filter((entry) => entry.status === 'SUBMITTED').length;
    return `<div class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow">Protokolle <span class="tag tag-neutral">Neu · Phase 4</span></div>
        <h1>Prüfprotokolle</h1>
        <p class="page-sub">Modulare Vorlagen für VDE 0105-100, Leiterprüfung und Antennentragwerk. ${site ? `Aktueller Standort: ${site.nummer} ${site.name}.` : 'Ohne Standortkontext werden alle Protokolle angezeigt.'}</p>
      </div>
      <div class="head-actions">
        ${site ? `<button class="btn btn-secondary btn-sm" data-act="proto-toggle-scope">${A.icon('building')} ${P().allSites ? 'Nur ' + site.nummer : 'Alle Standorte'}</button>` : ''}
        <button class="btn btn-secondary btn-sm" data-act="proto-templates">${A.icon('layers')} Vorlagen</button>
        <button class="btn btn-primary btn-sm" data-act="proto-new" ${site ? '' : 'disabled title="Standort wählen"'}>${A.icon('plus')} Neues Protokoll</button>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi"><div class="kpi-value">${drafts}</div><div class="kpi-label">Entwürfe</div></div>
      <div class="kpi"><div class="kpi-value">${submitted}</div><div class="kpi-label">Abgeschlossen</div></div>
      <div class="kpi"><div class="kpi-value">${A.D.templates.length}</div><div class="kpi-label">Vorlagen</div></div>
      <div class="kpi"><div class="kpi-value">${site ? protocols.filter((entry) => entry.siteId === site.nummer).length : protocols.length}</div><div class="kpi-label">${site ? 'Am Standort' : 'Gesamt'}</div></div>
    </div>

    ${site ? `<div class="protocol-list-head"><h3>Verfügbare Vorlagen am Standort</h3><span class="muted small">Standort-spezifische Blöcke werden in Phase 4 ergänzt.</span></div>
      <div class="template-grid">${A.D.templates.map((template) => templateCard(template, site)).join('')}</div>` : ''}

    <div class="protocol-list-head">
      <h3>Protokolle</h3>
      <div class="flex gap-8 center">
        <div class="search-field">
          ${A.icon('search', 14)}
          <input class="input input-sm" id="protoSearch" placeholder="Protokoll, Vorlage, Standort …" value="${A.esc(P().q)}">
        </div>
        <select class="select input-sm" data-proto-filter="status">
          <option value="ALL" ${P().filterStatus === 'ALL' ? 'selected' : ''}>Alle Status</option>
          <option value="DRAFT" ${P().filterStatus === 'DRAFT' ? 'selected' : ''}>Entwürfe</option>
          <option value="SUBMITTED" ${P().filterStatus === 'SUBMITTED' ? 'selected' : ''}>Abgeschlossen</option>
        </select>
      </div>
    </div>
    <div id="protoList">${renderProtocolTable(protocols)}</div>`;
  }

  function templateCard(template, site) {
    return `<div class="template-card">
      <div class="flex between center"><span class="protocol-type-icon">${A.icon(template.id.includes('leiter') ? 'shield' : template.id.includes('trag') ? 'layers' : 'document')}</span><span class="tag tag-neutral">v${A.esc(template.version)}</span></div>
      <h3>${A.esc(template.name)}</h3>
      <div class="template-meta"><span class="tag tag-neutral">${A.esc(template.norm)}</span><span class="tag tag-neutral">${template.blocks.length} Blöcke</span></div>
      <p>${A.esc(template.description)}</p>
      <div class="flex gap-8">
        <button class="btn btn-primary btn-sm" data-act="proto-start" data-template="${A.esc(template.id)}">${A.icon('plus', 13)} Starten</button>
        <button class="btn btn-secondary btn-sm" data-act="proto-template-detail" data-template="${A.esc(template.id)}">Details</button>
      </div>
    </div>`;
  }

  function filteredProtocols() {
    const site = A.getSite(state.siteId);
    let protocols = state.protocols.slice();
    if (site && !P().allSites) protocols = protocols.filter((entry) => entry.siteId === site.nummer);
    const q = P().q.trim().toLowerCase();
    if (q) protocols = protocols.filter((entry) => {
      const template = A.getTemplate(entry.templateId);
      const entrySite = A.getSite(entry.siteId);
      return [entry.id, template?.name, entrySite?.name, entrySite?.nummer, entry.status].join(' ').toLowerCase().includes(q);
    });
    if (P().filterStatus !== 'ALL') protocols = protocols.filter((entry) => entry.status === P().filterStatus);
    return protocols.sort((a, b) => String(b.pruefdatum).localeCompare(String(a.pruefdatum)));
  }

  function renderProtocolTable(protocols) {
    if (!protocols.length) return A.emptyState('document', 'Keine Protokolle gefunden', 'Starte ein neues Protokoll aus einer der Vorlagen oder wähle einen anderen Standort.', '');
    return `<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Protokoll</th><th>Standort</th><th>Vorlage / Norm</th><th>Prüfdatum</th><th>Prüfer</th><th>Status</th><th>Rev.</th><th></th></tr></thead>
      <tbody>${protocols.map((protocol) => {
        const template = A.getTemplate(protocol.templateId);
        const site = A.getSite(protocol.siteId);
        const user = protocol.submittedBy ? A.userById(protocol.submittedBy) : null;
        return `<tr>
          <td><button class="row-button" data-act="proto-open" data-id="${A.esc(protocol.id)}"><span class="num">${A.esc(protocol.id)}</span>${protocol.revisionOf ? `<div class="cell-sub">Revision von ${A.esc(protocol.revisionOf)}</div>` : ''}</button></td>
          <td><span class="num">${A.esc(protocol.siteId)}</span> <span class="cell-sub">${A.esc(site?.kuerzel || '')}</span></td>
          <td><span class="cell-title">${A.esc(template?.name || protocol.templateId)}</span><div class="cell-sub">${A.esc(template?.norm || '')}</div></td>
          <td class="mono">${A.esc(A.fmtDate(protocol.pruefdatum))}</td>
          <td>${A.esc(user?.name || (protocol.status === 'DRAFT' ? 'Entwurf' : '–'))}</td>
          <td><span class="tag ${protocol.status === 'SUBMITTED' ? 'tag-green' : 'tag-yellow'}">${A.esc(STATUS_LABEL[protocol.status])}</span></td>
          <td class="mono">${A.esc(protocol.revision || 1)}</td>
          <td class="actions">
            <button class="btn btn-secondary btn-xs" data-act="proto-open" data-id="${A.esc(protocol.id)}">${protocol.status === 'DRAFT' ? 'Bearbeiten' : 'Ansehen'}</button>
            ${protocol.status === 'SUBMITTED' ? `<button class="icon-btn" data-act="proto-print" data-id="${A.esc(protocol.id)}" title="Drucken / PDF">${A.icon('download', 14)}</button><button class="icon-btn" data-act="proto-revision" data-id="${A.esc(protocol.id)}" title="Neue Revision">${A.icon('refresh', 14)}</button>` : ''}
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function refreshProtocolList() {
    const el = document.getElementById('protoList');
    if (el) el.innerHTML = renderProtocolTable(filteredProtocols());
  }

  function renderEditor() {
    const protocol = P().editor || A.getProtocol(P().id);
    const template = templateOf(protocol);
    const site = A.getSite(protocol?.siteId);
    if (!protocol || !template) return A.emptyState('alert', 'Protokoll nicht gefunden', 'Bitte zurück zur Liste.');
    const editable = protocol.status === 'DRAFT';
    const prog = progress(protocol);
    return `<div class="editor-toolbar">
      <button class="btn btn-secondary btn-sm" data-act="proto-back">${A.icon('chevronLeft')} Liste</button>
      <div class="grow">
        <div class="small"><strong>${A.esc(template.name)}</strong> · ${site ? `${A.esc(site.nummer)} ${A.esc(site.name)}` : ''}</div>
        <div class="muted small">${A.esc(protocol.id)}${editable ? ' · automatisch gespeicherter Entwurf' : ' · unveränderlich'}</div>
      </div>
      <div class="progress"><span>Pflichtwerte</span><div class="progress-bar"><span id="protoProgressBar" style="width:${prog.percent}%"></span></div><span class="mono" id="protoProgressCount">${prog.filled}/${prog.total}</span></div>
      <button class="btn btn-secondary btn-sm ${P().overlay ? 'is-active' : ''}" data-act="proto-overlay">${A.icon('history', 13)} Historien ${P().overlay ? 'ausblenden' : 'einblenden'}</button>
      <button class="btn btn-secondary btn-sm" data-act="proto-save">${A.icon('check', 13)} Entwurf speichern</button>
      <button class="btn btn-secondary btn-sm" data-act="proto-print">${A.icon('download', 13)} PDF</button>
      ${editable ? `<button class="btn btn-primary btn-sm" data-act="proto-submit">${A.icon('lock', 13)} Abschließen & absenden</button>` : ''}
    </div>
    ${editable ? `<div class="lock-banner">${A.icon('info', 16)}<div><strong>Entwurfsmodus:</strong> Messwerte und Kommentare können jederzeit geändert werden. Nach „Abschließen & absenden“ wird der Datensatz unveränderlich gesperrt und ein SHA-256-Hash gebildet.</div></div>` : `<div class="lock-banner" style="border-left-color:var(--support-success);background:var(--support-success-soft)">${A.icon('lock', 16)}<div><strong>Abgeschlossen und gesperrt:</strong> ${protocol.submittedAt ? 'eingereicht am ' + A.esc(A.fmtDateTime(protocol.submittedAt)) : ''}. Korrekturen nur über eine neue Revision.</div></div>`}
    ${renderSheet(protocol, { editable, overlay: P().overlay })}
    <div class="flex between center mt-16">
      <span class="muted small">Drucken/PDF öffnet den Browser-Druckdialog. Die Ablage im Standortordner wird in Phase 4 angebunden.</span>
      <button class="btn btn-secondary btn-sm" data-act="proto-back">Zurück zur Liste</button>
    </div>`;
  }

  function renderDetail() {
    const protocol = A.getProtocol(P().id);
    if (!protocol) return A.emptyState('alert', 'Protokoll nicht gefunden', 'Bitte zurück zur Liste.');
    const template = templateOf(protocol);
    const site = A.getSite(protocol.siteId);
    return `<div class="editor-toolbar">
      <button class="btn btn-secondary btn-sm" data-act="proto-back">${A.icon('chevronLeft')} Liste</button>
      <div class="grow">
        <div class="small"><strong>${A.esc(template?.name || '')}</strong> · ${site ? `${A.esc(site.nummer)} ${A.esc(site.name)}` : ''}</div>
        <div class="muted small">${A.esc(protocol.id)} · abgeschlossen ${protocol.submittedAt ? A.esc(A.fmtDateTime(protocol.submittedAt)) : ''}</div>
      </div>
      <button class="btn btn-secondary btn-sm" data-act="proto-print" data-id="${A.esc(protocol.id)}">${A.icon('download', 13)} Drucken / PDF</button>
      <button class="btn btn-secondary btn-sm" data-act="proto-revision" data-id="${A.esc(protocol.id)}">${A.icon('refresh', 13)} Neue Revision</button>
    </div>
    <div class="lock-banner" style="border-left-color:var(--support-success);background:var(--support-success-soft)">${A.icon('lock', 16)}<div><strong>Revisionssicher abgeschlossen.</strong> Der Datensatz ist unveränderlich. SHA-256: <span class="mono">${A.esc(protocol.hash || '–')}</span></div></div>
    ${renderSheet(protocol, { editable: false, overlay: false })}`;
  }

  function renderSheet(protocol, options = {}) {
    const template = templateOf(protocol);
    const site = A.getSite(protocol.siteId);
    const editable = !!options.editable && protocol.status === 'DRAFT';
    const user = protocol.submittedBy ? A.userById(protocol.submittedBy) : A.currentUser();
    const device = A.getSetting('protocols.device', 'GMC PROFITEST MF XTRA · SN 1849204');
    return `<div class="protocol-sheet" id="protocolSheet">
      <div class="protocol-sheet-head">
        <div class="protocol-brand">
          <span class="swr-logo">SWR</span>
          <span class="protocol-brand-sub">Senderinfrastruktur<br>Technik Außeneinsatz</span>
        </div>
        <div class="protocol-title-block">
          <h1>${A.esc(template.name)}</h1>
          <div class="mono">${A.esc(template.norm)}</div>
          <div style="margin-top:6px"><span class="protocol-status-stamp ${protocol.status === 'DRAFT' ? 'draft' : ''}">${protocol.status === 'DRAFT' ? 'ENTWURF' : 'ABGESCHLOSSEN'}</span></div>
        </div>
      </div>
      <div class="protocol-meta-grid">
        <div class="protocol-meta-cell"><div class="lbl">Standort</div><div class="val"><span class="mono">${A.esc(protocol.siteId)}</span> ${A.esc(site?.kuerzel || '')} · ${A.esc(site?.name || '')}</div></div>
        <div class="protocol-meta-cell"><div class="lbl">Prüfdatum</div><div class="val mono">${A.esc(A.fmtDate(protocol.pruefdatum))}</div></div>
        <div class="protocol-meta-cell"><div class="lbl">Prüfer</div><div class="val">${A.esc(protocol.status === 'SUBMITTED' ? user.name : A.currentUser().name)}</div></div>
        <div class="protocol-meta-cell"><div class="lbl">Messgerät</div><div class="val">${A.esc(device)}</div></div>
        <div class="protocol-meta-cell"><div class="lbl">Protokoll-ID</div><div class="val mono">${A.esc(protocol.id)}</div></div>
        <div class="protocol-meta-cell"><div class="lbl">Revision</div><div class="val mono">${A.esc(protocol.revision || 1)}${protocol.revisionOf ? ' · von ' + A.esc(protocol.revisionOf) : ''}</div></div>
        <div class="protocol-meta-cell"><div class="lbl">Status</div><div class="val">${A.esc(STATUS_LABEL[protocol.status])}</div></div>
        <div class="protocol-meta-cell"><div class="lbl">SHA-256</div><div class="val mono" style="font-size:9px;word-break:break-all">${A.esc(protocol.hash || 'wird beim Abschluss erzeugt')}</div></div>
      </div>
      ${template.blocks.map((block) => renderBlock(protocol, template, block, { editable, overlay: options.overlay })).join('')}
      ${protocol.status === 'SUBMITTED' ? `<div class="protocol-lock-block">
        <div class="lock-copy"><strong>Unveränderlich gesperrt</strong>Abgeschlossen am ${A.esc(protocol.submittedAt ? A.fmtDateTime(protocol.submittedAt) : '–')} durch ${A.esc(user.name)}.</div>
        <div class="lock-sign"><span>Prüfer / Unterschrift</span>${A.esc(user.name)}<br>${A.esc(protocol.submittedAt ? A.fmtDate(protocol.submittedAt) : '')}</div>
      </div>` : ''}
      <div class="protocol-signature">
        <div class="signature-line">Datum, Unterschrift Prüfer · ${A.esc(protocol.status === 'SUBMITTED' ? user.name : A.currentUser().name)}</div>
        <div class="signature-line">Freigabe / Sichtprüfung VEFK</div>
      </div>
      <div class="hash-line" style="margin-top:18px">${protocol.status === 'SUBMITTED' ? 'Unveränderlich gespeichert · SHA-256 ' + A.esc(protocol.hash) : 'Entwurf · keine revisionssichere Speicherung'}</div>
    </div>`;
  }

  function renderBlock(protocol, template, block, options) {
    if (block.type === 'section') {
      return `<section class="protocol-section"><h2>${A.esc(block.title)}</h2><p class="section-text">${A.esc(block.text)}</p></section>`;
    }
    if (block.type === 'visual') {
      return `<section class="protocol-section"><h2>${A.esc(block.title)}</h2><div class="section-visual">${diagramSVG(block.variant)}<div class="visual-caption">${A.esc(block.caption)}</div></div></section>`;
    }
    if (block.type === 'checklist') {
      return `<section class="protocol-section"><h2>${A.esc(block.title)}</h2><div class="check-table">
        ${block.fields.map((field) => `<div class="check-row">
          <input type="checkbox" data-proto-check="${A.esc(field.key)}" ${protocol.data[field.key] ? 'checked' : ''} ${options.editable ? '' : 'disabled'} aria-label="${A.esc(field.label)}">
          <span>${A.esc(field.label)}</span>
          <span class="check-result ${protocol.data[field.key] ? '' : 'muted'}">${protocol.data[field.key] ? 'i.O.' : 'offen'}</span>
        </div>`).join('')}
      </div></section>`;
    }
    if (block.type === 'measurements') {
      const depth = Number(A.getSetting('protocols.historyDepth', 3));
      return `<section class="protocol-section"><h2>${A.esc(block.title)}</h2>
        <div style="overflow-x:auto"><table class="measure-table">
          <thead><tr><th>Messpunkt / Feld</th><th>Wert</th><th>Einheit</th><th>Grenzwert</th></tr></thead>
          <tbody>${block.fields.map((field) => {
            const history = A.historyFor(protocol, field.key, depth);
            const stateInfo = rowState(protocol, field);
            const currentValue = protocol.data?.[field.key] ?? '';
            return `<tr class="${stateInfo.className}">
              <td><strong>${A.esc(field.label)}</strong><div class="cell-sub">${A.esc(field.key)}${field.required ? ' · Pflicht' : ''}<span data-row-state="${A.esc(field.key)}">${stateInfo.label ? ` · <span class="${stateInfo.className === 'has-error' ? 'overdue' : 'due-soon'}">${A.esc(stateInfo.label)}</span>` : ''}</span></div></td>
              <td><div class="value-cell"><input data-proto-field="${A.esc(field.key)}" value="${A.esc(currentValue)}" inputmode="decimal" ${options.editable ? '' : 'disabled'} aria-label="${A.esc(field.label)}"><button class="icon-btn history-button print-hide" data-act="proto-history" data-key="${A.esc(field.key)}" title="Letzte Werte einblenden" aria-expanded="${options.overlay ? 'true' : 'false'}">${A.icon('history', 14)}</button></div></td>
              <td class="measure-unit">${A.esc(field.unit)}</td>
              <td class="measure-limit">${A.esc(field.hint || (field.min != null ? '≥ ' + field.min : field.max != null ? '≤ ' + field.max : '–'))}</td>
            </tr>
            <tr class="measure-history-row print-hide ${options.overlay ? '' : 'hidden'}" data-history-row="${A.esc(field.key)}"><td colspan="4">${inlineHistoryHTML(field, history)}</td></tr>`;
          }).join('')}</tbody>
        </table></div>
      </section>`;
    }
    if (block.type === 'text') {
      return `<section class="protocol-section"><h2>${A.esc(block.title)}</h2>
        ${options.editable
          ? `<textarea class="protocol-textarea" data-proto-text="${A.esc(block.key)}" placeholder="${A.esc(block.placeholder || '')}">${A.esc(protocol.data[block.key] || '')}</textarea>`
          : `<p class="section-text">${A.esc(protocol.data[block.key] || 'Keine Bemerkungen.')}</p>`}
      </section>`;
    }
    if (block.type === 'signature') {
      return `<section class="protocol-section"><h2>${A.esc(block.title)}</h2><div class="section-text">Die Prüfung wurde durch die unten genannte befähigte Person durchgeführt. Messwerte und Feststellungen sind Bestandteil dieses Protokolls.</div></section>`;
    }
    return '';
  }

  function diagramSVG(variant) {
    const stroke = 'var(--text-3)';
    const accent = 'var(--interactive)';
    if (variant === 'climb') {
      return `<svg viewBox="0 0 600 180" role="img" aria-label="Schema Steigschutz">
        <rect x="120" y="20" width="60" height="140" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        ${Array.from({ length: 8 }, (_, i) => `<line x1="120" y1="${30 + i * 17}" x2="180" y2="${30 + i * 17}" stroke="${stroke}" stroke-width="1"/>`).join('')}
        <line x1="300" y1="20" x2="300" y2="160" stroke="${accent}" stroke-width="3"/>
        <circle cx="300" cy="70" r="8" fill="${accent}"/>
        <path d="M300 70 Q340 80 340 120 L310 140" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="4 3"/>
        <text x="220" y="90" font-size="11" fill="${stroke}">Steigschutzschiene</text>
        <text x="220" y="110" font-size="11" fill="${stroke}">Läufer + PSAgA</text>
        <text x="125" y="175" font-size="11" fill="${stroke}">Leiter / Steigweg (Prinzip)</text>
      </svg>`;
    }
    if (variant === 'tower') {
      return `<svg viewBox="0 0 600 180" role="img" aria-label="Schema Antennentragwerk">
        <path d="M300 20 L240 160 M300 20 L360 160 M260 100 H340 M250 130 H350" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <line x1="300" y1="20" x2="300" y2="160" stroke="${stroke}" stroke-width="0.8" stroke-dasharray="3 3"/>
        <circle cx="300" cy="30" r="4" fill="${accent}"/>
        <path d="M300 160 H420 M380 160 v12 M380 172 h-12 M380 172 h12" fill="none" stroke="${accent}" stroke-width="2"/>
        <text x="430" y="165" font-size="11" fill="${stroke}">Erdung / Mastfuß</text>
        <text x="370" y="40" font-size="11" fill="${stroke}">Flugwarnbefeuerung</text>
      </svg>`;
    }
    return `<svg viewBox="0 0 600 180" role="img" aria-label="Schema NSHV">
      <line x1="40" y1="40" x2="560" y2="40" stroke="${accent}" stroke-width="3"/>
      <text x="40" y="30" font-size="10" fill="${stroke}">NSHV Hauptsammelschiene</text>
      ${[100, 220, 340, 460].map((x, i) => `<line x1="${x}" y1="40" x2="${x}" y2="70" stroke="${stroke}" stroke-width="1.5"/>
        <rect x="${x - 14}" y="70" width="28" height="34" fill="none" stroke="${stroke}" stroke-width="1.5"/>
        <line x1="${x - 7}" y1="78" x2="${x + 7}" y2="96" stroke="${stroke}" stroke-width="1"/>
        <text x="${x - 18}" y="120" font-size="11" fill="${stroke}">F${i + 1}</text>`).join('')}
      <line x1="100" y1="104" x2="100" y2="140" stroke="${stroke}" stroke-width="1.5"/><text x="70" y="155" font-size="10" fill="${stroke}">FM</text>
      <line x1="220" y1="104" x2="220" y2="140" stroke="${stroke}" stroke-width="1.5"/><text x="185" y="155" font-size="10" fill="${stroke}">USV</text>
      <line x1="340" y1="104" x2="340" y2="140" stroke="${stroke}" stroke-width="1.5"/><text x="300" y="155" font-size="10" fill="${stroke}">Licht</text>
      <line x1="460" y1="104" x2="460" y2="140" stroke="${stroke}" stroke-width="1.5"/><text x="420" y="155" font-size="10" fill="${stroke}">Reserve</text>
      <text x="500" y="35" font-size="10" fill="${stroke}">400 V</text>
    </svg>`;
  }

  /* ------------------------------------------------------------- Actions -- */
  function toggleHistoryInline(fieldKey) {
    const row = document.querySelector(`[data-history-row="${CSS.escape(fieldKey)}"]`);
    const button = document.querySelector(`[data-act="proto-history"][data-key="${CSS.escape(fieldKey)}"]`);
    if (!row) return;
    row.classList.toggle('hidden');
    button?.setAttribute('aria-expanded', row.classList.contains('hidden') ? 'false' : 'true');
  }

  function updateFieldState(protocol, fieldKey, input) {
    const template = templateOf(protocol);
    const field = allMeasurementFields(template).find((entry) => entry.key === fieldKey);
    if (!field) return;
    const info = rowState(protocol, field);
    const row = input.closest('tr');
    if (!row) return;
    row.classList.toggle('has-error', info.className === 'has-error');
    row.classList.toggle('has-warning', info.className === 'has-warning');
    const label = row.querySelector(`[data-row-state="${CSS.escape(fieldKey)}"]`);
    if (label) label.innerHTML = info.label ? ` · <span class="${info.className === 'has-error' ? 'overdue' : 'due-soon'}">${A.esc(info.label)}</span>` : '';
  }

  function updateProgress(protocol) {
    const prog = progress(protocol);
    const bar = document.getElementById('protoProgressBar');
    const count = document.getElementById('protoProgressCount');
    if (bar) bar.style.width = `${prog.percent}%`;
    if (count) count.textContent = `${prog.filled}/${prog.total}`;
  }

  function toggleOverlay() {
    P().overlay = !P().overlay;
    A.closePanel();
    A.render();
  }

  function saveDraft() {
    A.save();
    A.toast('Entwurf gespeichert.', 'success');
  }

  function submit() {
    const protocol = P().editor;
    if (!protocol || protocol.status !== 'DRAFT') return;
    const template = templateOf(protocol);
    const missing = requiredFields(template).filter((field) => A.numeric(protocol.data?.[field.key]) === null);
    if (missing.length) {
      A.toast(`Bitte ${missing.length} Pflicht-Messwert${missing.length === 1 ? '' : 'e'} ausfüllen.`, 'error');
      const first = document.querySelector(`[data-proto-field="${CSS.escape(missing[0].key)}"]`);
      if (first) { first.classList.add('is-invalid'); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus(); }
      return;
    }
    const violations = allMeasurementFields(template).filter((field) => isViolation(field, protocol.data?.[field.key]));
    const site = A.getSite(protocol.siteId);
    A.openModal({
      title: 'Protokoll abschließen & absenden?',
      body: `<p>Das Protokoll <strong>${A.esc(protocol.id)}</strong> für <strong>${A.esc(site?.nummer)} ${A.esc(site?.name)}</strong> wird abgeschlossen.</p>
        <dl class="kv-list" style="margin-top:12px">
          <div class="kv-row"><dt>Vorlage</dt><dd>${A.esc(template.name)} · ${A.esc(template.norm)}</dd></div>
          <div class="kv-row"><dt>Prüfdatum</dt><dd class="mono">${A.esc(A.fmtDate(protocol.pruefdatum))}</dd></div>
          <div class="kv-row"><dt>Pflichtwerte</dt><dd>${requiredFields(template).length} / ${requiredFields(template).length} erfasst</dd></div>
        </dl>
        ${violations.length ? `<div class="modal-callout" style="border-left-color:var(--support-error);background:var(--support-error-soft)"><strong>${violations.length} Grenzwertverletzung${violations.length === 1 ? '' : 'en'}:</strong> ${violations.map((field) => A.esc(field.label)).join(', ')}. Der Abschluss ist möglich; die Mängel müssen im Bemerkungsfeld dokumentiert sein.</div>` : ''}
        <div class="modal-callout"><strong>Unveränderlich:</strong> Nach dem Absenden wird der Datensatz gesperrt. Korrekturen nur über eine neue Revision. Der SHA-256-Hash wird berechnet.</div>
        <p class="small muted">„PDF“ wird im Prototyp über den Browser-Druckdialog erzeugt und nicht automatisch im Standortordner abgelegt.</p>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Abbrechen</button><button class="btn btn-primary" data-act="proto-submit-confirm" data-id="${A.esc(protocol.id)}">${A.icon('lock', 13)} Verbindlich absenden</button>`
    });
  }

  async function submitConfirm(protocolId) {
    const protocol = A.getProtocol(protocolId);
    if (!protocol || protocol.status !== 'DRAFT') return;
    const submittedAt = new Date().toISOString();
    protocol.status = 'SUBMITTED';
    protocol.submittedAt = submittedAt;
    protocol.submittedBy = state.userId;
    const payload = JSON.stringify({ id: protocol.id, siteId: protocol.siteId, templateId: protocol.templateId, data: protocol.data, submittedAt });
    try {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
      protocol.hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      protocol.hash = 'demo-' + Date.now().toString(16);
    }
    A.logAudit({ action: 'PROTOCOL_SUBMIT', siteId: protocol.siteId, target: protocol.id, field: 'Status', oldValue: 'DRAFT', newValue: 'SUBMITTED' });
    A.save();
    A.closeModal();
    P().view = 'detail';
    P().id = protocol.id;
    P().editor = null;
    A.render();
    A.toast('Protokoll abgeschlossen und unveränderlich gespeichert.', 'success');
  }

  function newRevision(protocolId) {
    const protocol = A.getProtocol(protocolId);
    if (!protocol || protocol.status !== 'SUBMITTED') return;
    const revision = cloneProtocol(protocol);
    revision.id = makeId(protocol.siteId, protocol.templateId);
    revision.revision = (protocol.revision || 1) + 1;
    revision.revisionOf = protocol.id;
    revision.status = 'DRAFT';
    revision.pruefdatum = A.isoDate();
    revision.submittedAt = '';
    revision.submittedBy = '';
    revision.hash = '';
    state.protocols.unshift(revision);
    A.logAudit({ action: 'PROTOCOL_REVISION', siteId: protocol.siteId, target: revision.id, field: 'Revision', oldValue: protocol.id, newValue: revision.id });
    A.save();
    openEditor(revision.id);
    A.toast(`Neue Revision ${revision.revision} als Entwurf angelegt.`, 'success');
  }

  function cloneProtocol(protocol) {
    return JSON.parse(JSON.stringify(protocol));
  }

  function printProtocol(protocolId) {
    const protocol = protocolId ? A.getProtocol(protocolId) : P().editor;
    if (!protocol) return;
    const root = document.getElementById('print-root');
    root.innerHTML = renderSheet(protocol, { editable: false, overlay: false });
    document.body.classList.add('has-print-sheet');
    const cleanup = () => {
      document.body.classList.remove('has-print-sheet');
      root.innerHTML = '';
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 30000);
    }, 60);
  }

  function openTemplatesModal() {
    A.openModal({
      title: 'Vorlagen-Baukasten · Konzept',
      size: 'modal-wide',
      body: `<p class="small muted mb-16">Vorlagen bestehen aus modularen Blöcken. Standortspezifische Vorlagen und der visuelle Editor folgen in Phase 4.</p>
        <div class="template-grid">${A.D.templates.map((template) => `<div class="template-card">
          <div class="flex between center"><strong>${A.esc(template.name)}</strong><span class="tag tag-neutral">v${A.esc(template.version)}</span></div>
          <div class="small muted">${A.esc(template.norm)}</div>
          <div class="stack" style="gap:6px">${template.blocks.map((block) => `<div class="tag tag-neutral" style="justify-content:space-between">${A.esc(block.title)}<span class="mono">${A.esc(block.type)}</span></div>`).join('')}</div>
        </div>`).join('')}</div>
        <div class="settings-note">Blocktypen: Sektion, Sichtprüfung (Checkboxen), Messwert-Tabelle mit Einheiten/Grenzwerten, Freitext und visuelle Elemente (Lage-Skizze, Schaltbild, Referenzfoto).</div>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Schließen</button>`
    });
  }

  function settings() {
    return `
      <div class="setting-block">
        <h4>Standard-Messgerät</h4>
        <p>Wird im Protokollkopf vorbelegt.</p>
        <input class="input input-sm" data-setting="protocols.device" data-rerender="false" value="${A.esc(A.getSetting('protocols.device'))}">
      </div>
      <div class="setting-block">
        <h4>Historien-Tiefe</h4>
        <p>Anzahl der Vergleichsprüfungen im Overlay und Verlauf.</p>
        <select class="select input-sm" data-setting="protocols.historyDepth" data-rerender="true">
          ${[1, 3, 5].map((depth) => `<option value="${depth}" ${Number(A.getSetting('protocols.historyDepth', 3)) === depth ? 'selected' : ''}>letzte ${depth} Prüfung${depth === 1 ? '' : 'en'}</option>`).join('')}
        </select>
      </div>
      <div class="setting-block">
        <div class="setting-inline">
          <div><h4 style="margin:0">Historien automatisch einblenden</h4><p style="margin:2px 0 0">Vergangene Werte beim Öffnen eines Protokolls unter den Messfeldern anzeigen.</p></div>
          <label class="switch"><input type="checkbox" data-setting="protocols.autoOverlay" data-rerender="false" ${A.getSetting('protocols.autoOverlay') ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="setting-block">
        <h4>Vorlagen</h4>
        <p>Vorlagen-Baukasten und standortspezifische Sektionen.</p>
        <button class="btn btn-secondary btn-sm" data-act="proto-templates">${A.icon('layers', 13)} Vorlagenübersicht</button>
      </div>
      <div class="settings-note">Im Prototyp werden Protokolle lokal gespeichert. Produktion: PostgreSQL JSONB + Trigger-Guard, PDF-Ablage mit Hash im Standortordner.</div>`;
  }

  A.registerModule('protocols', { label: 'Protokolle', icon: 'document', render, settings });

  A.registerAction('proto-start', (el) => { A.closeModal(); startProtocol(el.dataset.template); });
  A.registerAction('proto-open', (el) => openProtocol(el.dataset.id));
  A.registerAction('proto-back', backToList);
  A.registerAction('proto-save', saveDraft);
  A.registerAction('proto-submit', submit);
  A.registerAction('proto-submit-confirm', (el) => submitConfirm(el.dataset.id));
  A.registerAction('proto-overlay', toggleOverlay);
  A.registerAction('proto-history', (el) => toggleHistoryInline(el.dataset.key));
  A.registerAction('proto-print', (el) => printProtocol(el.dataset.id));
  A.registerAction('proto-revision', (el) => newRevision(el.dataset.id));
  A.registerAction('proto-templates', openTemplatesModal);
  A.registerAction('proto-template-detail', (el) => {
    const template = A.getTemplate(el.dataset.template);
    if (!template) return;
    A.openModal({
      title: template.name,
      body: `<div class="flex gap-8 wrap mb-16"><span class="tag tag-neutral">${A.esc(template.norm)}</span><span class="tag tag-neutral">${template.blocks.length} Blöcke</span><span class="tag tag-neutral">v${A.esc(template.version)}</span></div>
        <p class="small" style="line-height:1.6">${A.esc(template.description)}</p>
        <hr class="divider">
        <div class="stack" style="gap:8px">${template.blocks.map((block) => `<div class="flex between center"><span class="small">${A.esc(block.title)}</span><span class="tag tag-neutral mono">${A.esc(block.type)}</span></div>`).join('')}</div>`,
      footer: `<button class="btn btn-secondary" data-act="close-modal">Schließen</button>${state.siteId ? `<button class="btn btn-primary" data-act="proto-start" data-template="${A.esc(template.id)}">${A.icon('plus')} Protokoll starten</button>` : ''}`
    });
  });
  A.registerAction('proto-toggle-scope', () => { P().allSites = !P().allSites; A.render(); });
  A.registerAction('proto-new', () => {
    if (!state.siteId) { A.toast('Bitte zuerst einen Standort wählen.', 'warning'); return; }
    openTemplatesModal();
  });

  A.onInput('#protoSearch', (el) => {
    P().q = el.value;
    clearTimeout(P().searchTimer);
    P().searchTimer = setTimeout(refreshProtocolList, 140);
  });

  A.onChange('[data-proto-filter]', (el) => {
    P().filterStatus = el.value;
    refreshProtocolList();
  });

  A.onInput('[data-proto-field]', (el) => {
    const protocol = P().editor;
    if (!protocol || protocol.status !== 'DRAFT') return;
    protocol.data[el.dataset.protoField] = el.value;
    el.classList.remove('is-invalid');
    updateFieldState(protocol, el.dataset.protoField, el);
    updateProgress(protocol);
    A.save();
  });

  document.addEventListener('keydown', (event) => {
    const input = event.target.closest?.('[data-proto-field]');
    if (!input) return;
    if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const inputs = [...document.querySelectorAll('[data-proto-field]:not([disabled])')];
    const index = inputs.indexOf(input);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'ArrowUp' ? inputs[index - 1] : inputs[index + 1];
    if (next) { next.focus(); next.select?.(); }
  });

  A.onChange('[data-proto-check]', (el) => {
    const protocol = P().editor;
    if (!protocol || protocol.status !== 'DRAFT') return;
    protocol.data[el.dataset.protoCheck] = el.checked;
    const result = el.closest('.check-row')?.querySelector('.check-result');
    if (result) { result.textContent = el.checked ? 'i.O.' : 'offen'; result.classList.toggle('muted', !el.checked); }
    A.save();
  });

  A.onInput('[data-proto-text]', (el) => {
    const protocol = P().editor;
    if (!protocol || protocol.status !== 'DRAFT') return;
    protocol.data[el.dataset.protoText] = el.value;
    A.save();
  });
})();
