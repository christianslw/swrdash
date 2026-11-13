# SWR Senderinfrastruktur · Unified Portal (Prototyp v0.3)

Klickbarer Prototyp für das gemeinsame Portal aus `dashboard`, `wartungstool` und
`Bildertool` – inklusive neuer Module **Protokolle** und **Abschaltungen**.

Der Prototyp ist bewusst **ohne Build, ohne Framework und ohne npm-Laufzeitabhängigkeiten**
umgesetzt (HTML/CSS/Vanilla JS). Er validiert Informationsarchitektur, Menüs,
Layouts, Rollen und die wichtigsten Workflows. Produktionsempfehlungen und der
schrittweise Ausbau stehen in **[MANIFEST.md](MANIFEST.md)**.

## Starten

```bash
npm start
# → http://127.0.0.1:5173
```

Alternativ reicht jeder statische Server, z. B.:

```bash
python -m http.server 5173
```

Ein lokaler Server ist empfehlenswert, weil Kartenkacheln, DWD-Wetterdaten,
EXIF-Parsing und OCR optionale Online-Dienste nutzen. Ohne Netz läuft der
Prototyp weiter (Karten-Fallback, Demo-Wetter).

## Demo-Session

| Benutzer | Rolle | Schreibrechte |
|---|---|---|
| Christian Salwa | Techniker · EFK · Standortpate | 8400, 8700, 8100 u. a. |
| Stefan Bauer | Techniker · Standortpate | 8321, 8800 u. a. |
| Thomas Müller | IFS-Standortpate | 8400, 8700 u. a. |
| Markus Schmidt | Techniker · Standortpate | 8700, 8321 u. a. |
| Sven Vogt | VEFK | nur Lesen (außer als Pate) |
| Administrator | Admin | alle – **nur mit aktivem Admin-Modus** |

Benutzerwechsel und Admin-Modus befinden sich im Benutzermenü oben rechts.
Der Wechsel ist eine Demo-Funktion; die spätere Entra-ID-Anbindung ist im
Manifest beschrieben.

## Was man ausprobieren kann

- **Standortkarte:** 380 Standorte, kombinierbare Filter, OSM/Leaflet, DWD-Wetter,
  Standort-Aktionspanel, Tourplanung (Schätzung + OSM-Routenlink), Deep-Navigation.
- **Stammdaten:** Paten mit aufgelösten Kontaktdaten, Dienste-Matrix, Wetter,
  Mini-Karte, bevorstehende Abschaltungen, Audit-Log und berechtigungsgestütztes
  Bearbeiten (Paten oder Admin-Modus).
- **Wartungen:** 102 importierte + 8 Demo-Aufgaben, Suche, Gruppen, eigene
  Ansichten, Monatskalender, Standortkopplung, Erledigen, ICS-Export.
- **Protokolle:** drei modulare Vorlagen, Messwerte mit Feld-IDs, Historie und
  Overlay, Entwurf/Abschluss, SHA-256, Unveränderlichkeit im UI, Revisionen,
  Druck-/PDF-Ansicht über den Browser-Druckdialog.
- **Bildertool:** Drag & Drop, EXIF-GPS, Drohnen-/Höhenerkennung, echte
  Laplace-Schärfe, Demo-Vektorklassifizierung, optionales Tesseract-OCR,
  Kompression und dualer ZIP-/Ordner-Export.
- **Abschaltungen:** Monats-, Wochen-, Tages- und Timeline-Ansicht, Farbcodierung,
  Anlegen/Bearbeiten, Verknüpfung mit Wartungen und Stammdaten.
- **App-Shell:** globaler Standortkontext, globale Suche, Theme (Hell/Dunkel/System),
  modulabhängiges Zahnrad-Menü, Rollen- und Admin-Modus.

Alle Demo-/Simulationsstellen sind im UI gekennzeichnet.

## Struktur

```
index.html                 App-Shell & Script-Ladereihenfolge
styles.css                 Carbon-orientierte Design-Tokens und Layouts
data.js                    generierte Demo-Daten (nicht direkt bearbeiten)
app.js                     Shell, Kontext, RBAC, Suche, Wetter, Utilities
modules/map.js             Standortkarte, Filter, Tour, DWD, Hotlinks
modules/master.js          Standortakte, Paten, Dienste, Editieren, Audit
modules/maintenance.js     Wartungslisten, Views, Kalender, ICS
modules/protocols.js       Vorlagen, Messwerte, Historie, Submit, Print
modules/images.js          Ingest, EXIF, Schärfe, Klassifikation, Export
modules/outages.js         Kalender, Timeline, CRUD, Verknüpfung
tools/build-demo-data.mjs  erzeugt data.js aus den bestehenden Repos
tests/data-check.mjs       Daten-/Strukturprüfung
server.mjs                 statischer Server ohne Abhängigkeiten
archive/index-poc-v0.html  gesicherter alter PoC
MANIFEST.md                Architektur, Datenmodell, Phasenplan, Backlog
```

## Checks

```bash
npm run check     # Datenintegrität und Struktur
npm run data      # data.js neu aus dashboard/ + wartungstool/ erzeugen
```

`data.js` wird aus `dashboard/standorte.js` und
`wartungstool/wartungen2026.json` erzeugt. Der doppelte Standort `5066`
(Konstanz) aus dem Altdatensatz wird dabei dedupliziert.

## Hinweise

- Lokale Änderungen (Stammdaten, Wartungsstatus, Protokolle, Abschaltungen)
  landen im `localStorage` des Browsers – nicht in einer Datenbank.
- Der Prototyp verwendet keine echten personenbezogenen Daten. Kontaktdaten,
  Anfahrtsbeschreibungen und nicht hinterlegte Stammdaten sind Demo-Daten.
- Karten, Wetter, EXIF und OCR sind optionale Online-Funktionen mit Fallbacks.
- Nicht für den Produktivbetrieb bestimmt.
