import { useState } from "react";
import type { FormEvent } from "react";
import type { Todo, TodoPriority, Wish } from "../models/types";
import { daysUntil, formatDate, todayIso } from "../utils/format";

const LABEL: Record<TodoPriority, string> = {
  urgent: "Dringend",
  soon: "Zeitnah",
  normal: "Nicht dringend",
};
const ORDER: Record<TodoPriority, number> = { urgent: 0, soon: 1, normal: 2 };
const NEXT: Record<TodoPriority, TodoPriority> = {
  normal: "soon",
  soon: "urgent",
  urgent: "normal",
};

const prioOf = (t: Todo): TodoPriority => t.priority ?? "normal";

// Offene Aufgaben: erst nach Priorität, dann nach Datum (frühestes zuerst)
function byPriorityThenDue(a: Todo, b: Todo) {
  const p = ORDER[prioOf(a)] - ORDER[prioOf(b)];
  if (p !== 0) return p;
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

type Props = {
  todos: Todo[];
  onChange: (todos: Todo[]) => void;
  wishes: Wish[];
  onChangeWishes: (wishes: Wish[]) => void;
};

export default function Todos({
  todos,
  onChange,
  wishes,
  onChangeWishes,
}: Props) {
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("normal");
  const [wish, setWish] = useState("");
  const today = todayIso();

  function addTodo(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onChange([
      ...todos,
      {
        id: crypto.randomUUID(),
        text: text.trim(),
        done: false,
        priority,
        dueDate: dueDate || undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    setText("");
    setDueDate("");
    setPriority("normal");
  }

  function toggle(id: string) {
    onChange(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function cyclePriority(id: string) {
    onChange(
      todos.map((t) =>
        t.id === id ? { ...t, priority: NEXT[prioOf(t)] } : t
      )
    );
  }

  function remove(id: string) {
    onChange(todos.filter((t) => t.id !== id));
  }

  function clearDone() {
    if (!confirm("Alle erledigten Aufgaben löschen?")) return;
    onChange(todos.filter((t) => !t.done));
  }

  function addWish(e: FormEvent) {
    e.preventDefault();
    const t = wish.trim();
    if (!t) return;
    onChangeWishes([
      ...wishes,
      { id: crypto.randomUUID(), text: t, createdAt: new Date().toISOString() },
    ]);
    setWish("");
  }

  function removeWish(id: string) {
    onChangeWishes(wishes.filter((w) => w.id !== id));
  }

  const open = todos.filter((t) => !t.done).sort(byPriorityThenDue);
  const done = todos.filter((t) => t.done);

  function renderItem(t: Todo) {
    const overdue = !t.done && t.dueDate && t.dueDate < today;
    const days = !t.done && t.dueDate ? daysUntil(t.dueDate) : null;
    const urgency =
      days === null ? "" : days <= 3 ? " due-urgent" : days <= 7 ? " due-soon" : "";
    const p = prioOf(t);
    return (
      <li className={`todo-item${urgency}`} key={t.id}>
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => toggle(t.id)}
        />
        <button
          className={`prio-btn ${p}`}
          title={`${LABEL[p]} (anklicken zum Ändern)`}
          aria-label={`Priorität: ${LABEL[p]}`}
          onClick={() => cyclePriority(t.id)}
        >
          !
        </button>
        <span className={t.done ? "done" : ""} style={{ flex: 1 }}>
          {t.text}
          {t.dueDate && (
            <span className={overdue ? "warn" : "muted"}>
              {" "}
              · {formatDate(t.dueDate)}
              {overdue ? " (überfällig)" : ""}
            </span>
          )}
        </span>
        <button onClick={() => remove(t.id)}>✕</button>
      </li>
    );
  }

  return (
    <div>
      <form onSubmit={addTodo}>
        <div className="row">
          <input
            placeholder="Neue Aufgabe …"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit" className="primary">
            + Hinzufügen
          </button>
        </div>
        <div className="row">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
          >
            <option value="normal">Nicht dringend</option>
            <option value="soon">Zeitnah</option>
            <option value="urgent">Dringend</option>
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </form>

      {todos.length === 0 && (
        <p className="muted">Noch keine Aufgaben. Alles erledigt? 🎉</p>
      )}

      <ul className="todo-list">{open.map(renderItem)}</ul>

      {done.length > 0 && (
        <>
          <h3>Erledigt ({done.length})</h3>
          <ul className="todo-list">{done.map(renderItem)}</ul>
          <button onClick={clearDone}>Erledigte löschen</button>
        </>
      )}

      {/* Wunschliste */}
      <div className="home-section" style={{ marginTop: 24 }}>
        <h3>Wunschliste</h3>
        <p className="muted">Langfristige Wünsche, ohne Termin und ohne Druck.</p>
        <form className="row" onSubmit={addWish}>
          <input
            placeholder="Neuer Wunsch …"
            value={wish}
            onChange={(e) => setWish(e.target.value)}
          />
          <button type="submit" className="primary">
            + Hinzufügen
          </button>
        </form>
        {wishes.length === 0 && <p className="muted">Noch keine Wünsche.</p>}
        <ul className="todo-list">
          {wishes.map((w) => (
            <li className="todo-item" key={w.id}>
              <span style={{ flex: 1 }}>{w.text}</span>
              <button onClick={() => removeWish(w.id)}>✕</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}