/**
 * Erzeugt data.js für den klickbaren Prototyp.
 * Quellen:
 *   dashboard/standorte.js          -> 381 Standorte
 *   wartungstool/wartungen2026.json -> 102 Wartungsaufgaben
 * Alle übrigen Felder sind bewusst Demo-Daten (klar im UI gekennzeichnet).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Die Portal-App liegt ggf. in einem Unterordner (z. B. swrtest); die
// Quell-Repositories können weiterhin eine Ebene darüber liegen.
const SOURCE_ROOT = fs.existsSync(path.join(ROOT, 'dashboard', 'standorte.js'))
  ? ROOT
  : path.resolve(ROOT, '..');
const dashboardSrc = fs.readFileSync(path.join(SOURCE_ROOT, 'dashboard', 'standorte.js'), 'utf8');
const rawSitesParsed = JSON.parse(dashboardSrc.match(/const\s+standorteDaten\s*=\s*(\[[\s\S]*\]);?\s*$/)[1]);
const seenNumbers = new Set();
const rawSites = rawSitesParsed.filter((site) => {
  if (seenNumbers.has(site.nummer)) {
    console.warn(`Doppelter Standort in dashboard/standorte.js ignoriert: ${site.nummer} (${site.name})`);
    return false;
  }
  seenNumbers.add(site.nummer);
  return true;
});
const wartungExport = JSON.parse(fs.readFileSync(path.join(SOURCE_ROOT, 'wartungstool', 'wartungen2026.json'), 'utf8'));

const hash = (value) => {
  let h = 2166136261;
  for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

const prettify = (value) => String(value)
  .toLowerCase()
  .replace(/(^|[-_ ])([a-zäöüß])/g, (_, pre, ch) => pre + ch.toUpperCase())
  .replace(/_/g, ' ');

const userName = (wartungName) => {
  const [last, first] = String(wartungName || '').split(',').map((part) => part.trim());
  return [first, last].filter(Boolean).join(' ') || wartungName;
};

const USERS = [
  {
    id: 'u-salwa', name: 'Christian Salwa', initials: 'CS', roleKey: 'TECHNICIAN',
    role: 'Techniker · EFK', roles: ['Techniker', 'EFK', 'Standortpate'],
    email: 'christian.salwa@swr.de', phone: '+49 711 929-4142', mobile: '+49 171 55 92 401',
    team: 'Technik Außeneinsatz · Bereich Stuttgart'
  },
  {
    id: 'u-bauer', name: 'Stefan Bauer', initials: 'SB', roleKey: 'TECHNICIAN',
    role: 'Techniker · Standortpate', roles: ['Techniker', 'Standortpate'],
    email: 'stefan.bauer@swr.de', phone: '+49 711 929-4188', mobile: '+49 172 60 18 773',
    team: 'Technik Außeneinsatz · Bereich Stuttgart'
  },
  {
    id: 'u-mueller', name: 'Thomas Müller', initials: 'TM', roleKey: 'TECHNICIAN',
    role: 'Techniker · IFS-Standortpate', roles: ['Techniker', 'IFS-Standortpate'],
    email: 'thomas.mueller@swr.de', phone: '+49 721 929-2301', mobile: '+49 160 74 33 908',
    team: 'IFS / Sicherheitstechnik'
  },
  {
    id: 'u-schmidt', name: 'Markus Schmidt', initials: 'MS', roleKey: 'TECHNICIAN',
    role: 'Techniker · Standortpate', roles: ['Techniker', 'Standortpate'],
    email: 'markus.schmidt@swr.de', phone: '+49 711 929-4170', mobile: '+49 151 22 06 315',
    team: 'Technik Außeneinsatz · Bereich Stuttgart'
  },
  {
    id: 'u-vogt', name: 'Sven Vogt', initials: 'SV', roleKey: 'VEFK',
    role: 'VEFK', roles: ['VEFK', 'Standortpate'],
    email: 'sven.vogt@swr.de', phone: '+49 711 929-4000', mobile: '+49 170 91 44 002',
    team: 'Verantwortliche Elektrofachkraft'
  },
  {
    id: 'u-admin', name: 'Administrator', initials: 'AD', roleKey: 'ADMIN',
    role: 'Admin', roles: ['Admin'],
    email: 'portal-admin@swr.de', phone: '+49 711 929-0', mobile: '',
    team: 'Portaladministration'
  }
];

const FEATURED = {
  '8400': {
    kuerzel: 'OBB', altNames: ['Oberböhringer Turm', 'Geislingen / Oberböhringen'],
    address: 'Oberböhringer Steige, 73312 Geislingen an der Steige',
    bauart: 'Gittertragwerk', towerHeight: 110, elevator: true,
    paten1: 'u-salwa', paten2: 'u-bauer', patenIfs: 'u-mueller',
    approach: 'Über die L1226 Richtung Oberböhringen, nach dem Ortsausgang links auf den Wirtschaftsweg. Tor 2 mit Schlüssel B (Standortordner). Bei Schnee ist der letzte Abschnitt nicht befahrbar; dann Fußweg über den Nordzugang.',
    services: [
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '89,8 MHz', channelBlock: '–', notes: 'Hauptsendefrequenz' },
      { serviceType: 'DAB+', operator: 'SWR', frequency: '201,072 MHz', channelBlock: '8D', notes: 'DAB+ Landesprogramm' },
      { serviceType: 'DVB-T2 HD', operator: 'SWR', frequency: '570 MHz', channelBlock: 'Kanal 33', notes: 'Gemeinschaftsantenne' },
      { serviceType: 'Mobilfunk', operator: 'Vodafone', frequency: '1.800 MHz', channelBlock: 'LTE / 5G NR', notes: 'Dachstandort' },
      { serviceType: 'Richtfunk', operator: 'Telekom', frequency: '23 GHz', channelBlock: '–', notes: 'Anbindung Regionalstudio' },
      { serviceType: 'LoRaWAN', operator: 'Netze BW', frequency: '868,1 MHz', channelBlock: '–', notes: 'Sensorik Energie' }
    ]
  },
  '8700': {
    kuerzel: 'FRA', altNames: ['Frauenkopf', 'Stuttgarter Fernmeldeturm'],
    address: 'Jahnstraße 120, 70597 Stuttgart',
    bauart: 'Stahlbeton', towerHeight: 192, elevator: true,
    paten1: 'u-salwa', paten2: 'u-schmidt', patenIfs: 'u-mueller',
    approach: 'Zufahrt über die Jahnstraße bis zum ausgewiesenen Besucherparkplatz. Schlüsselgewalt über die Leitwarte Stuttgart; Zutritt nur mit gültiger Unterweisung.',
    services: [
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '94,7 MHz', channelBlock: '–', notes: 'Hauptstandort' },
      { serviceType: 'DAB+', operator: 'SWR', frequency: '227,360 MHz', channelBlock: '12B', notes: 'Baden-Württemberg Nord' },
      { serviceType: 'DVB-T2 HD', operator: 'SWR', frequency: '650 MHz', channelBlock: 'Kanal 43', notes: '–' },
      { serviceType: 'Mobilfunk', operator: 'Telekom', frequency: '2.100 MHz', channelBlock: '5G NR', notes: 'Dachstandort' },
      { serviceType: 'Richtfunk', operator: 'SWR', frequency: '18 GHz', channelBlock: '–', notes: 'Studioanbindung' }
    ]
  },
  '8321': {
    kuerzel: 'LBG', altNames: ['Sender Langenburg'],
    address: 'Senderweg, 74595 Langenburg',
    bauart: 'Stahlbeton', towerHeight: 137, elevator: false,
    paten1: 'u-bauer', paten2: 'u-schmidt', patenIfs: 'u-vogt',
    approach: 'Über die K2648 Richtung Langenburg, Abzweig Senderweg. Zufahrt bis zum Mastfuß möglich; Schlüssel beim Bauhof Langenburg.',
    services: [
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '91,9 MHz', channelBlock: '–', notes: '–' },
      { serviceType: 'DAB+', operator: 'SWR', frequency: '183,648 MHz', channelBlock: '6C', notes: '–' },
      { serviceType: 'Richtfunk', operator: 'Telekom', frequency: '18 GHz', channelBlock: '–', notes: '–' }
    ]
  },
  '8100': {
    kuerzel: 'AAL', altNames: ['Aalen Braunenberg', 'Sender Aalen'],
    address: 'Braunenberg, 73430 Aalen',
    bauart: 'Gittertragwerk', towerHeight: 121, elevator: false,
    paten1: 'u-bauer', paten2: 'u-salwa', patenIfs: 'u-vogt',
    approach: 'Zufahrt über die Braunenbergstraße, letzter Abschnitt Forstweg. Bei Nässe nur mit Allrad; Schlüssel beim Technikstandort Aalen.',
    services: [
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '92,5 MHz', channelBlock: '–', notes: '–' },
      { serviceType: 'DAB+', operator: 'SWR', frequency: '208,064 MHz', channelBlock: '9D', notes: '–' },
      { serviceType: 'Mobilfunk', operator: 'Telekom', frequency: '800 MHz', channelBlock: 'LTE', notes: '–' }
    ]
  },
  '4000': {
    kuerzel: 'HGR', altNames: ['Hornisgrinde', 'Sender Hornisgrinde'],
    address: 'Hornisgrinde, 77889 Seebach',
    bauart: 'Stahlbeton', towerHeight: 206, elevator: true,
    paten1: 'u-bauer', paten2: 'u-mueller', patenIfs: 'u-vogt',
    approach: 'Über die Schwarzwaldhochstraße B500, Parkplatz Hornisgrinde, dann 15 Minuten Fußweg. Im Winter Zufahrt oft gesperrt; Ausrüstung für Schneelage erforderlich.',
    services: [
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '90,1 MHz', channelBlock: '–', notes: '–' },
      { serviceType: 'DAB+', operator: 'SWR', frequency: '178,352 MHz', channelBlock: '5C', notes: '–' },
      { serviceType: 'DVB-T2 HD', operator: 'SWR', frequency: '618 MHz', channelBlock: 'Kanal 39', notes: '–' },
      { serviceType: 'Mobilfunk', operator: 'Vodafone', frequency: '2.100 MHz', channelBlock: 'LTE', notes: '–' }
    ]
  },
  '1000': {
    kuerzel: 'KOB', altNames: ['Koblenz', 'Sender Koblenz'],
    address: 'Sendestraße, 56075 Koblenz',
    bauart: 'Stahlbeton', towerHeight: 102, elevator: false,
    paten1: 'u-mueller', paten2: 'u-vogt', patenIfs: 'u-vogt',
    approach: 'Zufahrt über die Sendestraße, Tor 1. Schlüssel beim Pförtner; bitte 24 Stunden vorher anmelden.',
    services: [
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '101,5 MHz', channelBlock: '–', notes: '–' },
      { serviceType: 'DAB+', operator: 'SWR', frequency: '201,072 MHz', channelBlock: '8D', notes: '–' },
      { serviceType: 'Richtfunk', operator: 'Telekom', frequency: '18 GHz', channelBlock: '–', notes: '–' }
    ]
  },
  '9500': {
    kuerzel: 'LBR', altNames: ['Langenbrand', 'Sender Langenbrand'],
    address: 'Langenbrand, 75339 Höfen an der Enz',
    bauart: 'Gittertragwerk', towerHeight: 128, elevator: false,
    paten1: 'u-schmidt', paten2: 'u-salwa', patenIfs: 'u-vogt',
    approach: 'Von der B294 Richtung Langenbrand, Abzweig Sender. Zufahrt über den Forstweg; Tor mit Zahlencode (siehe Standortordner).',
    services: [
      { serviceType: 'DAB+', operator: 'SWR', frequency: '187,072 MHz', channelBlock: '6D', notes: '–' },
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '98,4 MHz', channelBlock: '–', notes: '–' },
      { serviceType: 'Richtfunk', operator: 'SWR', frequency: '23 GHz', channelBlock: '–', notes: '–' }
    ]
  },
  '8000': {
    kuerzel: 'SDG', altNames: ['Stuttgart-Degerloch', 'Degerloch'],
    address: 'Jahnstraße 120, 70597 Stuttgart',
    bauart: 'Stahlbeton', towerHeight: 78, elevator: true,
    paten1: 'u-salwa', paten2: 'u-bauer', patenIfs: 'u-mueller',
    approach: 'Zufahrt über die Jahnstraße, Parkplatz am Technikgebäude. Schlüssel über die Leitwarte.',
    services: [
      { serviceType: 'UKW/FM', operator: 'SWR', frequency: '99,6 MHz', channelBlock: '–', notes: '–' },
      { serviceType: 'DAB+', operator: 'SWR', frequency: '227,360 MHz', channelBlock: '12B', notes: '–' },
      { serviceType: 'Mobilfunk', operator: 'Telekom', frequency: '1.800 MHz', channelBlock: 'LTE', notes: '–' }
    ]
  }
};

const siteNamePrettified = Object.fromEntries(rawSites.map((s) => [s.nummer, prettify(s.name)]));

const sites = rawSites.map((raw) => {
  const num = raw.nummer;
  const name = siteNamePrettified[num];
  const feature = FEATURED[num];
  const regionMatch = raw.link?.match(/\d{4}_Bereich ([^/]+)/);
  const region = regionMatch ? regionMatch[1] : 'SWR';
  const complete = Boolean(feature);

  return {
    nummer: num,
    kuerzel: complete ? feature.kuerzel : null,
    name,
    rawName: raw.name,
    region,
    lat: raw.lat,
    lon: raw.lon,
    link: raw.link || '',
    folderLink: raw.link ? raw.link.split('/_standortinfo/')[0] : '',
    dataStatus: complete ? 'COMPLETE' : 'INCOMPLETE',
    incomplete: !complete,
    altNames: complete ? feature.altNames : [],
    address: complete ? feature.address : null,
    bauart: complete ? feature.bauart : null,
    towerHeight: complete ? feature.towerHeight : null,
    elevator: complete ? feature.elevator : null,
    paten1: complete ? feature.paten1 : null,
    paten2: complete ? feature.paten2 : null,
    patenIfs: complete ? feature.patenIfs : null,
    approach: complete ? feature.approach : null,
    services: complete ? feature.services : []
  };
});

const maintenance = wartungExport.records.map((record) => ({
  id: record.id,
  siteId: record.site.id,
  siteName: siteNamePrettified[record.site.id] || record.site.name,
  task: record.task.activity,
  dueStart: record.schedule.dueDateStart,
  due: record.schedule.dueDateEnd,
  assignee: userName(record.schedule.assignedTo),
  interval: record.task.intervalMonths
    ? `alle ${record.task.intervalMonths} Monate (${record.task.intervalType})`
    : '',
  status: record.execution.status === 'OPEN' ? 'OPEN' : 'DONE',
  completedAt: record.execution.completedAt || '',
  comment: record.task.maintenanceComment || ''
}));

// Zusätzliche Demo-Aufgaben im November 2026, damit die Kalenderansicht
// direkt rund um das heutige Datum etwas zeigt.
maintenance.push(
  { id: 'DEMO-8400-2026-11-NSV', siteId: '8400', siteName: siteNamePrettified['8400'], task: 'NSV, VDE-Messung · Wiedervorlage F3', dueStart: '2026-11-02', due: '2026-11-05', assignee: 'Christian Salwa', interval: 'Wiedervorlage', status: 'IN_PROGRESS', completedAt: '', comment: 'Isolationswert F3 prüfen, Dichtung erneuern.' },
  { id: 'DEMO-8700-2026-11-STEIG', siteId: '8700', siteName: siteNamePrettified['8700'], task: 'Steigschutz & PSAgA, Prüfung', dueStart: '2026-11-10', due: '2026-11-14', assignee: 'Markus Schmidt', interval: 'alle 12 Monate (fest)', status: 'OPEN', completedAt: '', comment: 'Läufer und Anschlagpunkte prüfen.' },
  { id: 'DEMO-8321-2026-11-DAB', siteId: '8321', siteName: siteNamePrettified['8321'], task: 'DAB+ Multiplexer, Sichtprüfung', dueStart: '2026-11-16', due: '2026-11-18', assignee: 'Stefan Bauer', interval: 'alle 12 Monate (variabel)', status: 'DONE', completedAt: '2026-11-10', comment: 'Prüfung vorzeitig abgeschlossen.' },
  { id: 'DEMO-8800-2026-11-USV', siteId: '8800', siteName: siteNamePrettified['8800'], task: 'USV Batterieanlage, Funktionsprüfung', dueStart: '2026-11-17', due: '2026-11-19', assignee: 'Christian Salwa', interval: 'alle 12 Monate (fest)', status: 'OPEN', completedAt: '', comment: 'Blockspannung dokumentieren.' },
  { id: 'DEMO-9500-2026-11-GRUND', siteId: '9500', siteName: siteNamePrettified['9500'], task: 'Grundstück, Pflege (selten)', dueStart: '2026-11-19', due: '2026-11-21', assignee: 'Markus Schmidt', interval: 'alle 12 Monate (variabel)', status: 'OPEN', completedAt: '', comment: 'Freischnitt Zufahrt.' },
  { id: 'DEMO-9000-2026-11-UKW', siteId: '9000', siteName: siteNamePrettified['9000'], task: 'UKW Antennenweiche, Dämpfungsmessung', dueStart: '2026-11-23', due: '2026-11-24', assignee: 'Thomas Müller', interval: 'alle 12 Monate (fest)', status: 'OPEN', completedAt: '', comment: '' },
  { id: 'DEMO-4000-2026-11-DVB', siteId: '4000', siteName: siteNamePrettified['4000'], task: 'DVB-T2 Jahresprüfung Sender', dueStart: '2026-11-26', due: '2026-11-27', assignee: 'Stefan Bauer', interval: 'alle 12 Monate (fest)', status: 'OPEN', completedAt: '', comment: 'Kühlung und Stromversorgung prüfen.' },
  { id: 'DEMO-8100-2026-12-GER', siteId: '8100', siteName: siteNamePrettified['8100'], task: 'DGUV V3 Geräteprüfung', dueStart: '2026-12-01', due: '2026-12-01', assignee: 'Christian Salwa', interval: 'alle 12 Monate (fest)', status: 'OPEN', completedAt: '', comment: '' }
);

const outages = [
  {
    id: 'OUT-2026-018', siteId: '8400', service: 'DVB-T2 HD', reason: 'Wartung',
    title: 'Senderwechsel DVB-T2 · Reservekette', start: '2026-11-12T06:00', end: '2026-11-12T14:00',
    description: 'Umschaltung auf die Reservekette zur turnusmäßigen Prüfung der Hauptsendekette. Kurzzeitige Unterbrechung im Umschaltfenster möglich.',
    impact: 'DVB-T2 HD: ca. 5–10 Minuten Ausfall, danach reduzierte Sendeleistung.',
    maintenanceId: 'TSK_8400_nsv_vde_messung_2026-12-31'
  },
  {
    id: 'OUT-2026-019', siteId: '8700', service: 'UKW/FM', reason: 'Umbau',
    title: 'Antennentausch UKW · Sektor Nord', start: '2026-11-11T08:00', end: '2026-11-11T18:00',
    description: 'Demontage und Montage der UKW-Antenne im Nordsektor. Arbeit unter laufendem Betrieb mit reduzierter Leistung.',
    impact: 'UKW/FM: eingeschränkte Versorgung im Nordsektor, Reservefrequenz aktiv.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-020', siteId: '8321', service: 'DAB+', reason: 'Wartung',
    title: 'DAB+ Multiplexer · Firmwareupdate', start: '2026-11-13T07:00', end: '2026-11-13T12:00',
    description: 'Update des Multiplexers und Neustart der DAB+-Kette.',
    impact: 'DAB+ 6C: unterbrochen, Umschaltung auf Nachbarstandort.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-021', siteId: '8800', service: 'Richtfunk', reason: 'Störung',
    title: 'Richtfunkstrecke Ulm–Stuttgart gestört', start: '2026-11-11T09:15', end: '2026-11-11T16:00',
    description: 'Dämpfungsanstieg auf der Richtfunkstrecke; Messtechnik vor Ort im Einsatz.',
    impact: 'Redundanz eingeschränkt, keine Auswirkung auf die Sendekette.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-022', siteId: '9000', service: 'Mobilfunk', reason: 'Netzumschaltung',
    title: 'Mobilfunk 5G · Netzumschaltung', start: '2026-11-17T22:00', end: '2026-11-18T05:00',
    description: 'Netzumschaltung im Rahmen des Betreiberausbaus.',
    impact: 'Mobilfunk: kurzzeitige Einschränkung, Notruf nicht betroffen.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-023', siteId: '4000', service: 'DVB-T2 HD', reason: 'Wartung',
    title: 'DVB-T2 · Jahreshauptprüfung Sender', start: '2026-11-20T05:00', end: '2026-11-20T15:00',
    description: 'Jahreshauptprüfung der Sendeanlage inklusive Kühlung und Stromversorgung.',
    impact: 'DVB-T2: ganztägige Reservefrequenz.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-024', siteId: '1000', service: 'UKW/FM', reason: 'Wartung',
    title: 'UKW · Prüfung Antennenweiche', start: '2026-11-24T06:00', end: '2026-11-24T10:00',
    description: 'Turnusprüfung der Antennenweiche und Dämpfungsmessung.',
    impact: 'UKW: kurze Unterbrechungen möglich.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-025', siteId: '9500', service: 'DAB+', reason: 'Umbau',
    title: 'DAB+ · Erweiterung Antennenträger', start: '2026-11-26T08:00', end: '2026-11-26T17:00',
    description: 'Montage zusätzlicher Antennensegmente für den Regelbetrieb.',
    impact: 'DAB+ 6D: reduzierte Leistung.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-026', siteId: '8100', service: 'Mobilfunk', reason: 'Störung',
    title: 'Mobilfunk · Störung an der Zuleitung', start: '2026-11-13T10:00', end: '2026-11-13T13:00',
    description: 'Fehlermeldung der Betreibertechnik; Prüfung der Stromzuleitung vor Ort.',
    impact: 'Mobilfunk: Standort auf Batteriepuffer, Einschränkung möglich.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-027', siteId: '8400', service: 'UKW/FM', reason: 'Wartung',
    title: 'UKW · Turnusprüfung Senderendstufe', start: '2026-12-02T06:00', end: '2026-12-02T12:00',
    description: 'Prüfung der Senderendstufe und Messung am Antennenausgang.',
    impact: 'UKW: kurze Umschaltung auf Reserve.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-028', siteId: '8700', service: 'DAB+', reason: 'Wartung',
    title: 'DAB+ · Jahresprüfung Kühlanlage', start: '2026-12-08T07:00', end: '2026-12-08T13:00',
    description: 'Wartung der Kühlanlage und Filterwechsel.',
    impact: 'DAB+ 12B: keine Unterbrechung, reduzierte Reserve.',
    maintenanceId: ''
  },
  {
    id: 'OUT-2026-017', siteId: '8321', service: 'DVB-T2 HD', reason: 'Störung',
    title: 'DVB-T2 · Störung behoben', start: '2026-11-10T04:30', end: '2026-11-10T07:15',
    description: 'Kurzzeitige Störung der DVB-T2-Kette, Ursache war ein defektes Netzteil.',
    impact: 'DVB-T2: Ausfall 04:30–07:15, Wiederherstellung erfolgt.',
    maintenanceId: ''
  }
];

const templateVde = {
  id: 'tpl-vde-nshv',
  name: 'VDE 0105-100 · NSHV',
  norm: 'DIN VDE 0105-100',
  version: '2026.1',
  description: 'Wiederholungsprüfung einer ortsfesten Niederspannungs-Hauptverteilung inklusive Schutzleiter-, Isolations- und RCD-Messung.',
  scope: 'Ortsfeste elektrische Anlagen',
  blocks: [
    { type: 'section', title: '1 · Prüfobjekt und Randbedingungen', text: 'Prüfobjekt: NSHV Sendertechnik. Die Prüfung erfolgt im spannungsfreien Zustand, soweit die Messaufgabe es erfordert. Alle Messgeräte sind kalibriert und innerhalb der Prüffrist.' },
    { type: 'visual', title: '2 · Lageplan / Einspeisung', caption: 'Prinzipskizze NSHV · Feld F1–F3 (Demo)', variant: 'single-line' },
    { type: 'checklist', title: '3 · Sicht- und Funktionsprüfung', fields: [
      { key: 'vde_sicht', label: 'Sichtprüfung ohne festgestellte Mängel' },
      { key: 'vde_beruehr', label: 'Berührschutz und Abdeckungen vollständig' },
      { key: 'vde_kennzeichnung', label: 'Kennzeichnung der Stromkreise eindeutig' },
      { key: 'vde_thermo', label: 'Thermografie ohne Auffälligkeiten' },
      { key: 'vde_unterlagen', label: 'Schaltpläne und Prüfbuch vor Ort vorhanden' }
    ] },
    { type: 'measurements', title: '4 · Messwerte', fields: [
      { key: 'nshv_f1_r_iso', label: 'Isolationswiderstand F1 · Sender FM', unit: 'MΩ', min: 1, required: true, hint: '≥ 1,0 MΩ' },
      { key: 'nshv_f1_z_s', label: 'Schleifenimpedanz F1 · Sender FM', unit: 'Ω', max: 0.4, required: true, hint: '≤ 0,40 Ω' },
      { key: 'nshv_f2_rcd_t', label: 'RCD-Auslösezeit F2 · USV-Bypass', unit: 'ms', max: 30, required: true, hint: '≤ 30 ms' },
      { key: 'nshv_f2_rcd_i', label: 'RCD-Auslösestrom F2 · USV-Bypass', unit: 'mA', max: 30, required: true, hint: '≤ 30 mA' },
      { key: 'nshv_f3_r_iso', label: 'Isolationswiderstand F3 · Außenbeleuchtung', unit: 'MΩ', min: 1, required: true, hint: '≥ 1,0 MΩ' },
      { key: 'erdung_mastfuss_r_e', label: 'Erdungswiderstand Mastfuß', unit: 'Ω', max: 10, required: true, hint: '≤ 10 Ω' }
    ] },
    { type: 'text', title: '5 · Festgestellte Mängel / Bemerkungen', key: 'vde_notes', label: 'Bemerkungen', placeholder: 'Mängel, Maßnahmen, Fristen …' },
    { type: 'signature', title: '6 · Prüfer / Freigabe' }
  ]
};

const templateLeiter = {
  id: 'tpl-dguv-leiter',
  name: 'DGUV V3 · Leiter & Steigschutz',
  norm: 'DGUV Vorschrift 1 / DIN EN 131',
  version: '2026.1',
  description: 'Jährliche Prüfung von Leitern, Steigschutzschienen und persönlicher Schutzausrüstung gegen Absturz.',
  scope: 'Leiterprüfung / Steigschutz',
  blocks: [
    { type: 'section', title: '1 · Prüfobjekt', text: 'Steigweg am Antennenträger Nord. Prüfung durch befähigte Person; PSAgA und Läufer werden vor der Befahrung visuell und funktional geprüft.' },
    { type: 'visual', title: '2 · Steigweg / Anschlagpunkte', caption: 'Prinzipskizze Steigschutz (Demo)', variant: 'climb' },
    { type: 'checklist', title: '3 · Sichtprüfung', fields: [
      { key: 'leiter_befestigung', label: 'Steigschutzschiene sicher befestigt' },
      { key: 'leiter_sprossen', label: 'Sprossen und Holme unbeschädigt' },
      { key: 'leiter_laeufer', label: 'Läufer funktionsfähig, Sicherung intakt' },
      { key: 'leiter_psaga', label: 'PSAgA innerhalb der Prüffrist' },
      { key: 'leiter_korrosion', label: 'Keine relevante Korrosion festgestellt' }
    ] },
    { type: 'measurements', title: '4 · Messwerte', fields: [
      { key: 'leiter_zugprobe', label: 'Zugprobe Anschlagpunkt', unit: 'kN', min: 6, required: true, hint: '≥ 6 kN' },
      { key: 'leiter_spaltmass', label: 'Sprossenabstand', unit: 'mm', max: 300, required: true, hint: '≤ 300 mm' },
      { key: 'steigschutz_kraft', label: 'Haltekraft Steigschutzläufer', unit: 'kN', min: 3, required: true, hint: '≥ 3 kN' }
    ] },
    { type: 'text', title: '5 · Bemerkungen', key: 'leiter_notes', label: 'Bemerkungen', placeholder: 'Feststellungen, Maßnahmen …' },
    { type: 'signature', title: '6 · Prüfer / Freigabe' }
  ]
};

const templateTragwerk = {
  id: 'tpl-tragwerk',
  name: 'Antennentragwerk · Erdung',
  norm: 'DIN EN 62305 / DIN VDE 0100-540',
  version: '2026.1',
  description: 'Prüfung des Antennentragwerks, der Erdungs- und Blitzschutzanlage sowie der Flugwarnbefeuerung.',
  scope: 'Antennentragwerk',
  blocks: [
    { type: 'section', title: '1 · Prüfobjekt', text: 'Antennentragwerk inklusive Mastfuß, Erdungsanlage und Flugwarnbefeuerung. Die Messung erfolgt mit geeignetem Erdungsmessgerät.' },
    { type: 'visual', title: '2 · Tragwerk / Erdungspunkte', caption: 'Prinzipskizze Mastfuß und Erdung (Demo)', variant: 'tower' },
    { type: 'checklist', title: '3 · Sichtprüfung', fields: [
      { key: 'tragwerk_statisch', label: 'Tragwerk ohne sichtbare Schäden' },
      { key: 'tragwerk_flugwarn', label: 'Flugwarnbefeuerung funktionsfähig' },
      { key: 'tragwerk_ableiter', label: 'Überspannungsableiter in Ordnung' },
      { key: 'tragwerk_trennfunken', label: 'Trennfunkenstrecken geprüft' }
    ] },
    { type: 'measurements', title: '4 · Messwerte', fields: [
      { key: 'tragwerk_erdung_r_e', label: 'Erdungswiderstand Mastfuß', unit: 'Ω', max: 10, required: true, hint: '≤ 10 Ω' },
      { key: 'tragwerk_potential', label: 'Potentialdifferenz Blitzschutz', unit: 'V', max: 1, required: true, hint: '≤ 1 V' },
      { key: 'tragwerk_ableitstrom', label: 'Ableitstrom Überspannungsschutz', unit: 'mA', max: 5, required: true, hint: '≤ 5 mA' }
    ] },
    { type: 'text', title: '5 · Bemerkungen', key: 'tragwerk_notes', label: 'Bemerkungen', placeholder: 'Feststellungen, Maßnahmen …' },
    { type: 'signature', title: '6 · Prüfer / Freigabe' }
  ]
};

const templates = [templateVde, templateLeiter, templateTragwerk];

const vdeChecks = Object.fromEntries(templateVde.blocks.find((b) => b.type === 'checklist').fields.map((f) => [f.key, true]));
const leiterChecks = Object.fromEntries(templateLeiter.blocks.find((b) => b.type === 'checklist').fields.map((f) => [f.key, true]));
const tragwerkChecks = Object.fromEntries(templateTragwerk.blocks.find((b) => b.type === 'checklist').fields.map((f) => [f.key, true]));

const vdeHistory = {
  2023: { nshv_f1_r_iso: '> 200', nshv_f1_z_s: '0,24', nshv_f2_rcd_t: '18,4', nshv_f2_rcd_i: '22,1', nshv_f3_r_iso: '4,1', erdung_mastfuss_r_e: '4,2', ...vdeChecks, vde_notes: 'Keine Mängel festgestellt.' },
  2024: { nshv_f1_r_iso: '> 150', nshv_f1_z_s: '0,27', nshv_f2_rcd_t: '21,2', nshv_f2_rcd_i: '23,8', nshv_f3_r_iso: '2,0', erdung_mastfuss_r_e: '5,1', ...vdeChecks, vde_notes: 'Außenbeleuchtung F3: Feuchtigkeit im Verteiler, Beobachtung empfohlen.' },
  2025: { nshv_f1_r_iso: '120', nshv_f1_z_s: '0,31', nshv_f2_rcd_t: '24,5', nshv_f2_rcd_i: '25,8', nshv_f3_r_iso: '1,2', erdung_mastfuss_r_e: '6,4', ...vdeChecks, vde_notes: 'F3-Isolation rückläufig. Dichtung erneuern, Wiedervorlage 2026.' }
};

const protocols = [
  {
    id: 'P-8400-2023-NSHV', siteId: '8400', templateId: 'tpl-vde-nshv', status: 'SUBMITTED',
    pruefdatum: '2023-11-17', submittedAt: '2023-11-17T14:35:00', submittedBy: 'u-salwa',
    revision: 1, revisionOf: null, hash: '6f3a91c2b7d04e18',
    data: { ...vdeHistory[2023], vde_thermo: true },
    notes: 'Jahresprüfung 2023.'
  },
  {
    id: 'P-8400-2024-NSHV', siteId: '8400', templateId: 'tpl-vde-nshv', status: 'SUBMITTED',
    pruefdatum: '2024-11-20', submittedAt: '2024-11-20T16:10:00', submittedBy: 'u-salwa',
    revision: 1, revisionOf: null, hash: 'a8d1227e5c9b340f',
    data: { ...vdeHistory[2024], vde_thermo: true },
    notes: 'Jahresprüfung 2024.'
  },
  {
    id: 'P-8400-2025-NSHV', siteId: '8400', templateId: 'tpl-vde-nshv', status: 'SUBMITTED',
    pruefdatum: '2025-11-14', submittedAt: '2025-11-14T15:20:00', submittedBy: 'u-salwa',
    revision: 1, revisionOf: null, hash: 'c4b76e0a12f8d935',
    data: { ...vdeHistory[2025], vde_thermo: true },
    notes: 'Wiedervorlage F3.'
  },
  {
    id: 'P-8400-2026-NSHV', siteId: '8400', templateId: 'tpl-vde-nshv', status: 'DRAFT',
    pruefdatum: '2026-11-11', submittedAt: '', submittedBy: '',
    revision: 1, revisionOf: null, hash: '',
    data: {
      nshv_f1_r_iso: '140', nshv_f1_z_s: '0,34', nshv_f2_rcd_t: '26,1', nshv_f2_rcd_i: '27,4',
      nshv_f3_r_iso: '0,8', erdung_mastfuss_r_e: '7,2',
      ...vdeChecks, vde_thermo: false,
      vde_notes: 'F3: Isolationswert unter Grenzwert, Feuchtigkeit im Verteiler sichtbar. Austausch der Dichtung und Trocknung veranlasst. Wiedervorlage 2026-12-02.'
    },
    notes: ''
  },
  {
    id: 'P-8400-2025-LEITER', siteId: '8400', templateId: 'tpl-dguv-leiter', status: 'SUBMITTED',
    pruefdatum: '2025-10-02', submittedAt: '2025-10-02T11:05:00', submittedBy: 'u-salwa',
    revision: 1, revisionOf: null, hash: '91c0ae3d5f7b8821',
    data: { leiter_zugprobe: '6,2', leiter_spaltmass: '280', steigschutz_kraft: '3,4', ...leiterChecks, leiter_notes: 'Keine Beanstandungen.' },
    notes: ''
  },
  {
    id: 'P-8400-2026-LEITER', siteId: '8400', templateId: 'tpl-dguv-leiter', status: 'DRAFT',
    pruefdatum: '2026-11-11', submittedAt: '', submittedBy: '',
    revision: 1, revisionOf: null, hash: '',
    data: { leiter_zugprobe: '6,8', leiter_spaltmass: '280', steigschutz_kraft: '3,6', ...leiterChecks, leiter_notes: '' },
    notes: ''
  },
  {
    id: 'P-8400-2025-TRAG', siteId: '8400', templateId: 'tpl-tragwerk', status: 'SUBMITTED',
    pruefdatum: '2025-09-18', submittedAt: '2025-09-18T09:45:00', submittedBy: 'u-bauer',
    revision: 1, revisionOf: null, hash: '5b19d6f78a02ce44',
    data: { tragwerk_erdung_r_e: '5,8', tragwerk_potential: '0,4', tragwerk_ableitstrom: '1,8', ...tragwerkChecks, tragwerk_notes: 'Flugwarnbefeuerung geprüft.' },
    notes: ''
  },
  {
    id: 'P-8700-2025-NSHV', siteId: '8700', templateId: 'tpl-vde-nshv', status: 'SUBMITTED',
    pruefdatum: '2025-12-03', submittedAt: '2025-12-03T14:00:00', submittedBy: 'u-schmidt',
    revision: 1, revisionOf: null, hash: 'e0cb47a91d23f68b',
    data: { ...vdeHistory[2025], vde_thermo: true, vde_notes: 'Keine Mängel.' },
    notes: ''
  },
  {
    id: 'P-8700-2026-NSHV', siteId: '8700', templateId: 'tpl-vde-nshv', status: 'DRAFT',
    pruefdatum: '2026-11-11', submittedAt: '', submittedBy: '',
    revision: 1, revisionOf: null, hash: '',
    data: { nshv_f1_r_iso: '> 200', nshv_f1_z_s: '0,28', nshv_f2_rcd_t: '19,7', nshv_f2_rcd_i: '21,2', nshv_f3_r_iso: '12,4', erdung_mastfuss_r_e: '4,9', ...vdeChecks, vde_thermo: true, vde_notes: '' },
    notes: ''
  },
  {
    id: 'P-8321-2025-LEITER', siteId: '8321', templateId: 'tpl-dguv-leiter', status: 'SUBMITTED',
    pruefdatum: '2025-08-21', submittedAt: '2025-08-21T10:30:00', submittedBy: 'u-bauer',
    revision: 1, revisionOf: null, hash: '3a74c0b6e19d582f',
    data: { leiter_zugprobe: '6,4', leiter_spaltmass: '300', steigschutz_kraft: '3,2', ...leiterChecks, leiter_notes: 'Sprossenabstand an der Grenze, Beobachtung.' },
    notes: ''
  },
  {
    id: 'P-8321-2026-LEITER', siteId: '8321', templateId: 'tpl-dguv-leiter', status: 'DRAFT',
    pruefdatum: '2026-11-11', submittedAt: '', submittedBy: '',
    revision: 1, revisionOf: null, hash: '',
    data: { leiter_zugprobe: '6,1', leiter_spaltmass: '298', steigschutz_kraft: '3,1', ...leiterChecks, leiter_notes: '' },
    notes: ''
  }
];

const imageCategories = [
  { id: 'Mast', label: 'Mast', subcats: ['Pardunen', 'Fundament', 'Antennen', 'Flugwarnbefeuerung', 'Steigweg', 'Kabel'] },
  { id: 'Kabine', label: 'Kabine', subcats: ['Keller', 'Sendersaal', 'Dach', 'Fundament', 'Fassade', 'Türe'] },
  { id: 'Energietechnik', label: 'Energietechnik', subcats: ['Trafo', 'NEA', 'EVT', 'ZAS', 'NSHV', 'Zähler'] },
  { id: 'Grundstück', label: 'Grundstück', subcats: ['Zaun', 'Zisterne', 'Zufahrt', 'Begrünung'] },
  { id: 'Zufahrt', label: 'Zufahrt', subcats: ['Tor', 'Weg', 'Beschilderung'] }
];

const data = {
  meta: {
    generatedAt: new Date().toISOString(),
    source: 'dashboard/standorte.js · wartungstool/wartungen2026.json · Demo-Anreicherung',
    version: '0.3.0-prototype',
    notice: 'Prototyp mit Demo-Daten. Nicht für den Produktivbetrieb.'
  },
  sites,
  users: USERS,
  maintenance,
  outages,
  templates,
  protocols,
  imageCategories,
  regions: [...new Set(sites.map((s) => s.region))].sort((a, b) => a.localeCompare(b, 'de'))
};

fs.writeFileSync(
  path.join(ROOT, 'data.js'),
  '/* AUTO-GENERIERT durch tools/build-demo-data.mjs – nicht direkt bearbeiten. */\n'
  + 'window.SWR_DATA = ' + JSON.stringify(data, null, 2) + ';\n'
);
console.log(`data.js geschrieben: ${sites.length} Standorte, ${maintenance.length} Wartungen, ${protocols.length} Protokolle, ${outages.length} Abschaltungen.`);
