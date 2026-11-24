import { useState } from "react";
import type { Recipe } from "../models/types";
import RecipeForm from "../components/RecipeForm";

type Props = {
  recipes: Recipe[];
  categories: string[];
  onChange: (recipes: Recipe[]) => void;
};

type View =
  | { type: "list" }
  | { type: "form"; recipe?: Recipe }
  | { type: "detail"; id: string };

export default function Recipes({ recipes, categories, onChange }: Props) {
  const [view, setView] = useState<View>({ type: "list" });
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const allTags = Array.from(new Set(recipes.flatMap((r) => r.tags))).sort();

  const filtered = recipes
    .filter((r) => {
      const text = (
        r.title +
        " " +
        r.ingredients.map((i) => i.name).join(" ")
      ).toLowerCase();
      const matchesSearch = text.includes(search.toLowerCase());
      const matchesTag = !activeTag || r.tags.includes(activeTag);
      const matchesCategory = !activeCategory || r.category === activeCategory;
      return matchesSearch && matchesTag && matchesCategory;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function saveRecipe(recipe: Recipe) {
    const exists = recipes.some((r) => r.id === recipe.id);
    onChange(
      exists
        ? recipes.map((r) => (r.id === recipe.id ? recipe : r))
        : [...recipes, recipe]
    );
    setView({ type: "detail", id: recipe.id });
  }

  function deleteRecipe(id: string) {
    if (!confirm("Rezept wirklich löschen?")) return;
    onChange(recipes.filter((r) => r.id !== id));
    setView({ type: "list" });
  }

  // Öffnet den Druckdialog des Browsers; dort "Als PDF speichern" wählen
  function printRecipe(title: string) {
    const oldTitle = document.title;
    document.title = title; // wird als Dateiname vorgeschlagen
    window.print();
    document.title = oldTitle;
  }

  // Formular
  if (view.type === "form") {
    return (
      <RecipeForm
        initial={view.recipe}
        categories={categories}
        onSave={saveRecipe}
        onCancel={() =>
          setView(
            view.recipe
              ? { type: "detail", id: view.recipe.id }
              : { type: "list" }
          )
        }
      />
    );
  }

  // Detailansicht
  if (view.type === "detail") {
    const recipe = recipes.find((r) => r.id === view.id);
    if (!recipe) {
      return (
        <div>
          <p>Rezept nicht gefunden.</p>
          <button onClick={() => setView({ type: "list" })}>← Zurück</button>
        </div>
      );
    }
    return (
      <div>
        <button className="no-print" onClick={() => setView({ type: "list" })}>
          ← Zurück
        </button>

        <div className="print-area">
          {recipe.image && (
            <img className="recipe-image" src={recipe.image} alt={recipe.title} />
          )}
          <h2>{recipe.title}</h2>

          <p className="muted">
            {[
              recipe.category,
              recipe.servings ? `${recipe.servings} Portionen` : "",
              recipe.minutes ? `${recipe.minutes} Min.` : "",
              recipe.rating ? "★".repeat(recipe.rating) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {recipe.tags.length > 0 && (
            <p>
              {recipe.tags.map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </p>
          )}

          {recipe.ingredients.length > 0 && (
            <>
              <h3>Zutaten</h3>
              <ul>
                {recipe.ingredients.map((ing, i) => (
                  <li key={i}>
                    {[ing.amount, ing.unit, ing.name].filter(Boolean).join(" ")}
                  </li>
                ))}
              </ul>
            </>
          )}

          {recipe.steps.length > 0 && (
            <>
              <h3>Zubereitung</h3>
              <ol>
                {recipe.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </>
          )}

          {recipe.notes && (
            <>
              <h3>Notizen</h3>
              <p style={{ whiteSpace: "pre-wrap" }}>{recipe.notes}</p>
            </>
          )}

          {recipe.source && (
            <p>
              Quelle:{" "}
              {recipe.source.startsWith("http") ? (
                <a href={recipe.source} target="_blank" rel="noreferrer">
                  {recipe.source}
                </a>
              ) : (
                recipe.source
              )}
            </p>
          )}
        </div>

        <div className="row no-print" style={{ marginTop: 16 }}>
          <button onClick={() => setView({ type: "form", recipe })}>
            Bearbeiten
          </button>
          <button onClick={() => printRecipe(recipe.title)}>
            Als PDF speichern
          </button>
          <button onClick={() => deleteRecipe(recipe.id)}>Löschen</button>
        </div>
      </div>
    );
  }

  // Liste
  return (
    <div>
      <div className="row">
        <input
          placeholder="Suchen (Titel oder Zutat) …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="primary" onClick={() => setView({ type: "form" })}>
          + Neues Rezept
        </button>
      </div>

      {categories.length > 0 && (
        <p>
          <span className="muted">Kategorie: </span>
          <button
            className={activeCategory === null ? "tag active" : "tag"}
            onClick={() => setActiveCategory(null)}
          >
            Alle
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={activeCategory === c ? "tag active" : "tag"}
              onClick={() => setActiveCategory(activeCategory === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </p>
      )}

      {allTags.length > 0 && (
        <p>
          <span className="muted">Tags: </span>
          <button
            className={activeTag === null ? "tag active" : "tag"}
            onClick={() => setActiveTag(null)}
          >
            Alle
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              className={activeTag === t ? "tag active" : "tag"}
              onClick={() => setActiveTag(activeTag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="muted">
          {recipes.length === 0
            ? "Noch keine Rezepte. Lege dein erstes an!"
            : "Keine Treffer."}
        </p>
      )}

      <ul className="cards">
        {filtered.map((r) => (
          <li
            key={r.id}
            className={r.image ? "with-thumb" : ""}
            onClick={() => setView({ type: "detail", id: r.id })}
          >
            {r.image && <img className="thumb" src={r.image} alt="" />}
            <div className="card-body">
              <strong>{r.title}</strong>
              <div className="muted">
                {[
                  r.category,
                  r.minutes ? `${r.minutes} Min.` : "",
                  r.rating ? "★".repeat(r.rating) : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div>
                {r.tags.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}