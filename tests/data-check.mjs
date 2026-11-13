/**
 * Daten- und Strukturcheck für den Prototyp.
 * Aufruf: npm run check
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: 'data.js' });
const D = sandbox.window.SWR_DATA;

assert.ok(D && typeof D === 'object', 'SWR_DATA fehlt');
assert.ok(D.sites.length >= 380, 'Standortdaten unvollständig');
assert.ok(D.maintenance.length >= 100, 'Wartungsdaten unvollständig');
assert.ok(D.outages.length >= 10, 'Abschaltungsdaten unvollständig');
assert.ok(D.templates.length >= 3, 'Protokollvorlagen fehlen');

const userIds = new Set(D.users.map((user) => user.id));
const siteIds = new Set(D.sites.map((site) => site.nummer));
const kuerzelSet = new Set(D.sites.map((site) => site.kuerzel).filter(Boolean));
assert.equal(siteIds.size, D.sites.length, 'Standortnummern nicht eindeutig');
assert.equal(kuerzelSet.size, D.sites.filter((site) => site.kuerzel).length, 'Standortkürzel nicht eindeutig');
assert.equal(userIds.size, D.users.length, 'Benutzer-IDs nicht eindeutig');

for (const site of D.sites) {
  assert.ok(site.nummer && site.name, `Standort unvollständig: ${site.nummer}`);
  if (site.incomplete) {
    assert.ok(!site.kuerzel, `Unvollständiger Standort hat Kürzel: ${site.nummer}`);
  } else {
    assert.ok(site.kuerzel, `Standortkürzel fehlt: ${site.nummer}`);
    assert.ok(Array.isArray(site.services) && site.services.length > 0, `Keine Dienste: ${site.nummer}`);
    assert.ok(site.paten1 && site.paten2 && site.patenIfs, `Paten fehlen: ${site.nummer}`);
    assert.ok(userIds.has(site.paten1) && userIds.has(site.paten2) && userIds.has(site.patenIfs), `Pate verweist auf unbekannten User: ${site.nummer}`);
  }
  if (site.lat != null) assert.ok(site.lat >= -90 && site.lat <= 90, `Breitengrad ungültig: ${site.nummer}`);
  if (site.lon != null) assert.ok(site.lon >= -180 && site.lon <= 180, `Längengrad ungültig: ${site.nummer}`);
}

const maintenanceIds = new Set();
for (const task of D.maintenance) {
  assert.ok(!maintenanceIds.has(task.id), `Wartungs-ID doppelt: ${task.id}`);
  maintenanceIds.add(task.id);
  assert.ok(siteIds.has(task.siteId), `Wartung verweist auf unbekannten Standort: ${task.id}`);
  assert.match(task.due, /^\d{4}-\d{2}-\d{2}$/, `Fälligkeit ungültig: ${task.id}`);
  assert.ok(['OPEN', 'IN_PROGRESS', 'DONE'].includes(task.status), `Wartungsstatus ungültig: ${task.id}`);
}

const serviceValues = new Set(['UKW/FM', 'DAB+', 'DVB-T2 HD', 'Mobilfunk', 'Richtfunk', 'DBOS', 'LoRaWAN']);
const outageIds = new Set();
for (const event of D.outages) {
  assert.ok(!outageIds.has(event.id), `Abschaltungs-ID doppelt: ${event.id}`);
  outageIds.add(event.id);
  assert.ok(siteIds.has(event.siteId), `Abschaltung verweist auf unbekannten Standort: ${event.id}`);
  assert.ok(serviceValues.has(event.service), `Unbekannter Dienst: ${event.service}`);
  assert.ok(new Date(event.end) > new Date(event.start), `Zeitraum ungültig: ${event.id}`);
  if (event.maintenanceId) assert.ok(maintenanceIds.has(event.maintenanceId), `Verknüpfte Wartung fehlt: ${event.id}`);
}

const templateIds = new Set(D.templates.map((template) => template.id));
for (const template of D.templates) {
  const fieldKeys = new Set();
  for (const block of template.blocks) {
    for (const field of block.fields || []) {
      assert.ok(!fieldKeys.has(field.key), `Feld-Key doppelt in ${template.id}: ${field.key}`);
      fieldKeys.add(field.key);
    }
  }
}

for (const protocol of D.protocols) {
  assert.ok(siteIds.has(protocol.siteId), `Protokoll ohne Standort: ${protocol.id}`);
  assert.ok(templateIds.has(protocol.templateId), `Protokoll ohne Vorlage: ${protocol.id}`);
  assert.ok(['DRAFT', 'SUBMITTED'].includes(protocol.status), `Protokollstatus ungültig: ${protocol.id}`);
  if (protocol.status === 'SUBMITTED') {
    assert.ok(protocol.submittedAt && protocol.hash, `Abgeschlossenes Protokoll ohne Hash/Zeit: ${protocol.id}`);
  }
  const template = D.templates.find((entry) => entry.id === protocol.templateId);
  for (const block of template.blocks) {
    for (const field of block.fields || []) {
      assert.ok(Object.prototype.hasOwnProperty.call(protocol.data, field.key), `Messwert fehlt im Datensatz: ${protocol.id} / ${field.key}`);
    }
  }
}

for (const category of D.imageCategories) {
  assert.ok(category.id && Array.isArray(category.subcats), `Bildkategorie ungültig: ${category.id}`);
}

const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const file of ['app.js', 'styles.css', 'data.js', ...fs.readdirSync(path.join(ROOT, 'modules')).filter((name) => name.endsWith('.js')).map((name) => `modules/${name}`)]) {
  assert.ok(index.includes(file), `index.html lädt ${file} nicht`);
  assert.ok(fs.existsSync(path.join(ROOT, file)), `Datei fehlt: ${file}`);
}

console.log(`OK · ${D.sites.length} Standorte · ${D.maintenance.length} Wartungen · ${D.protocols.length} Protokolle · ${D.outages.length} Abschaltungen · ${D.users.length} Benutzer`);
