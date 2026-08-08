# Personal Game Tracker

Ein statischer, zweisprachiger Web-Tracker für Achievements, Collectibles, Ausrüstung und weitere Spielinhalte. Die Anwendung läuft ohne Build-Schritt auf GitHub Pages und verwendet Vanilla JavaScript, JSON-Manifeste und optional Supabase für den persönlichen Fortschritt.

## Funktionen

- Spieleübersicht mit Gesamtfortschritt
- beliebig tiefe Manifest- und Kategorienavigation
- deutsche und englische Inhalte
- Suche, Statusfilter und Sortierung innerhalb großer Listen
- persönliche Fortschrittsspeicherung über Supabase
- spezielle Karten- und Listenansichten für die Comms aus *The Division 2*
- responsive Darstellung für Desktop und Mobilgeräte
- automatische Daten- und Referenzprüfung über GitHub Actions

## Projektstruktur

```text
assets/
  css/                 Stylesheets
  js/                  Router, Views und Services
  maps/                Karten für spezielle Tracker-Ansichten
  thumbnails/          Spielkacheln
data/
  games.json           globale Spieleliste
  <gameId>/            Manifest und Kategoriedaten eines Spiels
scripts/
  validateRepository.mjs
index.html
404.html
```

## Lokal starten

Da die Anwendung JSON-Dateien mit `fetch()` lädt, sollte sie über einen lokalen Webserver geöffnet werden.

```bash
python -m http.server 8000
```

Danach: `http://localhost:8000`

## Datenmodell

Jedes Spiel besitzt ein `manifest.json`. Ein Manifest-Eintrag verweist entweder auf ein weiteres Manifest oder auf eine konkrete Kategoriedatei.

```json
{
  "id": "achievements",
  "name": "Achievements",
  "type": "category",
  "file": "achievements.json",
  "itemCount": 41
}
```

`itemCount` wird durch das Repository-Prüfskript verifiziert und dient der schnellen Fortschrittsberechnung auf der Spieleübersicht. Die eigentlichen Itemdateien müssen dafür nicht vollständig in den Browser geladen werden.

## Prüfung ausführen

```bash
node scripts/validateRepository.mjs
```

Die Prüfung kontrolliert unter anderem:

- gültige JSON-Syntax
- vorhandene Manifest-Referenzen
- korrekte `itemCount`-Werte
- die vereinheitlichte Comms-Manifeststruktur
- lokale Datei-Referenzen aus `index.html` und `404.html`
- doppelte Item-IDs als Warnung

Der Workflow `Repository quality` läuft automatisch bei Pushes und Pull Requests.

## Fortschritt und Supabase

Die bestehende Supabase-Integration und das Datenbankmodell werden durch die Repository-Optimierung nicht verändert. Der öffentliche Browser-Key ist kein Service-Role-Key; der Zugriff auf Benutzerdaten muss weiterhin über korrekt konfigurierte Row-Level-Security-Regeln abgesichert sein.

## Deployment

Die Seite kann direkt über GitHub Pages aus dem `main`-Branch ausgeliefert werden. Es ist kein npm-Build und kein Bundler erforderlich.
