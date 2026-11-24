import { useState } from "react";
import type { FormEvent } from "react";
import type { Library } from "../models/types";

type Props = {
  library: Library;
  onChange: (library: Library) => void;
};

export default function SettingsPage({ library, onChange }: Props) {
  const [name, setName] = useState("");
  const categories = library.settings.recipeCategories;

  function addCategory(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (categories.some((c) => c.toLowerCase() === n.toLowerCase())) {
      alert("Diese Kategorie gibt es schon.");
      return;
    }
    onChange({
      ...library,
      settings: {
        ...library.settings,
        recipeCategories: [...categories, n],
      },
    });
    setName("");
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

  return (
    <div>
      <h2>Einstellungen</h2>

      <h3>Rezept-Kategorien</h3>
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
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="primary">
          + Hinzufügen
        </button>
      </form>
    </div>
  );
}