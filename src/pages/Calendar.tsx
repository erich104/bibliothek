import { useState } from "react";
import type { FormEvent } from "react";
import type { CalendarEvent, Library } from "../models/types";
import { itemsBetween, KIND_COLOR, KIND_LABEL } from "../utils/calendarItems";
import type { CalendarItem } from "../utils/calendarItems";
import { formatDateLong, parseIso, todayIso, toIso } from "../utils/format";

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];
const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

type Props = {
  library: Library;
  onChange: (events: CalendarEvent[]) => void;
};

export default function Calendar({ library, onChange }: Props) {
  const today = todayIso();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<CalendarEvent | "new" | null>(null);

  function goTo(y: number, m: number) {
    const d = new Date(y, m, 1);
    const t = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    const isCurrent =
      d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
    setSelected(isCurrent ? toIso(t) : toIso(d));
  }

  function saveEvent(ev: CalendarEvent) {
    const exists = library.events.some((e) => e.id === ev.id);
    onChange(
      exists
        ? library.events.map((e) => (e.id === ev.id ? ev : e))
        : [...library.events, ev]
    );
    const d = parseIso(ev.date);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(ev.date);
    setEditing(null);
  }

  function removeEvent(id: string) {
    if (!confirm("Termin wirklich löschen?")) return;
    onChange(library.events.filter((e) => e.id !== id));
    setEditing(null);
  }

  if (editing) {
    const existing = editing === "new" ? undefined : editing;
    return (
      <EventForm
        initial={existing}
        defaultDate={selected}
        onSave={saveEvent}
        onCancel={() => setEditing(null)}
        onDelete={existing ? () => removeEvent(existing.id) : undefined}
      />
    );
  }

  // Raster für den Monat (Woche beginnt am Montag)
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toIso(new Date(year, month, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const items = itemsBetween(
    library,
    toIso(new Date(year, month, 1)),
    toIso(new Date(year, month + 1, 0))
  );
  const byDate = new Map<string, CalendarItem[]>();
  for (const it of items) {
    const list = byDate.get(it.date) ?? [];
    list.push(it);
    byDate.set(it.date, list);
  }

  const dayItems = byDate.get(selected) ?? [];

  return (
    <div>
      <div className="cal-head">
        <button onClick={() => goTo(year, month - 1)}>‹</button>
        <strong>
          {MONTHS[month]} {year}
        </strong>
        <button onClick={() => goTo(year, month + 1)}>›</button>
      </div>
      <p>
        <button
          onClick={() => {
            const t = new Date();
            goTo(t.getFullYear(), t.getMonth());
            setSelected(todayIso());
          }}
        >
          Heute
        </button>
      </p>

      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div className="cal-dow" key={w}>
            {w}
          </div>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />;
          const list = byDate.get(iso) ?? [];
          const kinds = Array.from(new Set(list.map((x) => x.kind))).slice(0, 4);
          const cls = [
            "cal-cell",
            iso === today ? "today" : "",
            iso === selected ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button key={iso} className={cls} onClick={() => setSelected(iso)}>
              {Number(iso.slice(8))}
              <span className="cal-dots">
                {kinds.map((k) => (
                  <span
                    key={k}
                    className="cal-dot"
                    style={{ background: KIND_COLOR[k] }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="muted legend">
        {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => (
          <span className="legend-item" key={k}>
            <span className="pin-dot" style={{ background: KIND_COLOR[k] }} />
            {KIND_LABEL[k]}
          </span>
        ))}
      </p>

      <div className="home-section">
        <div className="row">
          <h3 style={{ margin: 0 }}>{formatDateLong(selected)}</h3>
          <button className="primary" onClick={() => setEditing("new")}>
            + Termin
          </button>
        </div>

        {dayItems.length === 0 && (
          <p className="muted">Keine Einträge an diesem Tag.</p>
        )}

        <ul className="todo-list">
          {dayItems.map((it) => {
            const ev =
              it.kind === "event"
                ? library.events.find((e) => e.id === it.refId)
                : undefined;
            return (
              <li className="todo-item" key={it.key}>
                <span
                  className="pin-dot"
                  style={{ background: KIND_COLOR[it.kind] }}
                />
                <span className={it.done ? "done" : ""} style={{ flex: 1 }}>
                  {it.time ? `${it.time} · ` : ""}
                  {it.title}
                  <span className="muted"> · {KIND_LABEL[it.kind]}</span>
                  {it.detail && (
                    <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
                      {it.detail}
                    </div>
                  )}
                </span>
                {ev && <button onClick={() => setEditing(ev)}>Bearbeiten</button>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type FormProps = {
  initial?: CalendarEvent;
  defaultDate: string;
  onSave: (ev: CalendarEvent) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

function EventForm({
  initial,
  defaultDate,
  onSave,
  onCancel,
  onDelete,
}: FormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [time, setTime] = useState(initial?.time ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) {
      alert("Bitte gib einen Titel und ein Datum ein.");
      return;
    }
    if (endDate && endDate < date) {
      alert("Das Enddatum liegt vor dem Startdatum.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      date,
      endDate: endDate || undefined,
      time: time || undefined,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initial ? "Termin bearbeiten" : "Neuer Termin"}</h2>

      <label>
        Titel *
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="row">
        <label>
          Datum *
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Bis (optional, mehrtägig)
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <label>
          Uhrzeit (optional)
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
      </div>

      <label>
        Notizen
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="row" style={{ marginTop: 16 }}>
        <button type="submit" className="primary">
          Speichern
        </button>
        <button type="button" onClick={onCancel}>
          Abbrechen
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete}>
            Löschen
          </button>
        )}
      </div>
    </form>
  );
}