import { useState } from "react";
import type { FormEvent } from "react";
import type { Todo } from "../models/types";
import { daysUntil, formatDate, todayIso } from "../utils/format";

type Props = {
  todos: Todo[];
  onChange: (todos: Todo[]) => void;
};

// Offene Aufgaben: erst mit Datum (frühestes zuerst), dann ohne Datum
function byDue(a: Todo, b: Todo) {
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return a.createdAt.localeCompare(b.createdAt);
}

export default function Todos({ todos, onChange }: Props) {
  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
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
        dueDate: dueDate || undefined,
        createdAt: new Date().toISOString(),
      },
    ]);
    setText("");
    setDueDate("");
  }

  function toggle(id: string) {
    onChange(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: string) {
    onChange(todos.filter((t) => t.id !== id));
  }

  function clearDone() {
    if (!confirm("Alle erledigten Aufgaben löschen?")) return;
    onChange(todos.filter((t) => !t.done));
  }

  const open = todos.filter((t) => !t.done).sort(byDue);
  const done = todos.filter((t) => t.done);

  function renderItem(t: Todo) {
    const overdue = !t.done && t.dueDate && t.dueDate < today;
    const days = !t.done && t.dueDate ? daysUntil(t.dueDate) : null;
    const urgency =
      days === null ? "" : days <= 3 ? " due-urgent" : days <= 7 ? " due-soon" : "";
    return (
      <li className={`todo-item${urgency}`} key={t.id}>
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => toggle(t.id)}
        />
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
      <form className="row" onSubmit={addTodo}>
        <input
          placeholder="Neue Aufgabe …"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ maxWidth: 170, flex: "0 0 auto" }}
        />
        <button type="submit" className="primary">
          + Hinzufügen
        </button>
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
    </div>
  );
}