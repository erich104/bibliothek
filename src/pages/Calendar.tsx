import { useState } from "react";
import type { FormEvent } from "react";
import type {
  CalendarEvent,
  EventCategory,
  Library,
  RepeatUnit,
} from "../models/types";
import { itemsBetween, KIND_COLOR, KIND_LABEL } from "../utils/calendarItems";
import type { CalendarItem } from "../utils/calendarItems";
import { formatDateLong, parseIso, todayIso, toIso } from "../utils/format";
import { safeColor } from "../utils/colors";

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

const UNIT_NAME: Record<RepeatUnit, string> = {
  day: "Tag(e)",
  week: "Woche(n)",
  month: "Monat(e)",
  year: "Jahr(e)",
};

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
  const [template, setTemplate] = useState<Partial<CalendarEvent> | null>(null);
  const [formKey, setFormKey] = useState(0);

  const categories = library.settings.eventCategories;

  function goTo(y: number, m: number) {
    const d = new Date(y, m, 1);
    const t = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    const isCurrent =
      d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth();
    setSelected(isCurrent ? toIso(t) : toIso(d));
  }

  function saveEvent(ev: CalendarEvent, again: boolean) {
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
    if (again) {
      // Neues Formular mit übernommenem Titel, Kategorie und Uhrzeit
      setTemplate({
        title: ev.title,
        category: ev.category,
        time: ev.time,
        date: ev.date,
      });
      setFormKey((k) => k + 1);
      setEditing("new");
    } else {
      setEditing(null);
    }
  }

  function removeEvent(id: string) {
    if (!confirm("Termin wirklich löschen? Bei Wiederholungen werden alle gelöscht.")) {
      return;
    }
    onChange(library.events.filter((e) => e.id !== id));
    setEditing(null);
  }

  if (editing) {
    const existing = editing === "new" ? undefined : editing;
    return (
      <EventForm
        key={formKey}
        initial={existing}
        template={existing ? null : template}
        categories={categories}
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

  const legend = [
    ...categories.map((c) => ({ label: c.name, color: safeColor(c.color) })),
    { label: KIND_LABEL.todo, color: KIND_COLOR.todo },
    { label: KIND_LABEL.contract, color: KIND_COLOR.contract },
    { label: KIND_LABEL.place, color: KIND_COLOR.place },
  ];

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
          const colors = Array.from(new Set(list.map((x) => x.color))).slice(0, 4);
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
                {colors.map((c) => (
                  <span key={c} className="cal-dot" style={{ background: c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="muted legend">
        {legend.map((l) => (
          <span className="legend-item" key={l.label}>
            <span className="pin-dot" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </p>

      <div className="home-section">
        <div className="row">
          <h3 style={{ margin: 0 }}>{formatDateLong(selected)}</h3>
          <button
            className="primary"
            onClick={() => {
              setTemplate(null);
              setFormKey((k) => k + 1);
              setEditing("new");
            }}
          >
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
                <span className="pin-dot" style={{ background: it.color }} />
                <span className={it.done ? "done" : ""} style={{ flex: 1 }}>
                  {it.time ? `${it.time} · ` : ""}
                  {it.title}
                  <span className="muted">
                    {" "}
                    · {it.category ?? KIND_LABEL[it.kind]}
                    {it.repeats ? " · ↻" : ""}
                  </span>
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
  template: Partial<CalendarEvent> | null;
  categories: EventCategory[];
  defaultDate: string;
  onSave: (ev: CalendarEvent, again: boolean) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

function EventForm({
  initial,
  template,
  categories,
  defaultDate,
  onSave,
  onCancel,
  onDelete,
}: FormProps) {
  const base: Partial<CalendarEvent> | undefined = initial ?? template ?? undefined;

  const [title, setTitle] = useState(base?.title ?? "");
  const [category, setCategory] = useState(base?.category ?? "");
  const [date, setDate] = useState(initial?.date ?? template?.date ?? defaultDate);
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [time, setTime] = useState(base?.time ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit | "none">(
    initial?.repeat?.unit ?? "none"
  );
  const [every, setEvery] = useState(String(initial?.repeat?.every ?? 1));
  const [until, setUntil] = useState(initial?.repeat?.until ?? "");

  // Falls die Kategorie des Termins inzwischen gelöscht wurde, bleibt sie hier auswählbar
  const options =
    category && !categories.some((c) => c.name === category)
      ? [{ name: category, color: "" }, ...categories]
      : categories;

  function build(): CalendarEvent | null {
    if (!title.trim() || !date) {
      alert("Bitte gib einen Titel und ein Datum ein.");
      return null;
    }
    if (endDate && endDate < date) {
      alert("Das Enddatum liegt vor dem Startdatum.");
      return null;
    }
    if (repeatUnit !== "none" && until && until < date) {
      alert("Das Ende der Wiederholung liegt vor dem Startdatum.");
      return null;
    }
    return {
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      category: category || undefined,
      date,
      endDate: endDate || undefined,
      time: time || undefined,
      notes: notes.trim() || undefined,
      repeat:
        repeatUnit === "none"
          ? undefined
          : {
              unit: repeatUnit,
              every: Math.max(1, Math.floor(Number(every)) || 1),
              until: until || undefined,
            },
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ev = build();
    if (ev) onSave(ev, false);
  }

  function handleSaveAndNew() {
    const ev = build();
    if (ev) onSave(ev, true);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initial ? "Termin bearbeiten" : "Neuer Termin"}</h2>

      <label>
        Titel *
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label>
        Kategorie
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">– keine –</option>
          {options.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
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

      <div className="row">
        <label>
          Wiederholung
          <select
            value={repeatUnit}
            onChange={(e) => setRepeatUnit(e.target.value as RepeatUnit | "none")}
          >
            <option value="none">Einmalig</option>
            <option value="day">Täglich</option>
            <option value="week">Wöchentlich</option>
            <option value="month">Monatlich</option>
            <option value="year">Jährlich (z. B. Geburtstag)</option>
          </select>
        </label>
        {repeatUnit !== "none" && (
          <>
            <label>
              Alle … {UNIT_NAME[repeatUnit]}
              <input
                type="number"
                min="1"
                value={every}
                onChange={(e) => setEvery(e.target.value)}
              />
            </label>
            <label>
              Wiederholen bis (optional)
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <p className="muted">
        Für unregelmäßige Termine (z. B. Arzttermine) lege einfach mehrere
        einzelne Termine an. Bei wiederholten Terminen gelten Änderungen für alle
        Wiederholungen.
      </p>

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
        {!initial && (
          <button type="button" onClick={handleSaveAndNew}>
            Speichern und weiteren Termin
          </button>
        )}
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