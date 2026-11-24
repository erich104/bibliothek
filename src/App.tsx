import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  login,
  loadLibrary,
  saveLibrary,
  isLoggedIn,
  getLoginError,
} from "./storage/driveStorage";
import { normalizeLibrary } from "./models/types";
import type { Library } from "./models/types";
import Recipes from "./pages/Recipes";
import Todos from "./pages/Todos";
import Contracts from "./pages/Contracts";
import SettingsPage from "./pages/SettingsPage";

type Tab = "recipes" | "travel" | "todos" | "contracts" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "recipes", label: "Rezepte" },
  { id: "travel", label: "Reisen" },
  { id: "todos", label: "To-Do" },
  { id: "contracts", label: "Verträge" },
  { id: "settings", label: "Einstellungen" },
];

export default function App() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [status, setStatus] = useState(
    getLoginError()
      ? `Anmeldung fehlgeschlagen: ${getLoginError()}`
      : "Nicht angemeldet"
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("recipes");
  const started = useRef(false);

  // Beim Start: Sind wir gerade von der Google-Anmeldung zurückgekehrt? Dann Daten laden.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!isLoggedIn()) return;

    (async () => {
      try {
        setStatus("Angemeldet, lade Daten …");
        const pending = sessionStorage.getItem("pending_library");
        if (pending) {
          // Änderungen, die vor dem erneuten Anmelden noch nicht gespeichert werden konnten
          sessionStorage.removeItem("pending_library");
          await updateLibrary(normalizeLibrary(JSON.parse(pending)));
        } else {
          const lib = await loadLibrary();
          setLibrary(lib);
          setStatus("Daten geladen");
        }
      } catch (e) {
        setStatus(String(e));
      }
    })();
  }, []);

  function handleLogin() {
    sessionStorage.removeItem("pending_library");
    login();
  }

  // Zentrale Stelle: Daten ändern und in Drive speichern
  async function updateLibrary(updated: Library) {
    setLibrary(updated);
    setStatus("Speichere …");
    setSaveFailed(false);
    try {
      await saveLibrary(updated);
      setStatus("Gespeichert ✓");
    } catch (e) {
      setSaveFailed(true);
      setStatus(`Speichern fehlgeschlagen: ${String(e)}`);
    }
  }

  // Falls die Anmeldung nach einer Stunde abgelaufen ist:
  // Änderungen kurz zwischenspeichern, neu anmelden, danach speichern
  function retrySave() {
    if (!library) return;
    try {
      sessionStorage.setItem("pending_library", JSON.stringify(library));
    } catch {
      alert(
        "Die Änderungen konnten nicht zwischengespeichert werden. Bitte exportiere zuerst ein Backup."
      );
      return;
    }
    login();
  }

  function exportJson() {
    if (!library) return;
    const blob = new Blob([JSON.stringify(library, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bibliothek-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (
          typeof data !== "object" ||
          data === null ||
          !Array.isArray(data.recipes)
        ) {
          throw new Error("Ungültiges Format");
        }
        if (!confirm("Die aktuellen Daten durch den Inhalt der Datei ersetzen?")) {
          return;
        }
        updateLibrary(normalizeLibrary(data));
      } catch {
        alert("Die Datei konnte nicht gelesen werden.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Noch nicht angemeldet
  if (!library) {
    return (
      <div className="container">
        <h1>Meine Bibliothek</h1>
        <p className="muted">Status: {status}</p>
                <p className="muted">
          ID: {String(import.meta.env.VITE_GOOGLE_CLIENT_ID)} (Länge:{" "}
          {String(import.meta.env.VITE_GOOGLE_CLIENT_ID).length})
        </p>
        <button className="primary" onClick={handleLogin}>
          Mit Google anmelden
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Meine Bibliothek</h1>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="muted">
        {status}{" "}
        {saveFailed && (
          <button onClick={retrySave}>Erneut anmelden & speichern</button>
        )}
      </p>

      {tab === "recipes" && (
        <Recipes
          recipes={library.recipes}
          categories={library.settings.recipeCategories}
          onChange={(recipes) => updateLibrary({ ...library, recipes })}
        />
      )}

      {tab === "travel" && (
        <p className="muted">Die Reisekarte kommt im nächsten Schritt.</p>
      )}

      {tab === "todos" && (
        <Todos
          todos={library.todos}
          onChange={(todos) => updateLibrary({ ...library, todos })}
        />
      )}

      {tab === "contracts" && (
        <Contracts
          contracts={library.contracts}
          onChange={(contracts) => updateLibrary({ ...library, contracts })}
        />
      )}

      {tab === "settings" && (
        <SettingsPage library={library} onChange={updateLibrary} />
      )}

      <hr />
      <div className="row">
        <button onClick={exportJson}>Backup exportieren</button>
        <label className="filebutton">
          Backup importieren
          <input type="file" accept=".json" onChange={importJson} hidden />
        </label>
      </div>
    </div>
  );
}