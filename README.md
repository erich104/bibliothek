# Meine Bibliothek

Persönliche Web-App für den Eigenbedarf: eine "Bibliothek" für Rezepte, Reisen, Aufgaben und Verträge/Abos.
Gebaut als erstes größeres Projekt, läuft im Browser (später als PWA auf Handy, Tablet und Laptop).

## Ziele

- Nur für den Eigengebrauch, ein Nutzer
- Zugriff von Handy, Tablet und Laptop
- Möglichst kostenlos, keine eigene Serverpflege
- Daten gehören mir und liegen in meinem Google Drive

## Funktionen

### Fertig

- **Rezepte**: anlegen, bearbeiten, löschen; Zutaten (Menge/Einheit/Name), Zubereitungsschritte,
  Portionen, Zeit, Bewertung, Tags, Quelle, Notizen
- **Kategorien** (Hauptgang, Vorspeise, Nachspeise, Kuchen, Getränk), eigene Kategorien in den Einstellungen
- **Rezeptbild** (wird automatisch verkleinert), Vorschau in der Liste
- Suche (Titel/Zutat), Filter nach Kategorie und Tag
- **PDF-Export** pro Rezept (über den Druckdialog des Browsers: "Als PDF speichern")
- **To-Do-Liste** mit optionalem Datum
- **Verträge/Abos**: Kosten, Zahlweise, Laufzeit, Kündigungsfrist, Summe pro Monat/Jahr
- **Einstellungen**: Rezept-Kategorien verwalten
- **Backup**: Export/Import aller Daten als JSON-Datei
- Anmeldung mit Google, Speicherung in Google Drive

### Geplant

1. Deployment (GitHub Pages / Cloudflare Pages / Netlify), damit Handy und Tablet zugreifen können
2. **Reisebibliothek** mit Weltkarte (Leaflet + OpenStreetMap), Pins für besuchte Orte und Wunschorte,
   Formular zum Anlegen, Import (z. B. Google Takeout)
3. Standort-Funktion: gespeicherte Orte in der Nähe anzeigen
4. PWA (zum Startbildschirm hinzufügen), Offline-Modus
5. Rezept-Import per URL, Verknüpfung von Rezepten und Orten
6. Design-Feinschliff (bewusst zum Schluss)

## Technik

- React + TypeScript, gebaut mit Vite
- Speicher: Google Drive API, Bereich `drive.appdata` (versteckter App-Ordner), eine Datei `bibliothek.json`
- Anmeldung: Google Identity Services (Token-Modell), Token gilt ca. 1 Stunde
- Karte (geplant): Leaflet + OpenStreetMap, Ortssuche über Nominatim
- Linter: Oxlint

## Projektstruktur

```
src/
  models/types.ts           Datentypen (Recipe, Place, Todo, Contract, Settings, Library)
  storage/driveStorage.ts   ALLES rund um Google Drive (login, loadLibrary, saveLibrary)
  utils/image.ts            Bild verkleinern
  utils/format.ts           Datums-Hilfsfunktionen
  components/RecipeForm.tsx Formular für Rezepte
  pages/Recipes.tsx         Rezeptliste, Detailansicht, PDF-Druck
  pages/Todos.tsx           To-Do-Liste
  pages/Contracts.tsx       Verträge/Abos
  pages/SettingsPage.tsx    Einstellungen (Kategorien)
  App.tsx                   Anmeldung, Reiter, zentrales Speichern, Backup
  index.css                 Styles inkl. Druckansicht
```

Wichtige Regel: **Nur `driveStorage.ts` spricht mit Google Drive.** Dadurch lässt sich der Speicher später
austauschen (z. B. gegen Supabase), ohne die restliche App umzubauen.

## Datenmodell (Kurzfassung)

Alles steckt in einer Datei `bibliothek.json`:

```
{
  version, recipes[], places[], todos[], contracts[],
  settings: { recipeCategories[] }
}
```

Beim Laden ergänzt `normalizeLibrary()` fehlende Felder, damit ältere Daten weiter funktionieren.
Rezeptbilder liegen als verkleinerte JPEG-Data-URLs (max. 640 px) direkt im Rezept.

## Lokal starten

Voraussetzung: Node.js (LTS).

```
npm install
npm run dev
```

Dann `http://localhost:5173` öffnen.

Unter Windows kann PowerShell Skripte blockieren (Fehler bei `npm`). Einmalig beheben mit:

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Google-Einrichtung

1. Projekt in der Google Cloud Console, Google Drive API aktivieren
2. Google Auth Platform: Zielgruppe "Extern", eigene Mail als Testnutzer eintragen
3. Datenzugriff: Bereich `.../auth/drive.appdata`
4. OAuth-Client (Webanwendung), autorisierte JavaScript-Quellen: `http://localhost:5173`
   (später zusätzlich die echte Adresse der veröffentlichten App)
5. Client-ID in die Datei `.env` im Projektordner schreiben:

```
VITE_GOOGLE_CLIENT_ID=DEINE-ID.apps.googleusercontent.com
```

Die Client-ID ist kein Geheimnis (sie steckt im Frontend). Es gibt kein Client-Secret in dieser App.
Beim ersten Login erscheint "Google hat diese App nicht überprüft": unter "Erweitert" weiter zur App.

## Entscheidungen

- Google Drive statt Datenbank, weil kostenlos und ohne Server; nur ein Nutzer
- Jedes Google-Konto hat seine eigene Datei im App-Ordner (kein gemeinsamer Speicherstand).
  Falls später mehrere Personen gemeinsam arbeiten sollen: Wechsel auf Supabase
- PDF über den Druckdialog des Browsers statt einer PDF-Bibliothek (einfach, keine Abhängigkeit)
- Design und Feinschliff zum Schluss

## Hinweise für KI-Assistenten (Copilot, Claude)

- Der Nutzer ist Anfänger in der Webentwicklung: einfach erklären, Schritt für Schritt, Dateinamen nennen
- Oberfläche und Kommentare auf Deutsch
- Möglichst wenige zusätzliche Bibliotheken
- Google-Zugriff nur in `src/storage/driveStorage.ts`
- Neue Felder im Datenmodell immer optional machen oder in `normalizeLibrary()` mit Standardwert ergänzen
- Keine Browser-Speicher-Tricks als Hauptspeicher: die Daten gehören nach Drive