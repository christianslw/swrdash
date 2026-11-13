# SWR Senderinfrastruktur – Unified Enterprise Portal
## Manifest & Umsetzungsplan

| | |
|---|---|
| **Dokument** | Master-Plan für den schrittweisen Aufbau |
| **Stand** | 11.11.2026 |
| **Prototyp** | v0.3.0, lauffähig unter `http://127.0.0.1:5173` |
| **Zweck** | Layouts, Menüs, Rollen und Workflows früh validieren – vor der Produktiv-Implementierung |
| **Nicht enthalten** | Produktiv-Backend, echte Auth, Produktivdaten, PDF-Ablage, ML-Modelle |

---

## 1. Zielbild und bewusste Abgrenzung

Das Portal führt die bisher getrennten Werkzeuge in einer App-Shell zusammen:

- `dashboard` → **Standortkarte**, DWD-Wetter, Standortdaten, Hotlinks
- `wartungstool` → **Wartungen**, Suche, Ansichten, Gruppierung, Kalender
- `Bildertool` (Branch `Staging`) → **Bildertool** mit EXIF, Schärfe, Klassifikation, OCR, Export
- neu → **Stammdaten**, **Protokolle**, **Abschaltungen**

Der Prototyp ist **kein Produktivsystem**. Er ist eine klickbare Diskussionsgrundlage:
reale Daten, echte Bibliotheken und echte Abläufe, wo sie ohne Backend möglich sind;
klar gekennzeichnete Demo-Daten und Simulationen, wo Produktionslogik, Infrastruktur
oder Modelle fehlen.

### Leitentscheidungen

1. **Prototyp ohne Build:** HTML, CSS, Vanilla JS. Kein React, kein Bundler, keine
   npm-Laufzeitabhängigkeiten. So kann die Fachseite den Stand sofort öffnen.
2. **Produktion mit IBM Carbon:** Dort wird `@carbon/react` / `@carbon/styles`
   verbindlich eingesetzt. Der Prototyp bildet Carbon-Tokens, Typografie,
   Raster, 1-px-Rahmen und Interaktionsmuster nach, ist aber keine
   Carbon-Implementierung im engeren Sinne.
3. **Ein globaler Standortkontext:** Standort wird oben gewählt und gilt für alle
   Module. Deep-Links setzen den Kontext, statt ihn zu verlieren.
4. **Single Source of Truth:** Personen, Standorte und Dienste werden normalisiert.
   Keine Freitext-Kontaktdaten in Standort- oder Wartungstabellen.
5. **Unveränderliche Protokolle:** Abschluss statt Bearbeitung. Korrektur nur als
   neue Revision. Im Prototyp im UI erzwungen, in Produktion zusätzlich per DB-Trigger.
6. **Demo-RBAC statt Scheinsicherheit:** Benutzerwechsel und Admin-Modus sind lokale
   Demo-Funktionen. Die echte Autorisierung gehört in die API, nicht ins Frontend.

---

## 2. Feature-Matrix des Prototyps

Legende: **Echt** = lokal/real berechnet · **Live** = externe API · **Demo** = simulierte
oder generierte Daten · **Offen** = Produktivausbau erforderlich.

### 2.1 App-Shell

| Funktion | Status | Anmerkung |
|---|---|---|
| Linke Navigation mit 6 Modulen | **Echt** | Standortkarte, Stammdaten, Wartungen, Protokolle, Bildertool, Abschaltungen |
| Globaler Standortkontext | **Echt** | Header-Chip, Deep-Navigation, Filterkopplung |
| Globale Suche | **Echt** | Nummer, Name, Kürzel, Region, alternative Bezeichnungen |
| Benutzermenü mit Rolle | **Demo** | 6 Testbenutzer, Rollenwechsel zur Demonstration |
| Admin-Modus-Toggle | **Demo** | Nur Admin-Rolle; lokaler Session-Schalter |
| Theme Hell/Dunkel/System | **Echt** | Carbon-Tokens, OLED-Dunkel |
| Modulabhängiges Zahnrad-Menü | **Echt** | Inhalte je Modul, lokal persistiert |
| Login / Entra-ID-SSO | **Offen** | Produktivphase 1 |
| Audit-Log | **Demo/echt** | Änderungen im Browser; noch keine DB-Append-only-Tabelle |

### 2.2 Standortkarte

| Funktion | Status | Anmerkung |
|---|---|---|
| 380 Standorte mit Koordinaten | **Echt** | Import aus `dashboard/standorte.js`; 20 ohne Koordinaten |
| Leaflet/OSM-Karte | **Live** | CDN; Offline-Fallback als SVG-Punktkarte |
| Suche & kombinierbare Filter | **Echt** | Text, Dienst, Bauart, Region, Abschaltungsstatus |
| Standort-Aktionspanel | **Echt** | Deep-Links, Sharepoint, Google Maps, Koordinaten kopieren |
| DWD-Warnungen und Wetter | **Live** | Bright Sky (DWD); Demo-Fallback offline |
| Tourplanung | **Demo** | Stopps, Haversine-Schätzung, OSM-Routenlink |
| Echtzeit-Verkehr / Multi-Stop-ETA | **Offen** | OSRM-/Routing-Provider in Phase 3 |
| Marker-Clustering für große Netze | **Offen** | Bei 380 Markern noch nicht nötig |

### 2.3 Stammdaten

| Funktion | Status | Anmerkung |
|---|---|---|
| Standortakte | **Echt** | Basisdaten aus Import, Detailfelder für 10 Standorte kuratiert |
| Paten-Auflösung aus `users` | **Echt** | 1./2./IFS-Pate, E-Mail-/Telefon-Links |
| Geografie, Bauwerk, Aufzug | **Demo** | Werte generiert; Editieren möglich |
| Dienste-Matrix | **Demo** | Generierte `site_services`-Demo, nur lesbar |
| Wetter & Mini-Karte | **Live** | Bright Sky, Leaflet |
| Bevorstehende Abschaltungen | **Echt** | Verknüpft mit Abschaltungsmodul |
| Schreibschutz nach Paten/Admin | **Echt** | UI-Guard + Audit im Browser |
| Änderungs-Audit | **Demo/echt** | Wer/Wann/Feld/Alt/Neu lokal |
| Dienste- und Patenpflege | **Offen** | Eigene Admin-Masken in Phase 3 |

### 2.4 Wartungen

| Funktion | Status | Anmerkung |
|---|---|---|
| 102 reale Export-Aufgaben | **Echt** | aus `wartungstool/wartungen2026.json` |
| 8 Demo-Aufgaben im November 2026 | **Demo** | damit Kalender/Überfälligkeit direkt sichtbar |
| Suche & Filter | **Echt** | Standort, Nummer, Aufgabe, Bearbeiter |
| Gruppen | **Echt** | Standort, Bearbeiter, Fälligkeit, Status |
| Eigene Ansichten | **Demo/echt** | lokal gespeichert, Prompt-Dialog |
| Monatskalender | **Echt** | Navigation, Tagesdetail |
| Standortkopplung | **Echt** | automatisch aus globalem Kontext, aufhebbar |
| Erledigen / Wieder öffnen | **Demo/echt** | lokal gespeichert, Audit |
| ICS-Export | **Echt** | Download, gefilterte Auswahl |
| Wartung anlegen | **Demo** | nur Admin-Modus, lokal |
| Abonnierbarer Kalender-Feed | **Offen** | WebCal/ICS-Feed mit Token in Phase 3 |
| Anbindung an echtes SQL-Backend | **Offen** | `wartungstool/schema.sql` als Ausgangspunkt |

### 2.5 Protokolle (neu)

| Funktion | Status | Anmerkung |
|---|---|---|
| Modulare Vorlagen | **Demo** | 3 Vorlagen: VDE 0105-100, DGUV V3 Leiter, Antennentragwerk |
| Blocktypen | **Echt** | Sektion, Visualisierung, Checkliste, Messwerte, Freitext, Signatur |
| Messwert-Felder mit `field_key` | **Echt** | inkl. Einheit, Grenzwert, Pflichtfeld |
| Historien-Overlay | **Echt** | Seed-Historie 2023–2025, Delta/Trend, Chart |
| Entwurf speichern | **Echt** | lokal, automatisch bei Eingabe |
| Pflichtfeld-Validierung | **Echt** | beim Abschluss |
| Abschluss + Unveränderlichkeit | **Demo/echt** | UI-Sperre im Prototyp, Hash via Web Crypto |
| Neue Revision | **Echt** | Revision von Ursprungsprotokoll |
| Druck-/PDF-Ansicht | **Demo** | Browser-Druckdialog; keine Ablage |
| DB-Trigger / PDF-Ablage | **Offen** | Phase 4, siehe Datenmodell |
| Vorlagen-Editor | **Offen** | UI-Konzept vorhanden, Phase 4 |
| Standortspezifische Vorlagen | **Offen** | Datenmodell vorbereitet |

### 2.6 Bildertool

| Funktion | Status | Anmerkung |
|---|---|---|
| Drag & Drop | **Echt** | JPEG/PNG/WebP, bis 20 Dateien je Batch |
| EXIF-GPS + Nearest-Site | **Echt** | exifr (optional CDN), Haversine, 2-km-Radius |
| Höhe & Drohnen-Erkennung | **Echt** | GPS-/Relative Altitude, DJI-Kameramodelle |
| Laplace-Schärfe | **Echt** | Canvas, echter Score + Schwellwert |
| Vektor-Klassifizierung | **Demo** | regelbasierte Feature-Heuristik, manuell korrigierbar |
| OCR | **Optional** | Tesseract.js lazy per CDN; Demo-Zählerstände |
| Kompression | **Echt** | Canvas-JPEG, Qualität einstellbar |
| Dateinamen-Schema | **Echt** | Standortnr, Kategorie, Unterkategorie, Drohne/Höhe, Kommentar, Datum |
| Zielordner-Template | **Echt** | konfigurierbar, Vorschau |
| Dualer Export | **Echt** | ZIP mit `Original/` und `Komprimiert/`; Ordner-Sync via FSA API |
| HEIC/HEIF | **Offen** | Phase 3 (heic2any/Server-Konvertierung) |
| Produktions-ML (Vektor/CNN) | **Offen** | Trainingsdaten, Modell-Hosting, Active Learning |
| Automatische OCR im Batch | **Offen** | Worker-Warteschlange, Qualitätskennzeichnung |

### 2.7 Abschaltungen (neu)

| Funktion | Status | Anmerkung |
|---|---|---|
| Monatsansicht | **Echt** | farbcodiert, Tageszähler, Mehrtagesereignisse |
| Wochenansicht | **Demo** | vereinfachte 7-Tage-Spalten |
| Tagesansicht | **Echt** | Agenda |
| Timeline | **Echt** | 30 Tage, Gruppierung nach Standort, Heute-Marker |
| Filter | **Echt** | Dienst, Grund, Status, Standort, Suche |
| Farbcodierung Dienst/Grund | **Echt** | umschaltbar |
| Anlegen/Bearbeiten/Löschen | **Demo/echt** | lokal, RBAC auf Standort |
| Verknüpfung mit Wartung | **Echt** | Auswahl + Deep-Link in Wartungsfilter |
| Anzeige in Stammdaten | **Echt** | automatisch |
| Konflikt-/Ressourcenprüfung | **Offen** | z. B. parallele Abschaltungen, Sperrfenster |
| Sync mit Wartungsplan | **Offen** | bidirektionale Regeln in Phase 4 |

---

## 3. Layout- und Menükonzept

### 3.1 Shell

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SWR │ Senderinfrastruktur │ 🔍 globale Standortsuche │ 8400 OBB × │ ⚙ │ 👤 │
├──────────────┬──────────────────────────────────────────────────────────────┤
│ MODULE       │                                                              │
│ ▸ Standortkarte                                                             │
│ ▸ Stammdaten  │                     Workspace                                │
│ ▸ Wartungen   │      Modulinhalt, Tabellen, Karten, Kalender, Editor         │
│ ▸ Protokolle  │                                                              │
│ ▸ Bildertool  │                                                              │
│ ▸ Abschaltungen                                                             │
│              │                                                              │
│ Prototyp v0.3│                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

- **Top-Header:** Marke, globale Suche, aktiver Standort (löschbar), Admin-Modus-Indikator,
  Zahnrad (Modul-Einstellungen), Benutzermenü. Der Header ist in beiden Themes dunkel,
  wie bei Carbon üblich.
- **Sidebar:** sechs Module mit Zählern (Standorte, offene Wartungen, Entwürfe,
  Bilder, kommende Abschaltungen). Aktives Modul mit blauer Kante.
- **Workspace:** hohe Informationsdichte, 1-px-Rahmen, keine dekorativen Animationen.
- **Overlays:** Einstellungen als rechtes Panel, Dialoge für Aktionen, Toasts für
  Rückmeldungen. Kein permanentes Modal.

### 3.2 Benutzermenü

- Identität, Rolle(n), Standortpatenschaften
- Theme: Hell / Dunkel (OLED) / System
- Admin-Modus-Toggle (nur Admin-Rolle, mit Warnhinweis)
- Demo-Benutzerwechsel
- Konto & Anmeldung
- Abmelden (Demo)

### 3.3 Kontextsensitives Zahnrad-Menü

| Modul | Einstellungen |
|---|---|
| Standortkarte | Karten-Layer, Routing-Heimatstandort, Wetter-Widget, Tour leeren |
| Stammdaten | Wetter-Widget, Audit-Log |
| Wartungen | Standard-Ansicht, Standard-Gruppierung, Standortkopplung, ICS-Export, gespeicherte Ansichten |
| Protokolle | Standard-Messgerät, Historien-Tiefe, Auto-Overlay, Vorlagenübersicht |
| Bildertool | Laplace-Schwellwert, JPEG-Qualität, OCR an/aus, Zielordner-Template |
| Abschaltungen | Standard-Ansicht, Farbcodierung Dienst/Grund, ICS-Export |

---

## 4. Rollen- und Berechtigungsmodell

### 4.1 Rollen

| Rolle | Beschreibung | Schreibrechte |
|---|---|---|
| Techniker / EFK | Außendienst, liest alle Standorte | Nur wenn zusätzlich Standortpate |
| Standortpate (1./2./IFS) | Verantwortlich für einen Standort | Stammdaten des eigenen Standorts, Abschaltungen des Standorts |
| VEFK | Verantwortliche Elektrofachkraft, Freigaben | Lesen; Schreiben nur bei zusätzlicher Patenschaft |
| Admin | Portaladministration | Alles – **nur bei aktivem Admin-Modus** |

### 4.2 Matrix

| Aktion | Techniker | Pate | VEFK | Admin (Admin-Modus) |
|---|---|---|---|---|
| Alle Standorte lesen | ✓ | ✓ | ✓ | ✓ |
| Stammdaten fremder Standorte ändern | – | – | – | ✓ |
| Stammdaten eigener Standort ändern | – | ✓ | – | ✓ |
| Wartung erledigen | ✓ | ✓ | ✓ | ✓ |
| Wartungsstammdaten anlegen | – | – | – | ✓ |
| Protokoll anlegen/entwerfen | ✓ | ✓ | ✓ | ✓ |
| Protokoll abschließen | ✓ | ✓ | ✓ | ✓ |
| Abgeschlossenes Protokoll ändern | – | – | – | – (nur neue Revision) |
| Abschaltung eigenen Standorts anlegen | – | ✓ | – | ✓ |
| Abschaltung fremder Standorte anlegen | – | – | – | ✓ |
| Admin-Modus aktivieren | – | – | – | ✓ |

### 4.3 Produktionsregeln

- **Authorisierung serverseitig**: Jeder Schreib-Endpunkt prüft Benutzerrolle,
  Standortpatenschaft und Admin-Modus-Flag in der Session. UI-Guards sind Komfort,
  keine Sicherheitsgrenze.
- **Admin-Modus** ist eine zeitlich begrenzte Privilege Elevation (z. B. 30 Minuten),
  mit Audit-Event bei Aktivierung/Deaktivierung.
- **Paten** werden über `site_patrons(site_id, user_id, role)` oder drei FK-Spalten
  in `sites` abgebildet. Kontaktdaten kommen immer aus `users`.
- **Entra-ID**: OIDC Authorization Code + PKCE, serverseitige Session, Rollen-Mapping
  über App-Rollen/Gruppen. Lokaler Provider und Entra-Provider teilen dieselbe
  Session- und Guard-Schnittstelle.

---

## 5. Datenquellen und Demo-Kennzeichnung

### 5.1 Importiert

| Quelle | Umfang | Verwendung |
|---|---|---|
| `dashboard/standorte.js` | 381 Einträge → **380** nach Deduplizierung | Standortnummer, Name, Koordinaten, SharePoint-Tagebuchlink |
| `wartungstool/wartungen2026.json` | **102** Aufgaben | Wartungsliste, Fälligkeiten, Bearbeiter, Status |
| `Bildertool/bildertool-config.json` | 5 Kategorien | Kategorie-/Unterkategorie-Baum |
| `Bildertool` Schärfe-/Exportlogik | Konzept | Laplace, Dateinamen, Ordnerlogik |
| `dashboard` Wetterlogik | Bright Sky | DWD-Warnungen, Wetter |

### 5.2 Demo-Daten

- **Standort-Stammdaten:** Adresse, Bauart, Turmhöhe, Aufzug, Anfahrtsbeschreibung,
  Dienste und Paten sind für 10 Standorte kuratiert und für die übrigen deterministisch
  generiert. Sie sind **keine** Produktivdaten.
- **Dienste:** 767 Demo-Einträge über alle Standorte.
- **Wartungen:** 8 zusätzliche November-Aufgaben für eine aussagekräftige Kalenderansicht.
- **Protokolle:** 11 Seed-Protokolle mit Historie 2023–2025 und Entwürfen 2026.
- **Abschaltungen:** 12 Seed-Ereignisse rund um November 2026.
- **Benutzer:** 6 fiktive Testkonten; keine echten Kontaktdaten.
- **Bilder:** 3 generierte Demo-Bilder; echte Uploads werden lokal verarbeitet.

### 5.3 Fundstelle Datenhygiene

`dashboard/standorte.js` enthält den Standort `5066` (Konstanz) doppelt.
Der Generator dedupliziert ihn und protokolliert den Fund beim Lauf:

```
Doppelter Standort in dashboard/standorte.js ignoriert: 5066 (KONSTANZ)
```

Für die Produktion ist eine **Standortnummer als führender Schlüssel** mit
Unique-Constraint vorzusehen; abweichende Namen/Links müssen vor dem Import
fachlich geklärt werden.

---

## 6. Zielarchitektur (Produktion)

### 6.1 Empfohlener Stack

| Schicht | Empfehlung | Begründung |
|---|---|---|
| Frontend | React + TypeScript + Vite + `@carbon/react` | Carbon ist gesetzt; Komponenten, Barrierefreiheit, Theme-Tokens |
| Routing | React Router, Standort in URL (`?site=8400`) | Deep-Links, Back/Forward, teilbare Ansichten |
| Server-State | TanStack Query | Caching, Invalidierung, Request-Zustände |
| Karte | Leaflet + lokale Provider-Konfiguration | Bestandscode; OSM/optional kommerzielle Tiles |
| API | Node 22 + Fastify + TypeScript | schlank, typisiert, passt zum bestehenden Node-Know-how |
| DB | PostgreSQL 16 + PostGIS | Normalisierung, FK-Integrität, Geo-Nearest-Neighbor, JSONB |
| Migrationen | SQL-first (Drizzle/Prisma optional) | Trigger/Constraints und JSONB bleiben sichtbar |
| Auth | Entra ID (OIDC) + lokale Dev-Variante | Dual-Mode-Anforderung, gleiche Session-Schnittstelle |
| Dateien | S3-kompatibler Objektspeicher (MinIO/S3) | Originale, Kompression, PDF, Hashes |
| PDF | Gotenberg oder Headless-Chromium-Service | druckfertige SWR-Vorlagen, reproduzierbar |
| OCR/ML | Separater Worker (Queue) | schwere Last, Retry, Modell-Updates, Skalierung |
| Deployment | Container + Reverse Proxy, getrennte Worker | klare Grenzen, einfache Skalierung |

### 6.2 Komponenten

```
Browser (Carbon React)
   │ HTTPS / Session-Cookie
   ▼
API (Fastify)
   ├── Auth-Provider (Local | Entra OIDC)
   ├── RBAC-Guard (Rolle, Patenschaft, Admin-Modus)
   ├── Site-Service / Maintenance-Service
   ├── Protocol-Service (Draft, Submit, Revision, PDF)
   ├── Outage-Service
   ├── Image-Service (Presigned Uploads, Metadaten)
   ├── Weather/Route-Proxy (Cache, Rate-Limit)
   ▼
PostgreSQL/PostGIS        S3/MinIO              Queue/Worker
   ├── Stammdaten           ├── Originale          ├── OCR
   ├── Protokolle           ├── Komprimiert        ├── Vektor-/CNN-Modell
   ├── Abschaltungen        └── PDFs              └── EXIF-/Thumbnail-Pipeline
   └── Audit-Log
```

### 6.3 Auth-Provider

- `AUTH_PROVIDER=local`: Entwicklungs-Login mit Test-Usern (nur Dev/Test).
- `AUTH_PROVIDER=entra`: OIDC-Discovery, Authorization Code + PKCE, Token-Validierung,
  Mapping auf `users.entra_oid` und App-Rollen.
- Business-Code kennt nur `current_user` + `can(permission, site)`.
- Session serverseitig (HttpOnly, Secure, SameSite=Lax), keine Tokens im localStorage.
- Admin-Modus: eigenes Session-Flag mit Ablaufzeit, nicht Teil des Entra-Tokens.

---

## 7. Datenmodell

### 7.1 ERD (Kurzform)

```
users ──< site_patrons >── sites ──< site_services
  │                          │
  │                          ├──< maintenance_tasks >── users (assignee)
  │                          ├──< protocol_instances >── protocol_templates
  │                          │        └──< protocol_measurements
  │                          ├──< outages >──── maintenance_tasks (optional)
  │                          └──< image_batches >──< images
  │
  └──< audit_log        user_settings
```

### 7.2 Kern-Tabellen

| Tabelle | Zweck / wichtigste Spalten |
|---|---|
| `users` | `id`, `entra_oid`, `name`, `email`, `phone`, `mobile`, `role`, `active` |
| `sites` | `id`, `standortnummer` **UNIQUE**, `kuerzel`, `name`, `alt_names[]`, `region`, `address`, `lat`, `lon geography(Point,4326)`, `bauart`, `tower_height_m`, `elevator`, `approach`, `sharepoint_url`, `sharepoint_folder` |
| `site_patrons` | `site_id`, `user_id`, `patron_role` (`PATE_1`, `PATE_2`, `IFS`) – Unique je Site/Rolle |
| `site_services` | `id`, `site_id`, `service_type` (ENUM), `operator`, `frequency_mhz NUMERIC NULL`, `channel_block`, `notes` |
| `maintenance_tasks` | `id`, `site_id`, `title`, `interval_months`, `due_start`, `due_end`, `assignee_id`, `status`, `completed_at`, `completed_by`, `source_external_id`, `source_hash` |
| `protocol_templates` | `id`, `site_id NULL`, `name`, `norm`, `version`, `blocks JSONB`, `active` |
| `protocol_instances` | `id`, `site_id`, `template_id`, `status` (`DRAFT`/`SUBMITTED`), `revision`, `revision_of`, `pruefdatum`, `created_by`, `submitted_by`, `submitted_at`, `data JSONB`, `pdf_url`, `sha256`, `immutable` |
| `protocol_measurements` | `id`, `protocol_id`, `field_key`, `value_numeric`, `value_text`, `unit`, `limit_min`, `limit_max`, `measured_at` – materialisiert beim Abschluss |
| `outages` | `id`, `site_id`, `service_type`, `reason`, `title`, `description`, `impact`, `starts_at`, `ends_at`, `status`, `maintenance_task_id NULL`, `created_by` |
| `image_batches` | `id`, `site_id NULL`, `created_by`, `created_at`, `folder_template` |
| `images` | `id`, `batch_id`, `site_id`, `original_key`, `compressed_key`, `filename`, `category`, `subcategory`, `comment`, `exif JSONB`, `lat`, `lon`, `altitude_m`, `is_drone`, `sharpness`, `ocr_value`, `sha256`, `status` |
| `audit_log` | `id`, `at`, `actor_id`, `action`, `entity`, `entity_id`, `site_id`, `field`, `old_value JSONB`, `new_value JSONB` – append-only |
| `user_settings` | `user_id`, `module`, `settings JSONB` |

### 7.3 Invarianten

1. **Standortnummer** ist eindeutig; alle Module referenzieren `sites.id` per FK.
2. **Personendaten** stehen ausschließlich in `users`; Standorte referenzieren nur `user_id`.
3. **Dienste** sind 1:n zu `sites`; Frequenz numerisch oder als Kanalblock.
4. **Protokoll-Immutability:** `SUBMITTED` ist unveränderlich (DB-Trigger + Service-Guard).
5. **Revisionen** erzeugen einen neuen Datensatz mit `revision_of` auf das Ursprungsprotokoll.
6. **Messwert-Historie:** `protocol_measurements.field_key` ist je Vorlage eindeutig und
   indiziert; Zeitreihen laufen über Standort + Vorlage + `field_key`.
7. **Audit-Log** ist append-only; keine Updates/Deletes.
8. **Dateien** werden per SHA-256 adressiert; EXIF bleibt im Original erhalten.

### 7.4 Immutability-Trigger (Skizze)

```sql
CREATE OR REPLACE FUNCTION reject_submitted_protocol_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'SUBMITTED' THEN
    RAISE EXCEPTION 'protocol % is immutable after submission', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protocol_immutable
BEFORE UPDATE OR DELETE ON protocol_instances
FOR EACH ROW EXECUTE FUNCTION reject_submitted_protocol_change();
```

Zusätzlich: `CHECK (status <> 'SUBMITTED' OR (submitted_at IS NOT NULL AND sha256 IS NOT NULL))`.
PDF und `sha256` werden beim Abschluss in einer Transaktion erzeugt/gespeichert.

### 7.5 Zeitreihen-Abfrage

```sql
SELECT m.value_numeric, p.pruefdatum
FROM protocol_measurements m
JOIN protocol_instances p ON p.id = m.protocol_id
WHERE p.site_id = $1
  AND p.template_id = $2
  AND m.field_key = $3
  AND p.status = 'SUBMITTED'
ORDER BY p.pruefdatum DESC
LIMIT 5;
```

### 7.6 PostGIS-Nearest-Neighbor

```sql
SELECT id, standortnummer, name,
       ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_m
FROM sites
WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, 2000)
ORDER BY location <-> ST_MakePoint($1, $2)::geography
LIMIT 1;
```

---

## 8. API-Skizze

| Methode | Pfad | Zweck |
|---|---|---|
| `GET` | `/api/me` | Session, Rollen, Patenschaften, Admin-Modus |
| `POST` | `/api/auth/login` / `/api/auth/callback` | lokaler Login bzw. Entra OIDC |
| `POST` | `/api/admin-mode` | Elevation mit TTL + Audit |
| `GET` | `/api/sites?q=&service=&region=&bauart=` | Suche/Filter |
| `GET` | `/api/sites/:nr` | Standortakte inkl. Paten, Dienste |
| `PATCH` | `/api/sites/:nr` | RBAC + Audit; nur freigegebene Felder |
| `GET` | `/api/maintenance?site=&status=&assignee=` | Wartungsliste |
| `PATCH` | `/api/maintenance/:id/complete` | Erledigung (Techniker) |
| `POST` | `/api/maintenance` | Stammdaten (Admin) |
| `GET` | `/api/protocols?site=&status=` | Protokollliste |
| `POST` | `/api/protocols` | Entwurf aus Vorlage |
| `PATCH` | `/api/protocols/:id` | Entwurf speichern (nur DRAFT) |
| `POST` | `/api/protocols/:id/submit` | Validierung, Hash, PDF, Lock |
| `POST` | `/api/protocols/:id/revision` | neue Revision als DRAFT |
| `GET` | `/api/protocols/:id/pdf` | signierte PDF-URL |
| `GET` | `/api/outages?from=&to=&service=` | Kalender |
| `POST/PATCH/DELETE` | `/api/outages` | RBAC auf Standort |
| `POST` | `/api/images/batches` | Presigned Upload + Metadaten |
| `GET` | `/api/images/:id` | Status/Metadaten |
| `GET` | `/api/export/images?batch=` | ZIP-Manifest / Download |
| `GET` | `/api/weather?lat=&lon=` | DWD-Proxy + Cache |
| `GET` | `/api/route?stops=` | Routing/ETA (Provider) |
| `GET` | `/api/audit?site=` | Audit-Log (berechtigt) |

Fehlerformat: `{ code, message, details? }`. Schreibzugriffe idempotent wo sinnvoll
(z. B. `Idempotency-Key` für Protokoll-Abschluss).

---

## 9. Phasenplan

### Phase 0 – Klickbarer Prototyp (abgeschlossen)

**Ziel:** Layouts, Menüs, Rollen und Workflows validieren.
**Ergebnis:** dieses Repository, `index.html` + Module, Demo-Daten, Manifest.
**Abnahme:** Prototyp startet ohne Build; alle sechs Module erreichbar; Kernflows
(Standort wählen → Modul, Stammdaten editieren, Protokoll abschließen, Bild exportieren,
Abschaltung anlegen) laufen; `npm run check` grün.

### Phase 1 – Fundament & Auth (ca. 2–3 Wochen)

**Scope**
- Monorepo/Projektstruktur, CI, Linting, Test-Setup.
- PostgreSQL/PostGIS-Schema + Migrationen; Seed-Import aus den drei Repos.
- Auth-Provider (local/entra), Sessions, Rollen, Admin-Modus mit TTL.
- RBAC-Guard, Audit-Log, zentrale Fehlerbehandlung.
- API-Grundgerüst für Sites/Users/Settings.

**Abnahme**
- Login lokal und gegen Entra-Test-Tenant.
- Schreibzugriff auf fremde Standorte wird serverseitig mit 403 abgewiesen.
- Admin-Modus ohne Rolle nicht aktivierbar; jede Elevation im Audit.
- Import reproduzierbar; 380 Standorte, keine Duplikate.
- Migration up/down getestet.

### Phase 2 – Shell & Stammdaten (ca. 2–3 Wochen)

**Scope**
- Carbon-React-Shell mit Sidebar, Header, globalem Standortkontext, Suche, Theme.
- Modulabhängiges Settings-Panel, URL-basierte Deep-Links.
- Stammdaten-Ansicht mit Paten, Diensten, Karte, Wetter, Abschaltungen, Audit.
- Editier-Workflow inkl. Feldvalidierung und RBAC.
- Standortkarte mit echten Sites, Filtern, Hotlinks und Aktionspanel.

**Abnahme**
- Standortwechsel per Suche/Marker/Deep-Link funktioniert in allen Modulen.
- Stammdaten-Edit nur für Paten/Admin; Audit-Einträge vollständig.
- Karte performant mit 380 Markern; Tastaturbedienung und Fokus sichtbar.
- DWD-Widget mit Cache und Fallback.

### Phase 3 – Wartungen & Bildertool (ca. 3–4 Wochen)

**Scope**
- Wartungs-API, Import, Suche, Filter, Gruppen, eigene Ansichten (persistiert).
- Kalender, ICS-Feed, Erledigung, Admin-Anlage.
- Bild-Upload mit Presigned URLs, EXIF-Pipeline, Schärfe, Klassifikation (erste Version),
  OCR-Worker, Kompression, ZIP/Ordner-Export, Dateinamen-Schema.
- Echte Ordner-/Storage-Struktur, Aufbewahrung, Rechte.
- Routing-Anbindung (OSRM/Provider), optional Verkehr.

**Abnahme**
- 102+ Wartungen korrekt importiert; Änderungen überleben Reload (DB).
- Eigene Ansichten pro Benutzer gespeichert.
- Bild mit GPS wird innerhalb 2 km dem richtigen Standort zugeordnet.
- Drohnenbild erhält Höhe/`Luftaufnahme` im Namen.
- Export erzeugt Original + komprimiert in definierter Struktur.
- Upload-/OCR-Fehler sichtbar, wiederholbar, ohne Datenverlust.

### Phase 4 – Protokolle & Abschaltungen (ca. 4–5 Wochen)

**Scope**
- Vorlagenmodell + Editor (Sektionen, Checklisten, Messwerte, visuelle Blöcke).
- Protokoll-Editor mit Pflichtfeldern, Historie, Overlay, Revisionen.
- Submit-Transaktion: Validierung, PDF, Hash, Immutability-Trigger, Objektspeicher.
- PDF-Layout SWR, Druck/Archiv, optional Ablage im Standortordner.
- Abschaltungs-API, Kalender (Monat/Woche/Tag/Timeline), CRUD, Verknüpfung.
- Konflikt-/Sperrfensterprüfung (Basis).

**Abnahme**
- Kein Update/Delete an `SUBMITTED`-Protokollen, auch nicht direkt in der DB.
- PDF + Hash vorhanden, reproduzierbar, im Audit referenziert.
- Historie zeigt letzte 3 Prüfungen je `field_key`; Abweichungen markiert.
- Abschaltung erscheint in Stammdaten; Wartung verlinkbar.
- Berechtigungsmatrix aus Kapitel 4 durch Tests abgedeckt.

### Phase 5 – Härtung & Rollout (ca. 2–3 Wochen)

**Scope**
- Last-/Performance-Tests, Indizes, Query-Optimierung.
- Barrierefreiheits-Audit (Carbon + Tastatur + Screenreader).
- Security-Review: Session, Uploads, SSRF, Rate Limits, Rechte.
- Monitoring/Logging, Backups, Restore-Test.
- UAT mit Fachbereich, Migrationsprobe, Schulung, Cutover-Plan.

**Abnahme**
- definierte Performance-Budgets eingehalten (z. B. Karte < 2 s, Suche < 300 ms).
- Restore aus Backup getestet.
- UAT-Abnahmeprotokoll; offene Punkte priorisiert.
- Produktivfreigabe durch Betrieb/Sicherheit.

> Zeitangaben sind grobe Hausnummern für ein kleines Team (1–2 Full-Stack,
> 1 Frontend, Fachbereich/IT als Product Owner). Sie sind keine Zusage.

---

## 10. Backlog / offene Entscheidungen

### Muss (vor Produktivstart)

- [ ] Entra-App-Registrierung, Rollen-Mapping, Test-Tenant.
- [ ] PostgreSQL/PostGIS-Schema + Migrationen + Seed-Import.
- [ ] Serverseitiges RBAC inkl. Admin-Modus-TTL.
- [ ] Protokoll-Immutability per DB-Trigger; PDF-Erzeugung und -Ablage.
- [ ] Dateispeicher + Upload-Pipeline + Virenscan.
- [ ] Audit-Log append-only.
- [ ] Import-/Deduplizierungsregeln für 380 Standorte.
- [ ] Datenschutz-/Aufbewahrungskonzept für Fotos und personenbezogene Daten.

### Soll

- [ ] Vorlagen-Editor mit visuellem Baukasten.
- [ ] Standortspezifische Protokollvorlagen und Feld-Versionierung.
- [ ] Abonnierbarer ICS-Feed mit Token.
- [ ] Routing-/Verkehrsprovider mit ETA.
- [ ] OCR-Worker + Qualitätskennzeichnung.
- [ ] Vektormodell/CNN mit Active Learning und manueller Korrektur.
- [ ] SharePoint-Ablage (PDF/Fotos) über Graph API.
- [ ] Konflikt- und Sperrfensterprüfung für Abschaltungen.
- [ ] Mobile/PWA-Optimierung für Außendienst.

### Kann

- [ ] QR-Codes an Standorten für Direkteinstieg.
- [ ] Offline-Erfassung von Protokollen mit späterem Sync.
- [ ] Bildannotationen und Vergleichsansicht.
- [ ] Dashboard-Kennzahlen (Prüfquote, Mängel, Ausfallzeit).
- [ ] Assistent für Prüfintervalle.

### Offene Entscheidungen

1. **Frontend:** Carbon React ist gesetzt; bleibt die Prototyp-Oberfläche 1:1 oder
   werden Informationsdichte und Tabellen neu geschnitten?
2. **PDF:** Gotenberg vs. Headless-Chromium vs. PDF-Bibliothek; Signatur/Archivierung?
3. **OCR/ML:** On-Prem (Datenschutz) oder Cloud? Welche Bilddaten dürfen wohin?
4. **Bildaufbewahrung:** Wie lange Originale, komprimierte Varianten, Trainingsdaten?
5. **Routing:** öffentliches OSRM (Demo) vs. kommerzieller Traffic-Provider?
6. **SharePoint:** nur Hotlinks (aktuell) oder Graph-Integration mit Ablage/Ordneranlage?
7. **Datenpflege:** Wer pflegt Dienste, Paten und Anfahrtsbeschreibungen? Freigabeprozess?
8. **Protokoll-Recht:** Welche Vorlagen/Prüfungen sind normativ verbindlich, wer signiert?
9. **Admin-Modus:** TTL, Vier-Augen-Prinzip, zusätzliche Bestätigung?
10. **Hosting:** SWR-Rechenzentrum, Cloud, Hybrid? Backup-/Restore-Ziele?

---

## 11. Test- und Qualitätsstrategie

### Prototyp

- `npm run check` prüft Datenintegrität, Referenzen, Feld-Keys, Dateistruktur.
- Manuelle Browser-Smoke-Tests: Navigation, Suche, RBAC, Theme, Stammdaten-Edit,
  Protokoll-Submit/Revision, Bild-Upload/ZIP, Abschaltungs-CRUD.
- Bekannte Grenzen: `localStorage`, keine Serverpersistenz, keine echte Auth.

### Produktion

| Ebene | Inhalt |
|---|---|
| Unit | Feldvalidierung, Limits, Dateinamen, ICS, Schärfe-/Geo-Helfer |
| DB | Constraints, FK-Integrität, Immutability-Trigger, PostGIS-Index |
| API | RBAC-Matrix, 403/409/422, Idempotenz, Audit-Events |
| E2E | Standortkontext, Editier-Workflow, Protokoll-Abschluss, Export |
| Fixtures | EXIF-JPEGs (GPS, Höhe, Drohne, kein GPS), defekte Dateien |
| PDF | Golden-Files je Vorlage/Revision |
| Security | Session, Upload, SSRF, Rate Limit, Rechte-Eskalation |
| A11y | Tastatur, Fokus, Kontraste, Screenreader (Carbon-Basis) |
| Last | 380+ Sites, 10k Wartungen, 100k Messwerte, parallele Uploads |

### Definition of Done (allgemein)

- Akzeptanzkriterien erfüllt, Tests grün.
- RBAC serverseitig geprüft und getestet.
- Audit-Eintrag für jede schreibende Aktion.
- Keine sensiblen Daten in Logs oder URLs.
- Dokumentation und Betriebshandbuch aktualisiert.

---

## 12. Risiken und Datenmigration

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Altdaten inkonsistent (doppelte 5066, 20 Sites ohne Koordinaten) | Fehlzuordnung, Kartenlücken | Import-Report, fachliche Klärung, Pflichtfeldstrategie |
| SharePoint-Links veralten | Hotlinks ins Leere | Link-Check-Job, Graph-Integration perspektivisch |
| Protokolle ohne klare Feld-IDs | keine Historie | `field_key`-Katalog, Migrationsmapping, Review |
| PDF-Rechtssicherheit | Revision ungültig | PDF/Hash server-seitig, Audit, Archivkonzept |
| Bilddaten mit Personen | Datenschutz | Aufbewahrung, Zugriffsrechte, Löschkonzept |
| OCR-/ML-Qualität | Fehlklassifikation | Confidence, manuelle Korrektur, Active Learning |
| Routing-Traffic nicht verfügbar | falsche ETA | Provider-Abstraktion, Fallback-Schätzung kennzeichnen |
| Admin-Modus missbraucht | ungewollte Änderungen | TTL, Audit, ggf. Vier-Augen-Freigabe |
| Zu viele Marker / große Bilder | Performance | Clustering, Thumbnails, Presigned Uploads, Worker |

### Migrationsschritte

1. **Inventar:** alle Standorte, Dienste, Wartungen, Personen, Bilder, Protokolle erfassen.
2. **Schlüssel:** Standortnummer normalisieren; Duplikate fachlich entscheiden.
3. **Personen:** Dubletten in `users` zusammenführen; Paten zuordnen.
4. **Dienste:** Freitext → ENUM/FK; Frequenzformate vereinheitlichen.
5. **Wartungen:** Status/Intervalle mappen; externe IDs/Hashes übernehmen.
6. **Protokolle:** Felder → `field_key`; alte PDFs als Anhang referenzieren.
7. **Bilder:** EXIF prüfen; Zielordner-Template und Dateinamen anwenden.
8. **Testimport + Abgleich** mit Altdaten; erst dann Cutover.

---

## 13. Bewusste technische Schulden im Prototyp

Diese Punkte sind absichtlich einfach gehalten und haben einen klaren Upgrade-Pfad:

| Schuld | Jetzt | Upgrade |
|---|---|---|
| Persistenz | `localStorage` | API + PostgreSQL |
| Auth | Demo-Benutzerwechsel | Entra OIDC + Server-Session |
| Admin-Modus | lokaler Boolean | serverseitige Elevation mit TTL + Audit |
| Protokoll-Lock | UI-Sperre | DB-Trigger + Service-Guard |
| PDF | Browser-Druckdialog | serverseitiges PDF + Objektspeicher |
| Historie | Seed-Daten im JSON | `protocol_measurements` + SQL |
| Vektor-Modell | Feature-Heuristik | trainiertes Modell/Embedding + Active Learning |
| OCR | optional per CDN | Worker-Queue, Qualitätsprüfung |
| Routing/ETA | Haversine-Schätzung | Routing-Provider |
| Wetter | direkter Browser-Fetch | API-Proxy mit Cache/Rate-Limit |
| Karten-Fallback | SVG-Punkte | Offline-/Intranet-Tiles |
| Wartungs-Kalenderwoche | vereinfachte Spalten | Stundenraster/Wochenansicht |
| Vorlagen-Editor | Konzeptansicht | visueller Block-Editor |
| HEIC | nicht unterstützt | Konverter im Worker |
| ICS | Datei-Download | abonnierbarer Feed |
| Tests | Datencheck | Unit/API/DB/E2E-Suite |

---

## 14. Start und Referenzen

```bash
npm start        # http://127.0.0.1:5173
npm run check    # Daten-/Strukturprüfung
npm run data     # Demo-Daten neu erzeugen
```

- Prototyp-Quellcode: `index.html`, `styles.css`, `app.js`, `modules/`
- Demo-Daten: `data.js`, Generator: `tools/build-demo-data.mjs`
- Alter PoC gesichert: `archive/index-poc-v0.html`
- Bestehende Repos: `dashboard/`, `wartungstool/`, `Bildertool/`

**Nächster sinnvoller Schritt:** Phase 1 starten – PostgreSQL/PostGIS-Schema,
Entra-Test-Registrierung und RBAC-Guard. Vorher die offenen Entscheidungen in
Kapitel 10 priorisieren.
