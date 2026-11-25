import { useState } from "react";
import type { FormEvent } from "react";
import type { Library } from "../models/types";
import { safeColor } from "../utils/colors";

type Props = {
  library: Library;
  onChange: (library: Library) => void;
};

export default function SettingsPage({ library, onChange }: Props) {
  const [catName, setCatName] = useState("");
  const [labelName, setLabelName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");

  const categories = library.settings.recipeCategories;
  const labels = library.settings.placeLabels;

  // ---- Rezept-Kategorien ----
  function addCategory(e: FormEvent) {
    e.preventDefault();
    const n = catName.trim();
    if (!n) return;
    if (categories.some((c) => c.toLowerCase() === n.toLowerCase())) {
      alert("Diese Kategorie gibt es schon.");
      return;
    }
    onChange({
      ...library,
      settings: { ...library.settings, recipeCategories: [...categories, n] },
    });
    setCatName("");
  }

  function removeCategory(cat: string) {
    const used = library.recipes.filter((r) => r.category === cat).length;
    const message =
      used > 0
        ? `„${cat}“ wird von ${used} Rezept(en) verwendet. Die Rezepte bleiben erhalten, haben dann aber keine Kategorie mehr. Trotzdem löschen?`
        : `Kategorie „${cat}“ löschen?`;
    if (!confirm(message)) return;
    onChange({
      ...library,
      recipes: library.recipes.map((r) =>
        r.category === cat ? { ...r, category: undefined } : r
      ),
      settings: {
        ...library.settings,
        recipeCategories: categories.filter((c) => c !== cat),
      },
    });
  }

  // ---- Reise-Labels ----
  function addLabel(e: FormEvent) {
    e.preventDefault();
    const n = labelName.trim();
    if (!n) return;
    if (labels.some((l) => l.name.toLowerCase() === n.toLowerCase())) {
      alert("Dieses Label gibt es schon.");
      return;
    }
    onChange({
      ...library,
      settings: {
        ...library.settings,
        placeLabels: [...labels, { name: n, color: newColor }],
      },
    });
    setLabelName("");
  }

  function changeLabelColor(name: string, color: string) {
    onChange({
      ...library,
      settings: {
        ...library.settings,
        placeLabels: labels.map((l) => (l.name === name ? { ...l, color } : l)),
      },
    });
  }

  function removeLabel(name: string) {
    const used = library.places.filter((p) => p.labels?.includes(name)).length;
    const message =
      used > 0
        ? `„${name}“ wird von ${used} Ort(en) verwendet. Die Orte bleiben erhalten und verlieren nur dieses Label. Trotzdem löschen?`
        : `Label „${name}“ löschen?`;
    if (!confirm(message)) return;
    onChange({
      ...library,
      places: library.places.map((p) => {
        if (!p.labels?.includes(name)) return p;
        const remaining = p.labels.filter((n) => n !== name);
        return {
          ...p,
          labels: remaining.length ? remaining : undefined,
          mainLabel: p.mainLabel === name ? remaining[0] : p.mainLabel,
        };
      }),
      settings: {
        ...library.settings,
        placeLabels: labels.filter((l) => l.name !== name),
      },
    });
  }

  return (
    <div>
      <h2>Einstellungen</h2>

      <details className="settings-group">
        <summary>Rezepte</summary>
        <div className="settings-body">
          <h3>Kategorien</h3>
          <ul className="todo-list">
            {categories.map((c) => (
              <li className="todo-item" key={c}>
                <span style={{ flex: 1 }}>{c}</span>
                <button onClick={() => removeCategory(c)}>✕</button>
              </li>
            ))}
          </ul>
          {categories.length === 0 && (
            <p className="muted">Keine Kategorien vorhanden.</p>
          )}
          <form className="row" onSubmit={addCategory}>
            <input
              placeholder="Neue Kategorie, z. B. Frühstück"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
            />
            <button type="submit" className="primary">
              + Hinzufügen
            </button>
          </form>
        </div>
      </details>

      <details className="settings-group">
        <summary>Reisen</summary>
        <div className="settings-body">
          <h3>Labels</h3>
          <p className="muted">
            Jeder Ort kann mehrere Labels haben. Die Farbe des Hauptlabels
            bestimmt die Farbe des Pins auf der Karte.
          </p>
          <ul className="todo-list">
            {labels.map((l) => (
              <li className="todo-item" key={l.name}>
                <input
                  type="color"
                  className="color-input"
                  value={safeColor(l.color)}
                  onChange={(e) => changeLabelColor(l.name, e.target.value)}
                  title="Farbe ändern"
                />
                <span style={{ flex: 1 }}>{l.name}</span>
                <button onClick={() => removeLabel(l.name)}>✕</button>
              </li>
            ))}
          </ul>
          {labels.length === 0 && (
            <p className="muted">Keine Labels vorhanden.</p>
          )}
          <form className="row" onSubmit={addLabel}>
            <input
              type="color"
              className="color-input"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              title="Farbe wählen"
            />
            <input
              placeholder="Neues Label, z. B. Klettersteig"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
            />
            <button type="submit" className="primary">
              + Hinzufügen
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}