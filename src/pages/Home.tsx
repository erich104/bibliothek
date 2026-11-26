import { useState } from "react";
import type { FormEvent } from "react";
import type { Library, Recipe, ShoppingItem } from "../models/types";
import { itemsBetween, KIND_LABEL } from "../utils/calendarItems";
import {
  addDays,
  daysUntil,
  formatDate,
  formatDateLong,
  parseIso,
  todayIso,
} from "../utils/format";
import { distanceKm, formatKm } from "../utils/geo";
import { placeColor } from "../utils/colors";
import { openPriceChecks } from "../utils/priceChecks";
import PriceCheckRow from "../components/PriceCheckRow";

type Props = {
  library: Library;
  onChange: (library: Library) => void;
  addToShopping: (recipe: Recipe) => number;
};

function dayLabel(iso: string): string {
  const d = daysUntil(iso);
  if (d === 0) return "Heute";
  if (d === 1) return "Morgen";
  return parseIso(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

function randomRecipeId(list: Recipe[]): string | null {
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)].id;
}

export default function Home({ library, onChange, addToShopping }: Props) {
  const today = todayIso();

  // ---------- Anstehend ----------
  const overdue = library.todos
    .filter((t) => !t.done && t.dueDate && t.dueDate < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const soonLimit = addDays(today, 7);
  const upcoming = itemsBetween(library, today, addDays(today, 30))
    .filter((it) => it.kind !== "pricecheck")
    .filter((it) => !(it.kind === "todo" && it.done))
    .filter((it) => it.date <= soonLimit || it.kind === "contract");

  // Preisprüfungen: überfällige und die der nächsten 30 Tage
  const priceChecks = openPriceChecks(library).filter(
    (c) => c.date <= addDays(today, 30)
  );

  function toggleTodo(id: string) {
    onChange({
      ...library,
      todos: library.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      ),
    });
  }

      {/* Preise prüfen */}
      {priceChecks.length > 0 && (
        <div className="home-section">
          <h3>Preise prüfen</h3>
          <ul className="todo-list">
            {priceChecks.map((c) => (
              <li className="todo-item" key={c.key}>
                <PriceCheckRow
                  contract={c.contract}
                  date={c.date}
                  manualId={c.manualId}
                  library={library}
                  onChange={onChange}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
  
  // ---------- Einkaufsliste ----------
  const shopping = library.shopping;
  const [text, setText] = useState("");
  const checkedCount = shopping.filter((s) => s.done).length;

  function setShopping(items: ShoppingItem[]) {
    onChange({ ...library, shopping: items });
  }

  function addItem(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const exists = shopping.some(
      (s) => !s.done && s.text.toLowerCase() === t.toLowerCase()
    );
    if (!exists) {
      setShopping([...shopping, { id: crypto.randomUUID(), text: t, done: false }]);
    }
    setText("");
  }

  function toggleItem(id: string) {
    setShopping(shopping.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  }

  function removeItem(id: string) {
    setShopping(shopping.filter((s) => s.id !== id));
  }

  function removeChecked() {
    setShopping(shopping.filter((s) => !s.done));
  }

  function clearAll() {
    if (!confirm("Die komplette Einkaufsliste leeren?")) return;
    setShopping([]);
  }

  // ---------- Was koche ich heute? ----------
  const [catFilter, setCatFilter] = useState("");
  const [pickId, setPickId] = useState<string | null>(() =>
    randomRecipeId(library.recipes)
  );
  const [shopMsg, setShopMsg] = useState("");
  const pick = library.recipes.find((r) => r.id === pickId);

  function pickNew(category: string) {
    const pool = category
      ? library.recipes.filter((r) => r.category === category)
      : library.recipes;
    setPickId(randomRecipeId(pool));
    setShopMsg("");
  }

  function addPickToShopping(recipe: Recipe) {
    const n = addToShopping(recipe);
    setShopMsg(
      n > 0
        ? `${n} Zutat(en) auf die Einkaufsliste gesetzt.`
        : "Alle Zutaten stehen schon auf der Liste."
    );
  }

  // ---------- In der Nähe ----------
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [locMsg, setLocMsg] = useState("");
  const [locating, setLocating] = useState(false);

  function locate() {
    if (!navigator.geolocation) {
      setLocMsg("Dein Browser unterstützt keine Standortbestimmung.");
      return;
    }
    setLocating(true);
    setLocMsg("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocMsg(
          "Standort nicht verfügbar. Bitte erlaube den Standortzugriff im Browser."
        );
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  }

  const withDistance = pos
    ? library.places
        .map((p) => ({ place: p, km: distanceKm(pos.lat, pos.lng, p.lat, p.lng) }))
        .sort((a, b) => a.km - b.km)
    : [];
  const nearby = withDistance.filter((x) => x.km <= radius);

  return (
    <div>
      <h2 style={{ marginBottom: 0 }}>Heute</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {formatDateLong(today)}
      </p>

      {/* Anstehend */}
      <div className="home-section">
        <h3>Anstehend</h3>
        {overdue.length === 0 && upcoming.length === 0 && (
          <p className="muted">Nichts Dringendes in den nächsten Tagen. 🎉</p>
        )}
        <ul className="todo-list">
          {overdue.map((t) => (
            <li className="todo-item due-urgent" key={t.id}>
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleTodo(t.id)}
              />
              <span style={{ flex: 1 }}>
                {t.text}{" "}
                <span className="warn">
                  · überfällig seit {formatDate(t.dueDate ?? today)}
                </span>
              </span>
            </li>
          ))}
          {upcoming.map((it) => {
            const days = daysUntil(it.date);
            const urgency =
              it.kind === "todo"
                ? days <= 3
                  ? " due-urgent"
                  : days <= 7
                    ? " due-soon"
                    : ""
                : "";
            const refId = it.refId;
            return (
              <li className={`todo-item${urgency}`} key={it.key}>
                {it.kind === "todo" && refId ? (
                  <input
                    type="checkbox"
                    checked={!!it.done}
                    onChange={() => toggleTodo(refId)}
                  />
                ) : (
                  <span
                    className="pin-dot"
                    style={{ background: it.color }}
                  />
                )}
                <span style={{ flex: 1 }}>
                  {it.title}
                  {it.time ? ` · ${it.time}` : ""}
                  <span className="muted"> · {KIND_LABEL[it.kind]}</span>
                </span>
                <span className="muted">{dayLabel(it.date)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Einkaufsliste */}
      <div className="home-section">
        <h3>Einkaufsliste</h3>
        <form className="row" onSubmit={addItem}>
          <input
            placeholder="Artikel hinzufügen …"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="primary">
            + Hinzufügen
          </button>
        </form>

        {shopping.length === 0 && (
          <p className="muted">
            Die Liste ist leer. In einem Rezept kannst du die Zutaten mit einem
            Klick hierher übernehmen.
          </p>
        )}

        <ul className="todo-list">
          {shopping.map((s) => (
            <li className="todo-item" key={s.id}>
              <input
                type="checkbox"
                checked={s.done}
                onChange={() => toggleItem(s.id)}
              />
              <span className={s.done ? "done" : ""} style={{ flex: 1 }}>
                {s.text}
                {s.recipeTitle && (
                  <span className="muted"> · {s.recipeTitle}</span>
                )}
              </span>
              <button onClick={() => removeItem(s.id)}>✕</button>
            </li>
          ))}
        </ul>

        {shopping.length > 0 && (
          <div className="row">
            <button onClick={removeChecked} disabled={checkedCount === 0}>
              Abgehakte entfernen ({checkedCount})
            </button>
            <button onClick={clearAll}>Liste leeren</button>
          </div>
        )}
      </div>

      {/* Zufallsrezept */}
      <div className="home-section">
        <h3>Was koche ich heute?</h3>
        {library.recipes.length === 0 ? (
          <p className="muted">Lege zuerst ein paar Rezepte an.</p>
        ) : (
          <>
            <label style={{ marginTop: 0 }}>
              Kategorie
              <select
                value={catFilter}
                onChange={(e) => {
                  setCatFilter(e.target.value);
                  pickNew(e.target.value);
                }}
              >
                <option value="">Alle</option>
                {library.settings.recipeCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            {pick ? (
              <div style={{ marginTop: 12 }}>
                <div className="pick">
                  {pick.image && <img className="thumb" src={pick.image} alt="" />}
                  <div className="card-body">
                    <strong>{pick.title}</strong>
                    <div className="muted">
                      {[
                        pick.category,
                        pick.minutes ? `${pick.minutes} Min.` : "",
                        pick.rating ? "★".repeat(pick.rating) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </div>

                <details style={{ marginTop: 8 }}>
                  <summary>Zutaten und Zubereitung</summary>
                  {pick.ingredients.length > 0 && (
                    <ul>
                      {pick.ingredients.map((ing, i) => (
                        <li key={i}>
                          {[ing.amount, ing.unit, ing.name]
                            .filter(Boolean)
                            .join(" ")}
                        </li>
                      ))}
                    </ul>
                  )}
                  {pick.steps.length > 0 && (
                    <ol>
                      {pick.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  )}
                </details>

                <div className="row" style={{ marginTop: 8 }}>
                  {pick.ingredients.length > 0 && (
                    <button
                      className="primary"
                      onClick={() => addPickToShopping(pick)}
                    >
                      🛒 Zutaten auf die Einkaufsliste
                    </button>
                  )}
                  <button onClick={() => pickNew(catFilter)}>
                    Anderes Rezept
                  </button>
                </div>
                {shopMsg && <p className="muted">{shopMsg}</p>}
              </div>
            ) : (
              <p className="muted">Keine Rezepte in dieser Kategorie.</p>
            )}
          </>
        )}
      </div>

      {/* In der Nähe */}
      <div className="home-section">
        <h3>In der Nähe</h3>
        <div className="row">
          <button onClick={locate} disabled={locating}>
            {locating ? "Standort wird ermittelt …" : "Meinen Standort abfragen"}
          </button>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            style={{ maxWidth: 140, flex: "0 0 auto" }}
          >
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
            <option value={250}>250 km</option>
          </select>
        </div>
        {locMsg && <p className="warn">{locMsg}</p>}

        {library.places.length === 0 && (
          <p className="muted">Noch keine Orte gespeichert.</p>
        )}

        {pos && library.places.length > 0 && (
          <>
            {nearby.length === 0 && (
              <p className="muted">
                Keine gespeicherten Orte im Umkreis von {radius} km. Der nächste
                ist {withDistance[0].place.name} (
                {formatKm(withDistance[0].km)}).
              </p>
            )}
            <ul className="todo-list">
              {nearby.map(({ place: p, km }) => (
                <li className="todo-item" key={p.id}>
                  <span
                    className="pin-dot"
                    style={{ background: placeColor(p, library.settings.placeLabels) }}
                  />
                  <span style={{ flex: 1 }}>
                    {p.highlight ? "★ " : ""}
                    {p.name}
                    {p.status === "visited" ? " ✓" : ""}
                    <span className="muted"> · {formatKm(km)}</span>
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Route
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}