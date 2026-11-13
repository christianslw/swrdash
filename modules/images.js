/* ==========================================================================
   Modul: Bildertool
   Drag & Drop, EXIF/GPS-Matching, Laplace-Schärfe, Demo-Vektorklassifizierung,
   optionales OCR (Tesseract, lazy), Kompression, ZIP- und Ordner-Export.
   ========================================================================== */
(function () {
  'use strict';
  const A = window.App;
  const D = A.D;
  const state = A.state;
  const ui = A.ui;

  const CATEGORIES = D.imageCategories;

  /* ------------------------------------------------------------- Demo ----- */
  function demoCanvas(title, subtitle, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = 900; canvas.height = 600;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 900, 600);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 900, 600);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 2;
    for (let x = 0; x < 900; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
    for (let y = 0; y < 600; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.fillRect(0, 420, 900, 180);
    ctx.fillStyle = '#fff';
    ctx.font = '600 44px "IBM Plex Mono", monospace';
    ctx.fillText(title, 48, 500);
    ctx.font = '24px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.fillText(subtitle, 48, 546);
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.strokeRect(20, 20, 860, 560);
    return canvas;
  }

  function dataURLToBlob(dataUrl) {
    const [head, body] = dataUrl.split(',');
    const mime = (head.match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function makeDemoItem(spec) {
    const canvas = demoCanvas(spec.title, spec.subtitle, spec.colors);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    const blob = dataURLToBlob(dataUrl);
    const file = new File([blob], spec.name, { type: 'image/jpeg', lastModified: Date.now() });
    const site = A.getSite(spec.siteId);
    const category = CATEGORIES.find((cat) => cat.id === spec.category) || CATEGORIES[0];
    return {
      id: 'img-demo-' + spec.name.replace(/\W/g, ''),
      originalName: spec.name, file, url: dataUrl,
      originalSize: blob.size, compressedBlob: blob, compressedSize: Math.round(blob.size * 0.68),
      width: canvas.width, height: canvas.height,
      siteId: spec.siteId, matchedDistance: spec.distance, matchSource: 'EXIF-GPS',
      coordinates: site ? { lat: site.lat, lon: site.lon } : null,
      camera: spec.camera, date: spec.date, altitude: spec.altitude, drone: spec.drone,
      sharpness: spec.sharpness, category: category.id, subcategory: spec.subcategory,
      confidence: spec.confidence, ocr: spec.ocr || '', comment: spec.comment || '',
      status: 'ready', demo: true, ocrStatus: 'done'
    };
  }

  function seedDemos() {
    if (ui.images.length) return;
    ui.images.push(makeDemoItem({
      name: 'IMG_4821.jpg', siteId: '8400', title: 'NSHV / Überspannungsschutz', subtitle: 'Demo · Energietechnik · Zählerstand 048291,6 kWh',
      colors: ['#1f3b4d', '#4b6b72'], category: 'Energietechnik', subcategory: 'NSHV',
      camera: 'Apple iPhone 15 Pro', date: '2026-11-09', sharpness: 442.8, ocr: '048291.6', comment: 'Ü-Ableiter Typ 1+2',
      distance: 12, altitude: null, drone: false, confidence: 91
    }));
    ui.images.push(makeDemoItem({
      name: 'DJI_0084.jpg', siteId: '8700', title: 'Antennenträger Nord', subtitle: 'Demo · Luftaufnahme · 120 m über Grund',
      colors: ['#6d8fa8', '#c8b79b'], category: 'Mast', subcategory: 'Antennen',
      camera: 'DJI Mavic 3 Enterprise', date: '2026-11-08', sharpness: 261.4, ocr: '', comment: 'Antennenfeld Nordseite',
      distance: 8, altitude: 120, drone: true, confidence: 87
    }));
    ui.images.push(makeDemoItem({
      name: 'IMG_4830.jpg', siteId: '8321', title: 'Sendersaal · Kabelweg', subtitle: 'Demo · Kabine · Aufnahme unscharf',
      colors: ['#403a35', '#7a6a58'], category: 'Kabine', subcategory: 'Sendersaal',
      camera: 'Samsung Galaxy S23', date: '2026-11-07', sharpness: 64.2, ocr: '', comment: 'Kabelweg prüfen',
      distance: 35, altitude: null, drone: false, confidence: 72
    }));
    A.updateShell();
  }

  seedDemos();

  /* ------------------------------------------------------------- Helpers -- */
  function sharpnessTag(item) {
    const threshold = Number(A.getSetting('images.sharpness', 120));
    if (item.sharpness >= threshold * 1.5) return { label: 'Scharf', cls: 'tag-green', meter: 'good' };
    if (item.sharpness >= threshold * 0.7) return { label: 'Grenzwertig', cls: 'tag-yellow', meter: 'warn' };
    return { label: 'Unscharf', cls: 'tag-red', meter: 'bad' };
  }

  function sanitizePart(value, fallback = '') {
    const cleaned = String(value ?? '')
      .replace(/[äÄ]/g, (c) => (c === 'ä' ? 'ae' : 'Ae'))
      .replace(/[öÖ]/g, (c) => (c === 'ö' ? 'oe' : 'Oe'))
      .replace(/[üÜ]/g, (c) => (c === 'ü' ? 'ue' : 'Ue'))
      .replace(/ß/g, 'ss')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-_.]+|[-_.]+$/g, '')
      .slice(0, 60);
    return cleaned || fallback;
  }

  function yearOf(item) {
    return String(item.date || A.isoDate()).slice(0, 4);
  }

  function folderFor(item) {
    const site = A.getSite(item.siteId);
    const template = A.getSetting('images.folder', '<Standortnr>_<Kuerzel>/<Jahr>/<Kategorie>/<Unterkategorie>');
    return template
      .replace(/<Standortnr>/g, site?.nummer || 'unbekannt')
      .replace(/<Kuerzel>/g, site?.kuerzel || 'XXX')
      .replace(/<Jahr>/g, yearOf(item))
      .replace(/<Kategorie>/g, item.category || 'Unsortiert')
      .replace(/<Unterkategorie>/g, item.subcategory || 'Allgemein')
      .split('/').map((part) => sanitizePart(part, 'Unsortiert')).join('/');
  }

  function fileNameFor(item) {
    const site = A.getSite(item.siteId);
    const date = String(item.date || A.isoDate()).replace(/-/g, '');
    const altitude = item.drone && item.altitude ? `Luftaufnahme-${Math.round(item.altitude)}m` : '';
    const parts = [
      site?.nummer || '0000', item.category || 'Unsortiert', item.subcategory || 'Allgemein',
      altitude, sanitizePart(item.comment || '', ''), date
    ].filter(Boolean);
    return sanitizePart(parts.join('_'), `IMG_${date}.jpg`) + '.jpg';
  }

  function selectedItems() {
    return ui.images.filter((item) => ui.imagesSelected.has(item.id));
  }

  function sampleItem() {
    return selectedItems()[0] || ui.images[0] || {
      siteId: state.siteId, category: 'Mast', subcategory: 'Antennen', date: A.isoDate(), comment: '', originalName: 'IMG_0000.jpg'
    };
  }

  function bulkPaths(item) {
    const folder = folderFor(item);
    const fileName = fileNameFor(item);
    const ext = (String(item.originalName || '').match(/\.[a-z0-9]+$/i) || ['.jpg'])[0].toLowerCase();
    return {
      raw: `unkomprimiert/${folder}/${fileName.replace(/\.jpg$/i, ext)}`,
      packed: `komprimiert/${folder}/${fileName}`
    };
  }

  function bulkPreviewHTML() {
    const item = sampleItem();
    const categorySelect = document.getElementById('imgBulkCategory');
    const subSelect = document.getElementById('imgBulkSubcategory');
    const commentInput = document.getElementById('imgBulkComment');
    const preview = {
      ...item,
      category: categorySelect ? categorySelect.value : item.category,
      subcategory: subSelect ? subSelect.value : item.subcategory,
      comment: commentInput ? commentInput.value : item.comment
    };
    const paths = bulkPaths(preview);
    const count = selectedItems().length;
    return `<div class="bulk-preview" id="imgBulkPreview">
      <div><div class="preview-label">unkomprimiert</div><div class="folder-preview">${A.esc(paths.raw)}</div></div>
      <div><div class="preview-label">komprimiert</div><div class="folder-preview">${A.esc(paths.packed)}</div></div>
      ${count > 1 ? `<div class="small muted">Pfadvorschau für das erste von ${count} ausgewählten Bildern.</div>` : ''}
    </div>`;
  }

  function imageCard(item) {
    const site = A.getSite(item.siteId);
    const sharp = sharpnessTag(item);
    const selected = ui.imagesSelected.has(item.id);
    return `<div class="image-card ${selected ? 'is-selected' : ''}" data-img-card="${A.esc(item.id)}">
      <div class="thumb-wrap">
        <img class="image-thumb" src="${item.url}" alt="Vorschau ${A.esc(item.originalName)}">
        <input type="checkbox" class="thumb-check" data-img-select="${A.esc(item.id)}" ${selected ? 'checked' : ''} aria-label="${A.esc(item.originalName)} auswählen">
      </div>
      <div class="image-name">${A.esc(item.originalName)}</div>
      <div class="image-meta">${A.esc(item.camera || 'Kamera n/a')} · ${A.esc(A.fmtDate(item.date))}</div>
      <div class="image-meta">${item.originalSize ? Math.round(item.originalSize / 1024) + ' KB' : ''}${item.compressedSize ? ' → ' + Math.round(item.compressedSize / 1024) + ' KB' : ''}</div>
      <div class="card-tags">
        ${item.demo ? '<span class="tag tag-yellow">Demo</span>' : ''}
        <span class="tag ${sharp.cls}">${sharp.label} · ${item.sharpness.toFixed(0)}</span>
        ${item.drone ? `<span class="tag tag-purple">Luftaufnahme · ${item.altitude ? Math.round(item.altitude) + ' m ü. NN' : 'Höhe n/a'}</span>` : ''}
        ${item.coordinates ? '<span class="tag tag-neutral">EXIF-GPS</span>' : '<span class="tag tag-yellow">kein EXIF-GPS</span>'}
        ${site ? `<span class="tag tag-neutral">${A.esc(site.nummer)} ${A.esc(site.kuerzel || '')}</span>` : '<span class="tag tag-neutral">nicht zugeordnet</span>'}
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-act="img-copy-path" data-id="${A.esc(item.id)}" title="Pfad kopieren">${A.icon('copy', 12)}</button>
        <button class="icon-btn" data-act="img-ocr-run" data-id="${A.esc(item.id)}" title="OCR starten" ${item.ocrStatus === 'running' ? 'disabled' : ''}>${A.icon('spark', 12)}</button>
        <button class="icon-btn is-danger" data-act="img-remove" data-id="${A.esc(item.id)}" title="Bild entfernen">${A.icon('trash', 12)}</button>
      </div>
    </div>`;
  }

  function renderGrid(items) {
    if (!items.length) return '<div class="pipeline-empty">Noch keine Bilder. Ziehe Dateien in die Dropzone oder lade die Demo-Bilder.</div>';
    return items.map(imageCard).join('');
  }

  function renderBatchSide() {
    const selected = selectedItems();
    const sample = sampleItem();
    const category = CATEGORIES.find((cat) => cat.id === sample.category) || CATEGORIES[0];
    return `<aside class="image-batch-side">
      <div class="flex between center"><h3>Batch-Zuordnung</h3><span class="tag tag-neutral" id="imgSelectedCount">${selected.length} gewählt</span></div>
      <p class="bulk-count" style="margin-top:4px">${selected.length ? 'Änderungen gelten für die markierten Bilder.' : 'Bilder links markieren, um Kategorie und Kommentar gesammelt zu setzen.'}</p>
      <div class="field"><label for="imgBulkCategory">Kategorie</label>
        <select class="select input-sm" id="imgBulkCategory">${CATEGORIES.map((cat) => `<option value="${A.esc(cat.id)}" ${cat.id === sample.category ? 'selected' : ''}>${A.esc(cat.label)}</option>`).join('')}</select>
      </div>
      <div class="field"><label for="imgBulkSubcategory">Unterkategorie</label>
        <select class="select input-sm" id="imgBulkSubcategory">${(category?.subcats || []).map((sub) => `<option ${sub === sample.subcategory ? 'selected' : ''}>${A.esc(sub)}</option>`).join('')}</select>
      </div>
      <div class="field"><label for="imgBulkComment">Kommentar</label>
        <input class="input input-sm" id="imgBulkComment" value="${A.esc(sample.comment || '')}" placeholder="z. B. Überspannungsschutz Typ 1+2">
      </div>
      <div class="flex gap-8 mt-8">
        <button class="btn btn-primary btn-sm grow" data-act="img-apply-bulk" ${selected.length ? '' : 'disabled'}>Auf Auswahl anwenden</button>
        <button class="btn btn-secondary btn-sm" data-act="img-clear-selection" ${selected.length ? '' : 'disabled'}>Auswahl aufheben</button>
      </div>
      <div id="imgBulkPreview">${bulkPreviewHTML()}</div>
      <div class="settings-note" style="margin-top:10px">Zielordner: <span class="mono">unkomprimiert/</span> und <span class="mono">komprimiert/</span>. Die Vorschau folgt der Auswahl und den Eingaben.</div>
    </aside>`;
  }

  function summary() {
    const items = ui.images;
    const sharp = items.filter((item) => sharpnessTag(item).label === 'Scharf').length;
    const borderline = items.filter((item) => sharpnessTag(item).label === 'Grenzwertig').length;
    const blurry = items.filter((item) => sharpnessTag(item).label === 'Unscharf').length;
    return `<div class="pipeline-summary" id="imageSummary">
      <div class="summary-cell"><div class="sum">${items.length}</div><div class="lbl">Bilder im Batch</div></div>
      <div class="summary-cell"><div class="sum" style="color:var(--support-success)">${sharp}</div><div class="lbl">Scharf</div></div>
      <div class="summary-cell"><div class="sum" style="color:var(--support-warning)">${borderline}</div><div class="lbl">Grenzwertig</div></div>
      <div class="summary-cell"><div class="sum" style="color:var(--support-error)">${blurry}</div><div class="lbl">Unscharf</div></div>
    </div>`;
  }

  function render() {
    const items = ui.images;
    const currentSite = A.getSite(state.siteId);
    const selected = selectedItems();
    return `<div class="page-head">
      <div class="page-head-copy">
        <div class="eyebrow">Bildertool <span class="tag tag-neutral">Staging · Demo</span></div>
        <h1>Bild-Pipeline</h1>
        <p class="page-sub">EXIF-GPS-Zuordnung, Schärfebewertung, Vektor-Kategorisierung und optionales OCR. ${currentSite ? `Aktueller Standort: ${A.esc(currentSite.nummer)} ${A.esc(currentSite.name)}.` : 'Ohne GPS-Match wird der globale Standortkontext verwendet.'}</p>
      </div>
      <div class="head-actions">
        <button class="btn btn-secondary btn-sm" data-act="img-load-demo">${A.icon('spark')} Demo laden</button>
        <button class="btn btn-secondary btn-sm" data-act="img-sync-folder">${A.icon('download')} In Ordner sichern</button>
        <button class="btn btn-primary btn-sm" data-act="img-export-zip" ${items.length ? '' : 'disabled'}>${A.icon('download')} ZIP exportieren</button>
      </div>
    </div>

    <div class="info-strip">${A.icon('info', 16)}<div><strong>Prototyp-Pipeline:</strong> EXIF/GPS und Schärfe werden real berechnet (wenn Bibliothek/Browser es unterstützen). Die Vektorklassifizierung ist regelbasiert und als Demo gekennzeichnet. OCR lädt Tesseract.js optional aus dem Netz; Demo-Bilder enthalten simulierte Zählerstände.</div></div>

    <div class="dropzone" id="imageDropzone">
      <div style="color:var(--text-3)">${A.icon('upload', 24)}</div>
      <h3>Bilder hierher ziehen</h3>
      <p>JPEG, PNG oder WebP · Smartphone, Kamera oder Drohne · EXIF-GPS wird automatisch ausgewertet</p>
      <p class="small muted">HEIC/HEIF folgt in Phase 3. Maximal 20 Dateien pro Batch.</p>
      <input type="file" id="imageFileInput" class="sr-only" multiple accept="image/jpeg,image/png,image/webp">
      <button class="btn btn-secondary btn-sm" data-act="img-pick-files">Dateien auswählen</button>
    </div>

    ${summary()}

    <div class="image-batch">
      <div>
        <div class="flex between center mb-8">
          <div class="flex gap-8 center"><strong>Batch</strong><span class="tag tag-neutral">${items.length} Bilder</span>${items.length ? `<span class="tag tag-yellow">Demo-Modus</span>` : ''}</div>
          <label class="check small"><input type="checkbox" id="imgSelectAll" ${items.length && selected.length === items.length ? 'checked' : ''}> Alle auswählen</label>
        </div>
        <div class="image-grid" id="imageGrid">${renderGrid(items)}</div>
        <div class="folder-preview mt-8">Template: ${A.esc(A.getSetting('images.folder'))}</div>
      </div>
      ${renderBatchSide()}
    </div>`;
  }

  /* ------------------------------------------------------------- Ingest --- */
  async function addFiles(fileList) {
    const files = [...fileList].filter((file) => {
      if (/\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type)) {
        A.toast(`${file.name}: HEIC/HEIF wird in Phase 3 unterstützt.`, 'warning');
        return false;
      }
      return file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
    }).slice(0, 20);
    if (!files.length) { A.toast('Keine unterstützten Bilddateien gefunden.', 'warning'); return; }
    A.toast(`${files.length} Bild${files.length === 1 ? '' : 'er'} werden verarbeitet …`, 'info');
    for (const file of files) {
      const item = {
        id: 'img-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        originalName: file.name, file, url: URL.createObjectURL(file),
        originalSize: file.size, compressedBlob: null, compressedSize: 0,
        width: 0, height: 0, siteId: null, matchedDistance: null, matchSource: '',
        coordinates: null, camera: '', date: A.isoDate(new Date(file.lastModified || Date.now())),
        altitude: null, drone: false, sharpness: 0, category: 'Kabine', subcategory: 'Sendersaal',
        confidence: 0, ocr: '', comment: '', status: 'processing', demo: false, ocrStatus: 'idle'
      };
      ui.images.push(item);
      A.render();
      try {
        await processFile(item);
      } catch (error) {
        console.error(error);
        item.status = 'error';
        A.toast(`${file.name}: Verarbeitung fehlgeschlagen.`, 'error');
      }
    }
    A.render();
    A.toast('Bildverarbeitung abgeschlossen.', 'success');
  }

  async function processFile(item) {
    item.status = 'processing';
    let exif = null;
    if (window.exifr) {
      try {
        exif = await exifr.parse(item.file, { gps: true, exif: true, ifd0: true, xmp: true }).catch(() => null);
      } catch { exif = null; }
    }
    const image = await loadImage(item.file);
    item.width = image.naturalWidth || image.width;
    item.height = image.naturalHeight || image.height;
    if (exif) {
      const lat = typeof exif.latitude === 'number' ? exif.latitude : null;
      const lon = typeof exif.longitude === 'number' ? exif.longitude : null;
      if (lat !== null && lon !== null) {
        item.coordinates = { lat, lon };
        const nearest = findNearestSite(lat, lon);
        if (nearest) {
          item.siteId = nearest.site.nummer;
          item.matchedDistance = nearest.distance;
          item.matchSource = 'EXIF-GPS';
        }
      }
      item.camera = [exif.Make, exif.Model].filter(Boolean).join(' ').trim();
      item.altitude = numberOrNull(exif.GPSAltitude) ?? numberOrNull(exif.RelativeAltitude) ?? numberOrNull(exif.AbsoluteAltitude);
      if (exif.DateTimeOriginal instanceof Date) item.date = A.isoDate(exif.DateTimeOriginal);
      item.drone = /dji|mavic|phantom|inspire|air \d|mini \d/i.test(item.camera) || (exif.RelativeAltitude != null && Number(exif.RelativeAltitude) > 0);
    }
    if (!item.siteId && state.siteId) {
      item.siteId = state.siteId;
      item.matchSource = 'Standortkontext';
    }
    const features = imageFeatures(image);
    item.sharpness = laplacianVariance(image);
    const classified = classify(features, item, item.originalName);
    item.category = classified.category;
    item.subcategory = classified.subcategory;
    item.confidence = classified.confidence;
    const compressed = await compressImage(image);
    item.compressedBlob = compressed;
    item.compressedSize = compressed.size;
    item.status = 'ready';
  }

  function numberOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht geladen werden')); };
      image.src = url;
    });
  }

  function findNearestSite(lat, lon) {
    let best = null;
    for (const site of A.getSites()) {
      if (site.lat == null || site.lon == null) continue;
      const distance = haversine(lat, lon, site.lat, site.lon);
      if (!best || distance < best.distance) best = { site, distance };
    }
    if (!best) return null;
    return best.distance <= 2.0 ? best : null;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function imageFeatures(image) {
    const size = 320;
    const scale = Math.min(1, size / Math.max(image.width, image.height));
    const w = Math.max(1, Math.round(image.width * scale));
    const h = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let brightness = 0, saturation = 0, green = 0, sky = 0, edges = 0;
    const total = w * h;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const index = (y * w + x) * 4;
        const r = data[index], g = data[index + 1], b = data[index + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        brightness += lum;
        saturation += max === 0 ? 0 : (max - min) / max;
        if (g > r * 1.12 && g > b * 1.12) green += 1;
        if (y < h / 3 && b > r * 1.08 && lum > 115) sky += 1;
        if (x > 0 && y > 0) {
          const left = (y * w + (x - 1)) * 4;
          const top = ((y - 1) * w + x) * 4;
          edges += Math.abs(lum - (0.299 * data[left] + 0.587 * data[left + 1] + 0.114 * data[left + 2])) > 26 ? 1 : 0;
          edges += Math.abs(lum - (0.299 * data[top] + 0.587 * data[top + 1] + 0.114 * data[top + 2])) > 26 ? 1 : 0;
        }
      }
    }
    return {
      brightness: brightness / total,
      saturation: saturation / total,
      greenRatio: green / total,
      skyRatio: sky / Math.max(1, w * (h / 3)),
      edgeDensity: edges / (total * 2),
      aspect: image.width / image.height
    };
  }

  function laplacianVariance(image) {
    const maxSide = 640;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const w = Math.max(1, Math.round(image.width * scale));
    const h = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i += 1) {
      gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    let sum = 0, sumSq = 0, count = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = y * w + x;
        const value = -4 * gray[i] + gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w];
        sum += value; sumSq += value * value; count += 1;
      }
    }
    const mean = sum / count;
    return Math.max(0, (sumSq / count) - mean * mean);
  }

  function classify(features, item, name) {
    const scores = {
      Mast: (item.drone ? 55 : 0) + features.skyRatio * 55 + (features.aspect < 0.9 ? 8 : 0),
      Kabine: (features.brightness < 105 ? 28 : 6) + (features.edgeDensity > 0.05 ? 12 : 0) + (features.saturation < 0.3 ? 8 : 0),
      Energietechnik: (features.edgeDensity > 0.1 ? 38 : 10) + (features.saturation > 0.22 ? 18 : 0) + (features.brightness < 150 ? 8 : 0),
      Grundstück: features.greenRatio * 90 + (features.brightness > 120 ? 5 : 0),
      Zufahrt: (features.aspect > 1.35 ? 16 : 0) + (features.greenRatio > 0.2 ? 10 : 0) + (features.edgeDensity < 0.12 ? 12 : 0)
    };
    if (item.drone) scores.Mast += 20;
    if (/mast|antenn|turm/i.test(name)) scores.Mast += 40;
    if (/zähler|zaehler|nshv|schrank|verteiler/i.test(name)) scores.Energietechnik += 40;
    if (/tor|zufahrt|weg/i.test(name)) scores.Zufahrt += 30;
    if (/kabine|saal|keller/i.test(name)) scores.Kabine += 25;
    const category = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    const config = CATEGORIES.find((cat) => cat.id === category) || CATEGORIES[0];
    const subcats = config.subcats;
    let subcategory = subcats[0] || 'Allgemein';
    if (category === 'Mast') subcategory = item.drone ? 'Antennen' : (features.brightness > 135 ? 'Steigweg' : 'Pardunen');
    else if (category === 'Kabine') subcategory = features.brightness < 90 ? 'Keller' : 'Sendersaal';
    else if (category === 'Energietechnik') subcategory = features.edgeDensity > 0.16 ? 'NSHV' : 'Zähler';
    else if (category === 'Grundstück') subcategory = features.greenRatio > 0.35 ? 'Begrünung' : 'Zaun';
    else if (category === 'Zufahrt') subcategory = 'Zufahrt';
    if (!subcats.includes(subcategory)) subcategory = subcats[0] || 'Allgemein';
    return { category, subcategory, confidence: Math.round(62 + Math.min(30, Math.abs(scores[category]) / 3)) };
  }

  async function compressImage(image) {
    const quality = Math.max(0.3, Math.min(0.95, Number(A.getSetting('images.quality', 80)) / 100));
    const maxSide = 2560;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const w = Math.round(image.width * scale);
    const h = Math.round(image.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0, w, h);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || new Blob([], { type: 'image/jpeg' })), 'image/jpeg', quality);
    });
  }

  /* ------------------------------------------------------------- OCR ------ */
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const script = document.createElement('script');
      script.src = src; script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Script konnte nicht geladen werden'));
      document.head.appendChild(script);
    });
  }

  async function runOCR(item) {
    if (!A.getSetting('images.ocr', true)) { A.toast('OCR ist in den Einstellungen deaktiviert.', 'warning'); return; }
    if (item.demo) { A.toast('Demo-Bild: OCR-Wert ist bereits simuliert. Bei echten Bildern wird Tesseract.js verwendet.', 'info'); return; }
    item.ocrStatus = 'running';
    A.render();
    try {
      await loadScriptOnce('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
      if (!window.Tesseract) throw new Error('Tesseract nicht verfügbar');
      const worker = await Tesseract.createWorker('deu');
      const { data } = await worker.recognize(item.file);
      await worker.terminate();
      const text = String(data?.text || '');
      const match = text.match(/(?:\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d+)?|\d{4,}(?:[.,]\d+)?)\s*(?:kWh|kwh)?/);
      item.ocr = match ? match[0].replace(/\s+/g, '').replace(/kWh|kwh/i, '').trim() : '';
      item.ocrStatus = 'done';
      A.toast(item.ocr ? `OCR erkannt: ${item.ocr}` : 'OCR hat keinen Zählerstand erkannt.', item.ocr ? 'success' : 'warning');
    } catch (error) {
      console.error(error);
      item.ocrStatus = 'error';
      A.toast('OCR nicht verfügbar. Bitte Wert manuell erfassen.', 'error');
    }
    A.render();
  }

  /* ------------------------------------------------------------- Export --- */
  function entryDate(item) {
    return item.date ? new Date(item.date + 'T12:00:00') : new Date();
  }

  async function buildEntries() {
    const used = new Set();
    const entries = [];
    for (const item of ui.images) {
      if (item.status !== 'ready' || !item.file) continue;
      const folder = folderFor(item);
      const fileName = fileNameFor(item);
      const originalExt = (item.originalName.match(/\.[a-z0-9]+$/i) || ['.jpg'])[0].toLowerCase();
      const originalName = fileName.replace(/\.jpg$/i, originalExt);
      const paths = [
        { path: `unkomprimiert/${folder}/${originalName}`, data: item.file },
        { path: `komprimiert/${folder}/${fileName}`, data: item.compressedBlob || item.file }
      ];
      for (const entry of paths) {
        let path = entry.path;
        let counter = 2;
        while (used.has(path)) {
          path = entry.path.replace(/(\.[a-z0-9]+)$/i, `-${counter}$1`);
          counter += 1;
        }
        used.add(path);
        const buffer = await entry.data.arrayBuffer();
        entries.push({ path, data: new Uint8Array(buffer), date: entryDate(item) });
      }
    }
    return entries;
  }

  async function exportZip() {
    const items = ui.images.filter((item) => item.status === 'ready' && item.file);
    if (!items.length) { A.toast('Keine exportierbaren Bilder.', 'warning'); return; }
    A.toast('ZIP wird erstellt …', 'info');
    try {
      const entries = await buildEntries();
      const zip = makeZip(entries);
      A.download(`SWR_Bilder_${A.isoDate()}.zip`, zip, 'application/zip');
      A.toast(`${items.length} Bilder (unkomprimiert + komprimiert) exportiert.`, 'success');
    } catch (error) {
      console.error(error);
      A.toast('ZIP-Export fehlgeschlagen.', 'error');
    }
  }

  async function syncFolder() {
    if (!window.showDirectoryPicker) {
      A.toast('Dieser Browser unterstützt keine Ordnersynchronisation. Bitte ZIP-Export verwenden.', 'warning');
      return;
    }
    const items = ui.images.filter((item) => item.status === 'ready' && item.file);
    if (!items.length) { A.toast('Keine exportierbaren Bilder.', 'warning'); return; }
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      const entries = await buildEntries();
      for (const entry of entries) {
        const parts = entry.path.split('/');
        let dir = root;
        for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create: true });
        const handle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
        const writable = await handle.createWritable();
        await writable.write(entry.data);
        await writable.close();
      }
      A.toast(`${items.length} Bilder in den Zielordner geschrieben.`, 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error(error);
        A.toast('Ordnersynchronisation abgebrochen oder nicht erlaubt.', 'error');
      }
    }
  }

  /* ------------------------------------------------------------- ZIP ------ */
  function crc32(bytes) {
    if (!crc32.table) {
      crc32.table = new Uint32Array(256);
      for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc32.table[n] = c >>> 0;
      }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) crc = crc32.table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function dosDateTime(date) {
    const d = new Date(date);
    const year = Math.max(1980, d.getFullYear());
    const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const day = ((year - 1980) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
    return { time, date: day };
  }

  function makeZip(entries) {
    const encoder = new TextEncoder();
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const entry of entries) {
      const name = encoder.encode(entry.path);
      const crc = crc32(entry.data);
      const { time, date } = dosDateTime(entry.date);
      const size = entry.data.length;
      const local = new Uint8Array(30 + name.length);
      const view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, time, true);
      view.setUint16(12, date, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, size, true);
      view.setUint32(22, size, true);
      view.setUint16(26, name.length, true);
      view.setUint16(28, 0, true);
      local.set(name, 30);
      chunks.push(local, entry.data);
      const centralHeader = new Uint8Array(46 + name.length);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, time, true);
      cv.setUint16(14, date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, name.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      centralHeader.set(name, 46);
      central.push(centralHeader);
      offset += local.length + size;
    }
    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);
    return new Blob([...chunks, ...central, end], { type: 'application/zip' });
  }

  /* ------------------------------------------------------------- Events --- */
  function loadDemo() {
    for (const item of ui.images) {
      if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    }
    ui.images = [];
    ui.imagesSelected.clear();
    seedDemos();
    A.render();
    A.toast('Demo-Bilder geladen.', 'info');
  }

  function refreshGrid() {
    const grid = document.getElementById('imageGrid');
    if (grid) grid.innerHTML = renderGrid(ui.images);
    const summaryEl = document.getElementById('imageSummary');
    if (summaryEl) summaryEl.outerHTML = summary();
    updateSelectionUI();
  }

  function updateSelectionUI() {
    const selected = selectedItems();
    document.querySelectorAll('[data-img-card]').forEach((card) => {
      card.classList.toggle('is-selected', ui.imagesSelected.has(card.dataset.imgCard));
    });
    const count = document.getElementById('imgSelectedCount');
    if (count) count.textContent = `${selected.length} gewählt`;
    const applyBtn = document.querySelector('[data-act="img-apply-bulk"]');
    if (applyBtn) applyBtn.disabled = selected.length === 0;
    const clearBtn = document.querySelector('[data-act="img-clear-selection"]');
    if (clearBtn) clearBtn.disabled = selected.length === 0;
    const all = document.getElementById('imgSelectAll');
    if (all) {
      all.checked = ui.images.length > 0 && selected.length === ui.images.length;
      all.indeterminate = selected.length > 0 && selected.length < ui.images.length;
    }
    const preview = document.getElementById('imgBulkPreview');
    if (preview) preview.outerHTML = bulkPreviewHTML();
  }

  function applyBulk() {
    const items = selectedItems();
    if (!items.length) { A.toast('Bitte zuerst Bilder markieren.', 'warning'); return; }
    const category = document.getElementById('imgBulkCategory')?.value;
    const subcategory = document.getElementById('imgBulkSubcategory')?.value;
    const comment = document.getElementById('imgBulkComment')?.value || '';
    if (!category || !subcategory) return;
    for (const item of items) {
      item.category = category;
      item.subcategory = subcategory;
      item.comment = comment;
      item.confidence = 100;
    }
    A.save();
    refreshGrid();
    A.toast(`${items.length} Bild${items.length === 1 ? '' : 'er'} aktualisiert.`, 'success');
  }

  function removeItem(itemId) {
    const index = ui.images.findIndex((item) => item.id === itemId);
    if (index < 0) return;
    const item = ui.images[index];
    if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
    ui.images.splice(index, 1);
    ui.imagesSelected.delete(itemId);
    refreshGrid();
    const side = document.querySelector('.image-batch-side');
    if (side) side.outerHTML = renderBatchSide();
    A.updateShell();
  }

  function pickFiles() {
    document.getElementById('imageFileInput')?.click();
  }

  function mount() {
    const dropzone = document.getElementById('imageDropzone');
    const input = document.getElementById('imageFileInput');
    if (!dropzone || !input) return;
    const selectAll = document.getElementById('imgSelectAll');
    if (selectAll) selectAll.indeterminate = ui.imagesSelected.size > 0 && ui.imagesSelected.size < ui.images.length;
    document.getElementById('imageGrid')?.addEventListener('click', (event) => {
      if (event.target.closest('input, button, label')) return;
      const card = event.target.closest('[data-img-card]');
      if (!card) return;
      const id = card.dataset.imgCard;
      if (ui.imagesSelected.has(id)) ui.imagesSelected.delete(id);
      else ui.imagesSelected.add(id);
      const checkbox = card.querySelector('[data-img-select]');
      if (checkbox) checkbox.checked = ui.imagesSelected.has(id);
      updateSelectionUI();
    });
    input.addEventListener('change', () => {
      if (input.files?.length) addFiles(input.files);
      input.value = '';
    });
    dropzone.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      input.click();
    });
    dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropzone.classList.add('is-over');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-over'));
    dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-over');
      if (event.dataTransfer?.files?.length) addFiles(event.dataTransfer.files);
    });
  }

  function settings() {
    const previewItem = ui.images[0] || { siteId: state.siteId, category: 'Mast', subcategory: 'Antennen', date: A.isoDate(), comment: '' };
    return `
      <div class="setting-block">
        <h4>Unschärfe-Schwellwert (Laplace)</h4>
        <p>Bestimmt die Grenze zwischen Grenzwertig und Unscharf.</p>
        ${A.rangeControl('images.sharpness', A.getSetting('images.sharpness', 120), 40, 400, 5, '')}
      </div>
      <div class="setting-block">
        <h4>Komprimierungsqualität</h4>
        <p>JPEG-Qualität für den komprimierten Export.</p>
        ${A.rangeControl('images.quality', A.getSetting('images.quality', 80), 40, 100, 5, '%')}
      </div>
      <div class="setting-block">
        <div class="setting-inline">
          <div><h4 style="margin:0">OCR aktiviert</h4><p style="margin:2px 0 0">Tesseract.js nur auf Klick laden.</p></div>
          <label class="switch"><input type="checkbox" data-setting="images.ocr" data-rerender="false" ${A.getSetting('images.ocr', true) ? 'checked' : ''}><span></span></label>
        </div>
      </div>
      <div class="setting-block">
        <h4>Zielordner-Template</h4>
        <p>Platzhalter: &lt;Standortnr&gt; &lt;Kuerzel&gt; &lt;Jahr&gt; &lt;Kategorie&gt; &lt;Unterkategorie&gt;</p>
        <input class="input input-sm mono" data-setting="images.folder" data-rerender="true" value="${A.esc(A.getSetting('images.folder'))}">
        <div class="folder-preview mt-8">${A.esc(folderFor(previewItem))}/<br><strong>${A.esc(fileNameFor(previewItem))}</strong></div>
      </div>
      <div class="settings-note">Schwellwerte wirken sofort auf die Kennzeichnung im Batch. Die Schärfeberechnung und EXIF-Auswertung laufen ausschließlich lokal im Browser.</div>`;
  }

  A.registerModule('images', { label: 'Bildertool', icon: 'image', render, mount, settings });

  A.registerAction('img-pick-files', pickFiles);
  A.registerAction('img-load-demo', loadDemo);
  A.registerAction('img-remove', (el) => removeItem(el.dataset.id));
  A.registerAction('img-export-zip', exportZip);
  A.registerAction('img-sync-folder', syncFolder);
  A.registerAction('img-apply-bulk', applyBulk);
  A.registerAction('img-clear-selection', () => { ui.imagesSelected.clear(); updateSelectionUI(); });
  A.registerAction('img-ocr-run', (el) => { const item = ui.images.find((entry) => entry.id === el.dataset.id); if (item) runOCR(item); });
  A.registerAction('img-copy-path', (el) => {
    const item = ui.images.find((entry) => entry.id === el.dataset.id);
    if (item) A.copyText(bulkPaths(item).packed);
  });

  A.onChange('[data-img-select]', (el) => {
    if (el.checked) ui.imagesSelected.add(el.dataset.imgSelect);
    else ui.imagesSelected.delete(el.dataset.imgSelect);
    updateSelectionUI();
  });

  A.onChange('#imgSelectAll', (el) => {
    ui.imagesSelected.clear();
    if (el.checked) for (const item of ui.images) ui.imagesSelected.add(item.id);
    updateSelectionUI();
  });

  A.onChange('#imgBulkCategory', (el) => {
    const category = CATEGORIES.find((cat) => cat.id === el.value) || CATEGORIES[0];
    const sub = document.getElementById('imgBulkSubcategory');
    if (sub) sub.innerHTML = (category?.subcats || []).map((name) => `<option>${A.esc(name)}</option>`).join('');
    const preview = document.getElementById('imgBulkPreview');
    if (preview) preview.outerHTML = bulkPreviewHTML();
  });

  A.onChange('#imgBulkSubcategory', () => {
    const preview = document.getElementById('imgBulkPreview');
    if (preview) preview.outerHTML = bulkPreviewHTML();
  });

  A.onInput('#imgBulkComment', () => {
    const preview = document.getElementById('imgBulkPreview');
    if (preview) preview.outerHTML = bulkPreviewHTML();
  });
})();
