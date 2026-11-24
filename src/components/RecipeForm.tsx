import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Recipe } from "../models/types";
import { resizeImage } from "../utils/image";

type Props = {
  initial?: Recipe;
  categories: string[];
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
};

export default function RecipeForm({
  initial,
  categories,
  onSave,
  onCancel,
}: Props) {
  const [category, setCategory] = useState(initial?.category ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [image, setImage] = useState<string | undefined>(initial?.image);
  const [imageBusy, setImageBusy] = useState(false);
  const [servings, setServings] = useState(initial?.servings?.toString() ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes?.toString() ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [ingredients, setIngredients] = useState<Recipe["ingredients"]>(
    initial?.ingredients?.length
      ? initial.ingredients
      : [{ name: "", amount: "", unit: "" }]
  );
  const [steps, setSteps] = useState<string[]>(
    initial?.steps?.length ? initial.steps : [""]
  );

  // Falls die Kategorie des Rezepts inzwischen gelöscht wurde, bleibt sie hier auswählbar
  const categoryOptions =
    category && !categories.includes(category)
      ? [category, ...categories]
      : categories;

  async function handleImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageBusy(true);
    try {
      setImage(await resizeImage(file));
    } catch {
      alert("Das Bild konnte nicht verarbeitet werden.");
    } finally {
      setImageBusy(false);
      e.target.value = "";
    }
  }

  function updateIngredient(
    index: number,
    field: "name" | "amount" | "unit",
    value: string
  ) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    );
  }

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert("Bitte gib einen Titel ein.");
      return;
    }
    const recipe: Recipe = {
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      category: category || undefined,
      image,
      ingredients: ingredients
        .filter((i) => i.name.trim() !== "")
        .map((i) => ({
          name: i.name.trim(),
          amount: i.amount?.trim() || undefined,
          unit: i.unit?.trim() || undefined,
        })),
      steps: steps.map((s) => s.trim()).filter(Boolean),
      servings: servings ? Number(servings) : undefined,
      minutes: minutes ? Number(minutes) : undefined,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
      rating: rating || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    onSave(recipe);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initial ? "Rezept bearbeiten" : "Neues Rezept"}</h2>

      <label>
        Kategorie
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">– keine –</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Titel *
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label>
        Bild
        <input type="file" accept="image/*" onChange={handleImage} />
      </label>
      {imageBusy && <p className="muted">Bild wird verarbeitet …</p>}
      {image && (
        <div>
          <img className="recipe-image" src={image} alt="Vorschau" />
          <button type="button" onClick={() => setImage(undefined)}>
            Bild entfernen
          </button>
        </div>
      )}

      <div className="row">
        <label>
          Portionen
          <input
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </label>
        <label>
          Zeit (Minuten)
          <input
            type="number"
            min="1"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </label>
        <label>
          Bewertung
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            <option value={0}>–</option>
            <option value={1}>★</option>
            <option value={2}>★★</option>
            <option value={3}>★★★</option>
            <option value={4}>★★★★</option>
            <option value={5}>★★★★★</option>
          </select>
        </label>
      </div>

      <label>
        Tags (mit Komma trennen, z. B. vegetarisch, schnell)
        <input value={tags} onChange={(e) => setTags(e.target.value)} />
      </label>

      <h3>Zutaten</h3>
      {ingredients.map((ing, i) => (
        <div className="row" key={i}>
          <input
            placeholder="Menge"
            value={ing.amount ?? ""}
            onChange={(e) => updateIngredient(i, "amount", e.target.value)}
            style={{ maxWidth: 90 }}
          />
          <input
            placeholder="Einheit"
            value={ing.unit ?? ""}
            onChange={(e) => updateIngredient(i, "unit", e.target.value)}
            style={{ maxWidth: 90 }}
          />
          <input
            placeholder="Zutat"
            value={ing.name}
            onChange={(e) => updateIngredient(i, "name", e.target.value)}
          />
          <button
            type="button"
            onClick={() =>
              setIngredients((prev) => prev.filter((_, idx) => idx !== i))
            }
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setIngredients((prev) => [...prev, { name: "", amount: "", unit: "" }])
        }
      >
        + Zutat
      </button>

      <h3>Zubereitung</h3>
      {steps.map((step, i) => (
        <div className="row" key={i}>
          <span style={{ paddingTop: 8 }}>{i + 1}.</span>
          <textarea
            rows={2}
            value={step}
            onChange={(e) => updateStep(i, e.target.value)}
          />
          <button
            type="button"
            onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setSteps((prev) => [...prev, ""])}>
        + Schritt
      </button>

      <label>
        Quelle / Link
        <input value={source} onChange={(e) => setSource(e.target.value)} />
      </label>

      <label>
        Notizen
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="row" style={{ marginTop: 16 }}>
        <button type="submit" className="primary" disabled={imageBusy}>
          Speichern
        </button>
        <button type="button" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}