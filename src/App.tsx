import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  login,
  logout,
  loadLibrary,
  saveLibrary,
  isLoggedIn,
  getLoginError,
} from "./storage/driveStorage";
import { normalizeLibrary } from "./models/types";
import type { Library, Recipe, ShoppingItem } from "./models/types";
import Home from "./pages/Home";
import Recipes from "./pages/Recipes";
import Travel from "./pages/Travel";
import Calendar from "./pages/Calendar";
import Todos from "./pages/Todos";
import Contracts from "./pages/Contracts";
import Costs from "./pages/Costs";
import SettingsPage from "./pages/SettingsPage";

type Tab =
  | "home"
  | "recipes"
  | "travel"
  | "calendar"
  | "todos"
  | "contracts"
  | "costs"
  | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Start" },
  { id: "recipes", label: "Rezepte" },
  { id: "travel", label: "Reisen" },
  { id: "calendar", label: "Kalender" },
  { id: "todos", label: "To-Do" },
  { id: "contracts", label: "Verträge" },
  { id: "costs", label: "Kosten" },
  { id: "settings", label: "Konfiguration" },
];

export default function App() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [status, setStatus] = useState(
    getLoginError()
      ? `Anmeldung fehlgeschlagen: ${getLoginError()}`
      : "Nicht angemeldet"
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const started = useRef(false);

  // Für das gebündelte Speichern
  const latest = useRef<Library | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saving = useRef(false);
  const dirty = useRef(false);
  const pendingChanges = useRef(false);

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
          updateLibrary(normalizeLibrary(JSON.parse(pending)));
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

  // Beim Wechsel in eine andere App/einen anderen Tab sofort speichern
  useEffect(() => {
    function onHide() {
      if (
        document.visibilityState === "hidden" &&
        pendingChanges.current &&
        !saving.current
      ) {
        window.clearTimeout(timer.current);
        flushSave();
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  function handleLogin() {
    sessionStorage.removeItem("pending_library");
    login();
  }

  function handleLogout() {
    if (pendingChanges.current && !saveFailed) {
      alert("Es wird noch gespeichert. Bitte versuche es in einem Moment noch einmal.");
      return;
    }
    if (saveFailed && !confirm("Es gibt ungespeicherte Änderungen. Trotzdem abmelden?")) {
      return;
    }
    window.clearTimeout(timer.current);
    logout();
    latest.current = null;
    pendingChanges.current = false;
    setLibrary(null);
    setSaveFailed(false);
    setTab("home");
    setStatus("Abgemeldet.");
  }

  // Zentrale Stelle: Daten ändern, kurz warten, dann gebündelt in Drive speichern
  function updateLibrary(updated: Library) {
    setLibrary(updated);
    latest.current = updated;
    pendingChanges.current = true;
    setSaveFailed(false);
    setStatus("Änderungen …");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flushSave, 800);
  }

  async function flushSave() {
    timer.current = undefined;
    if (saving.current) {
      dirty.current = true;
      return;
    }
    const lib = latest.current;
    if (!lib || !pendingChanges.current) return;
    pendingChanges.current = false;
    saving.current = true;
    setStatus("Speichere …");
    try {
      await saveLibrary(lib);
      setSaveFailed(false);
      setStatus(pendingChanges.current ? "Änderungen …" : "Gespeichert ✓");
    } catch (e) {
      pendingChanges.current = true;
      setSaveFailed(true);
      setStatus(`Speichern fehlgeschlagen: ${String(e)}`);
    } finally {
      saving.current = false;
      if (dirty.current) {
        dirty.current = false;
        flushSave();
      }
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

  // Zutaten eines Rezepts auf die Einkaufsliste setzen (gibt die Anzahl neuer Einträge zurück)
  function addToShopping(recipe: Recipe): number {
    if (!library) return 0;
    const open = new Set(
      library.shopping.filter((s) => !s.done).map((s) => s.text.toLowerCase())
    );
    const fresh: ShoppingItem[] = [];
    for (const ing of recipe.ingredients) {
      const text = [ing.amount, ing.unit, ing.name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (!text || open.has(text.toLowerCase())) continue;
      open.add(text.toLowerCase());
      fresh.push({
        id: crypto.randomUUID(),
        text,
        done: false,
        recipeTitle: recipe.title,
      });
    }
    if (fresh.length > 0) {
      updateLibrary({ ...library, shopping: [...library.shopping, ...fresh] });
    }
    return fresh.length;
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
        <button className="primary" onClick={handleLogin}>
          Mit Google anmelden
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row" style={{ alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Meine Bibliothek</h1>
        <button onClick={handleLogout}>Abmelden</button>
      </div>

      <div className="tabs" style={{ marginTop: 12 }}>
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

      {tab === "home" && (
        <Home
          library={library}
          onChange={updateLibrary}
          addToShopping={addToShopping}
        />
      )}

      {tab === "recipes" && (
        <Recipes
          recipes={library.recipes}
          categories={library.settings.recipeCategories}
          onChange={(recipes) => updateLibrary({ ...library, recipes })}
          onAddToShopping={addToShopping}
          onGoHome={() => setTab("home")}
        />
      )}

      {tab === "travel" && (
        <Travel
          places={library.places}
          labels={library.settings.placeLabels}
          onChange={(places) => updateLibrary({ ...library, places })}
        />
      )}

      {tab === "calendar" && (
        <Calendar library={library} onChange={updateLibrary} />
      )}

      {tab === "todos" && (
        <Todos
          todos={library.todos}
          onChange={(todos) => updateLibrary({ ...library, todos })}
        />
      )}

      {tab === "contracts" && (
        <Contracts library={library} onChange={updateLibrary} />
      )}

      {tab === "costs" && <Costs library={library} onChange={updateLibrary} />}

      {tab === "settings" && (
          <SettingsPage
          library={library}
          onChange={updateLibrary}
          onExport={exportJson}
          onImport={importJson}
        />
      )}

      </div>
  );
}