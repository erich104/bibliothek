# Meine Bibliothek

Persönliche Web-App für den Eigenbedarf: Rezepte, Reisen, Kalender, Aufgaben, Einkaufsliste und Verträge/Abos an einem Ort.
Läuft im Browser und lässt sich als App auf Handy, Tablet und Laptop installieren (PWA).
(Arbeitstitel, ein neuer Name ist geplant.)

## Ziele

- Nur für den Eigengebrauch, ein Nutzer
- Zugriff von Handy, Tablet und Laptop
- Möglichst kostenlos, keine eigene Serverpflege
- Daten gehören mir und liegen in meinem Google Drive

## Funktionen

### Fertig

- **Start**: Anstehendes (überfällige/fällige To-Dos, Termine, Kündigungsfristen), **Einkaufsliste**
  (Zutaten per Knopf aus Rezepten, abhaken, Abgehakte bleiben bis "entfernen"), Zufallsrezept
  ("Was koche ich heute?"), Orte in der Nähe (mit Route)
- **Rezepte**: Formular, Bild, Kategorien, Tags, Suche, Filter, PDF-Export (Druckdialog), Zutaten auf die Einkaufsliste
- **Reisen**: Weltkarte (Leaflet/OpenStreetMap), Pins mit Label-Farben, Häkchen bei "besucht",
  goldener Rand bei Highlights, Ortssuche, eigener Standort als blauer Punkt, Label-Filter
- **Kalender**: Monatsansicht, eigene Termine (mehrtägig, Uhrzeit), **Wiederholungen** (täglich bis jährlich, alle n Einheiten,
  optional mit Ende), **Kategorien mit Farben**, zeigt auch To-Dos, Kündigungsfristen und Reisedaten
- **To-Do**: Fälligkeit, **Priorität** (Dringend/Zeitnah/Nicht dringend), Hervorhebung nach Dringlichkeit
- **Verträge/Abos**: Kosten, Zahlweise, Laufzeit, Kündigungsfrist, Summe pro Monat/Jahr
- **Konfiguration**: Kategorien (Rezepte, Kalender), Labels mit Farben (Reisen), Backup Export/Import (alles in einer Datei)
- Anmeldung mit Google (Weiterleitung), Speichern in Google Drive (gebündelt), Abmelden-Knopf
- **PWA**: App-Symbol, Vollbild, schneller Start, Oberfläche auch ohne Netz

### Geplant

1. **Kostenübersicht**: Monatsplanung (Gehalt, Kostengruppen), Vertragskosten automatisch,
   Abbuchungsmonate, Preisprüfung alle 6 Monate (als Kalendertermin mit Bestätigen)
2. Neuer Name
3. Rezept-Import per Link (braucht eine kleine Zwischenstation, z. B. Cloudflare Worker)
4. Offline-Lesemodus (lokale Kopie der Daten, bewusste Entscheidung nötig)
5. Google-Kalender anzeigen, Google-Maps-Import für Orte
6. Portionen umrechnen, wiederkehrende To-Dos
7. Design-Feinschliff (bewusst zum Schluss)

## Technik

- React + TypeScript, gebaut mit Vite, Linter: Oxlint
- Speicher: Google Drive API, Bereich `drive.appdata` (versteckter App-Ordner), eine Datei `bibliothek.json`
- Anmeldung: OAuth per Weiterleitung (Token im URL-Fragment, nur im Arbeitsspeicher, gilt ca. 1 Stunde)
- Karte: Leaflet + OpenStreetMap, Ortssuche über Nominatim
- Hosting: GitHub Pages (automatisch per GitHub Actions bei jedem Push auf `main`)
- PWA: `public/manifest.webmanifest`, `public/sw.js` (Service Worker, speichert nur App-Dateien)

## Projektstruktur

```
src/
  models/types.ts            Datentypen, Standardwerte, normalizeLibrary()
  storage/driveStorage.ts    ALLES rund um Google Drive und Anmeldung (login, logout, loadLibrary, saveLibrary)
  utils/                     format (Datum), colors, geo, geocode, image, mapIcons, calendarItems
  components/                RecipeForm, PlaceForm, MapFlyTo
  pages/                     Home, Recipes, Travel, Calendar, Todos, Contracts, SettingsPage (= Konfiguration)
  App.tsx                    Anmeldung, Reiter, zentrales gebündeltes Speichern, Backup-Funktionen
  index.css                  Styles inkl. Druckansicht
public/                      Symbole, manifest.webmanifest, sw.js
.github/workflows/deploy.yml Deployment auf GitHub Pages
```

Wichtige Regel: **Nur `driveStorage.ts` spricht mit Google Drive.** Dadurch lässt sich der Speicher später
austauschen (z. B. gegen Supabase), ohne die restliche App umzubauen.

## Datenmodell (Kurzfassung)

Alles steckt in einer Datei `bibliothek.json`:

```
{
  version, recipes[], places[], todos[], contracts[], events[], shopping[],
  settings: { recipeCategories[], placeLabels[], eventCategories[] }
}
```

Beim Laden ergänzt `normalizeLibrary()` fehlende Felder. Neue Felder immer optional machen oder dort mit Standardwert ergänzen.
Rezeptbilder liegen als verkleinerte JPEG-Data-URLs (max. 640 px) direkt im Rezept.
Wiederholte Termine werden nur einmal gespeichert (`repeat`) und beim Anzeigen berechnet.

## Lokal starten

Voraussetzung: Node.js (LTS).

```
npm install
npm run dev
```

Dann `http://localhost:5173/` öffnen (mit Schrägstrich am Ende).
Unter Windows kann PowerShell Skripte blockieren; einmalig beheben mit:
`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## Google-Einrichtung

1. Projekt in der Google Cloud Console, Google Drive API aktivieren
2. Google Auth Platform: Zielgruppe "Extern", eigene Mail(s) als Testnutzer eintragen
3. Datenzugriff: Bereich `.../auth/drive.appdata`
4. OAuth-Client (Webanwendung):
   - Autorisierte JavaScript-Quellen: `http://localhost:5173` und `https://erich104.github.io`
   - Autorisierte Weiterleitungs-URIs (mit Schrägstrich am Ende!): `http://localhost:5173/` und `https://erich104.github.io/bibliothek/`
5. Client-ID in die Datei `.env` schreiben (nur diese eine Zeile, ohne Anführungszeichen und ohne Leerzeichen):

```
VITE_GOOGLE_CLIENT_ID=DEINE-ID.apps.googleusercontent.com
```

Die Client-ID ist kein Geheimnis. Es gibt kein Client-Secret in dieser App.
Beim ersten Login erscheint "Google hat diese App nicht überprüft": unter "Erweitert" weiter zur App.

## Deployment

- Repository `bibliothek` auf GitHub (öffentlich), Pages-Quelle "GitHub Actions"
- Repository-Variable `VITE_GOOGLE_CLIENT_ID` (unter Settings → Secrets and variables → Actions → Variables)
- Jeder Push auf `main` baut und veröffentlicht die Seite: `https://erich104.github.io/bibliothek/`
- Änderungen veröffentlichen: `git add .`, `git commit -m "..."`, `git push`
- `vite.config.ts` setzt `base: "/bibliothek/"` nur für den Build

## Sicherheit

- Die Webseite ist öffentlich, die Daten nicht: Sie liegen im versteckten App-Ordner meines Google-Kontos
- Die App sieht nur ihren eigenen App-Ordner (`drive.appdata`), nicht das übrige Drive
- Das Anmelde-Token wird nie dauerhaft gespeichert
- GitHub-Konto mit Zwei-Faktor-Authentifizierung schützen (wer pushen kann, kann den App-Code ändern)
- Backup-Dateien (`bibliothek-backup-*.json`) und `.env` nie hochladen (stehen in `.gitignore`)
- Keine IBAN, Passwörter oder Vertragsnummern in Notizen speichern

## Entscheidungen

- Google Drive statt Datenbank, weil kostenlos und ohne Server; nur ein Nutzer
- Anmeldung per Weiterleitung statt Popup (Popup lieferte auf Laptop und Handy nur `popup_closed`)
- Jedes Google-Konto hat seine eigene Datei; bei gemeinsamer Nutzung später Wechsel auf Supabase
- PDF über den Druckdialog des Browsers statt einer PDF-Bibliothek
- Speichern gebündelt (kurze Pause nach der letzten Änderung), damit nicht jede Änderung einzeln hochgeladen wird
- Design und Feinschliff zum Schluss

## Hinweise für KI-Assistenten (Copilot, Claude)

- Der Nutzer ist Anfänger in der Webentwicklung: einfach erklären, Schritt für Schritt, Dateinamen nennen
- Oberfläche und Kommentare auf Deutsch
- Möglichst wenige zusätzliche Bibliotheken
- Google-Zugriff nur in `src/storage/driveStorage.ts`
- Neue Felder im Datenmodell optional machen oder in `normalizeLibrary()` mit Standardwert ergänzen
- Daten gehören nach Drive, Browser-Speicher nur für kurzlebige Dinge