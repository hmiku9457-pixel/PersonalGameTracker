# Personal Game Tracker

Ein statischer, zweisprachiger Web-Tracker für Achievements, Collectibles, Ausrüstung und weitere Spielinhalte. Die Anwendung läuft ohne Produktions-Build direkt auf GitHub Pages und verwendet Vanilla JavaScript, JSON-Manifeste und optional Supabase für den persönlichen Fortschritt.

## Funktionen

- Spieleübersicht mit Gesamtfortschritt
- beliebig tiefe Manifest- und Kategorienavigation
- einheitliche Übersichtskarten mit Inhaltsmetadaten und Fortschrittsbalken
- deutsche und englische Inhalte
- Suche, Statusfilter und Sortierung innerhalb großer Listen
- persönliche Fortschrittsspeicherung über Supabase
- spezielle Karten- und Listenansichten für die Comms aus *The Division 2*
- responsive Darstellung für Desktop und Mobilgeräte
- automatisierte Daten-, Syntax- und Browserprüfung über GitHub Actions

## Projektstruktur

```text
assets/
  css/                    allgemeine und komponentenspezifische Stylesheets
  js/                     Router, Views und Services
  maps/                   Karten für spezielle Tracker-Ansichten
  thumbnails/             Spielkacheln
data/
  games.json              globale Spieleliste
  <gameId>/               Manifest, Fortschrittsindex und Kategoriedaten
scripts/
  generateProgressIndex.mjs
  measurePerformance.mjs
  serveStatic.mjs
  validateOverviewCardMetadata.mjs
  validateRepository.mjs
tests/e2e/                Playwright-Smoke- und Regressionstests
package.json              Entwicklungs- und Prüfkommandos
playwright.config.mjs     Browser-Testkonfiguration
index.html
404.html
```

## Lokal starten

Nach der Installation der Entwicklungsabhängigkeiten:

```bash
npm ci
node scripts/serveStatic.mjs
```

Danach ist die Anwendung unter `http://127.0.0.1:4173` erreichbar.

Alternativ kann für einen einfachen manuellen Test auch ein anderer statischer Webserver verwendet werden.

## Datenmodell

Jedes Spiel besitzt ein `manifest.json`. Ein Manifest-Eintrag verweist entweder auf ein weiteres Manifest oder auf eine konkrete Kategoriedatei.

```json
{
  "id": "achievements",
  "name": {
    "de": "Erfolge",
    "en": "Achievements"
  },
  "description": {
    "de": "Alle im Spiel verfügbaren Erfolge.",
    "en": "All achievements available in the game."
  },
  "type": "category",
  "file": "achievements.json",
  "itemCount": 41,
  "itemLabel": {
    "de": "Erfolge",
    "en": "achievements"
  }
}
```

`itemCount` wird automatisch geprüft. Die Übersichtskarten verwenden zusätzliche Metadaten wie `itemLabel`, `groupCount` und `groupLabel`.

## Entwicklungs- und Prüfkommandos

```bash
npm run generate:progress-index
npm run check:progress-index
npm run validate:data
npm run test:e2e
npm run measure:performance
```

Die Repository-Prüfung kontrolliert unter anderem:

- gültige JSON-Syntax
- vorhandene und sichere Manifestreferenzen
- korrekte `itemCount`-Werte
- aktuelle Fortschrittsindizes
- zweisprachige Übersichtskarten-Metadaten
- die vereinheitlichte Comms-Manifeststruktur
- lokale HTML- und Assetreferenzen
- doppelte Item-IDs
- verwaiste JSON-Dateien und Assets als Warnung

Der Workflow **Repository quality** läuft automatisch bei Pushes und Pull Requests und kann zusätzlich manuell gestartet werden.

## Fortschritt und Supabase

Die Supabase-Integration speichert den persönlichen Fortschritt angemeldeter Benutzer. Der öffentliche Browser-Key ist kein Service-Role-Key; der Zugriff auf Benutzerdaten muss weiterhin durch korrekt konfigurierte Row-Level-Security-Regeln abgesichert sein.

## Deployment

Die Seite wird direkt aus dem `main`-Branch über GitHub Pages ausgeliefert. npm und Playwright werden nur für Entwicklung und Qualitätssicherung verwendet; für das Deployment ist kein Bundler erforderlich.
