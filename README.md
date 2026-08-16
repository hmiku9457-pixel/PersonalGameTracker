# Personal Game Tracker

Ein statischer, zweisprachiger Web-Tracker für Achievements, Collectibles,
Ausrüstung und weitere Spielinhalte. Die Anwendung läuft ohne Produktions-Build
direkt auf GitHub Pages und verwendet Vanilla JavaScript, JSON-Manifeste und
optional Supabase für den persönlichen Fortschritt.

## Funktionen

- Spieleübersicht mit Gesamtfortschritt
- beliebig tiefe Manifest- und Kategorienavigation
- einheitliche Übersichtskarten mit Inhaltsmetadaten und Fortschrittsbalken
- deutsche und englische Inhalte
- Suche, Statusfilter und Sortierung innerhalb großer Listen
- persönliche Fortschrittsspeicherung über Supabase
- spezielle Karten- und Listenansichten für die Comms aus *The Division 2*
- responsive Darstellung für Desktop und Mobilgeräte

## Projektstruktur

```text
assets/
  css/                    Stylesheets
  js/                     Router, Views und Services
  maps/                   Karten für spezielle Tracker-Ansichten
  thumbnails/             Spielkacheln
data/
  games.json              globale Spieleliste
  <gameId>/               Manifest, Fortschrittsindex und Kategoriedaten
scripts/
  generateProgressIndex.mjs
  serveStatic.mjs
.github/workflows/
  deploy-pages.yml        manueller GitHub-Pages-Deploy
index.html
404.html
package.json
```

## Entwicklungsprinzip

Der Personal Game Tracker ist ein privates Projekt. Änderungen werden bewusst
nicht durch eine umfangreiche automatische Test- oder Validator-Pipeline
abgesichert.

Der normale Ablauf ist:

1. Dateien und Daten ändern.
2. Bei Änderungen an Item- oder Manifestdaten den Fortschrittsindex neu erzeugen.
3. Änderungen committen.
4. Den GitHub-Pages-Workflow manuell starten.
5. Die betroffenen Funktionen auf der veröffentlichten Seite selbst prüfen.

Dadurch bleibt das Repository einfach und der Wartungsaufwand gering.

## Lokal starten

Für einen lokalen statischen Webserver ist keine Installation von
Abhängigkeiten erforderlich.

```bash
npm run serve
```

Alternativ:

```bash
node scripts/serveStatic.mjs
```

Danach ist die Anwendung unter `http://127.0.0.1:4173` erreichbar.

## Datenmodell

Jedes Spiel besitzt ein `manifest.json`. Ein Manifest-Eintrag verweist
entweder auf ein weiteres Manifest oder auf eine konkrete Kategoriedatei.

Beispiel:

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

Übersichtskarten können zusätzliche Metadaten wie `itemLabel`, `groupCount`
und `groupLabel` verwenden. Spezielle Ansichten können über die dafür
vorgesehenen Manifest-Metadaten konfiguriert werden.

## Fortschrittsindex

Die Übersichten verwenden `progressIndex.json`, damit Fortschritte über
stabile Item-IDs berechnet werden können, ohne für jede Karte alle großen
Datendateien zu laden.

Nach Änderungen an:

- Item-IDs
- neuen oder entfernten Items
- Manifestreferenzen
- Kategorien oder Datendateien

sollte der Index neu erzeugt werden:

```bash
npm run generate:progress-index
```

oder direkt:

```bash
node scripts/generateProgressIndex.mjs
```

Die erzeugten `progressIndex.json`-Dateien werden anschließend normal mit
den übrigen Änderungen committed.

## Fortschritt und Supabase

Die Supabase-Integration speichert den persönlichen Fortschritt angemeldeter
Benutzer. Der öffentliche Browser-Key ist kein Service-Role-Key.

Der Schutz der Benutzerdaten erfolgt über die in Supabase konfigurierten
Row-Level-Security-Regeln. Diese Policies müssen sicherstellen, dass ein
Benutzer ausschließlich auf seine eigenen Fortschrittsdaten zugreifen kann.

## Deployment

Unter **Settings → Pages → Build and deployment** ist als Source
**GitHub Actions** konfiguriert.

Das Deployment wird nicht bei jedem Commit automatisch gestartet.

Nach abgeschlossenen Änderungen:

1. **Actions** öffnen.
2. **Deploy GitHub Pages** auswählen.
3. **Run workflow** starten.
4. Nach dem Deployment die geänderten Funktionen manuell prüfen.

Der Deployment-Workflow veröffentlicht ausschließlich die für die statische
Seite benötigten Dateien. Es ist kein npm-Build, Bundler oder Framework
erforderlich.

## Wartung

Für dieses Projekt gilt bewusst:

- keine automatischen Browsertests
- keine Repository-Validatoren
- keine Performance-Testpipeline
- keine Build-Pipeline
- manuelles Deployment
- manuelle Funktionsprüfung nach Änderungen

Einmalige `package-*.yml`-Workflows dienen nur zum Anwenden größerer
Update-Pakete und sollten nach erfolgreicher Verwendung wieder aus
`.github/workflows/` entfernt werden.
