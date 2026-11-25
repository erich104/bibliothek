import type { Library } from "../models/types";
import { addDays } from "./format";

export type ItemKind = "event" | "todo" | "contract" | "place";

export type CalendarItem = {
  key: string;
  date: string; // "JJJJ-MM-TT"
  kind: ItemKind;
  title: string;
  time?: string;
  detail?: string;
  done?: boolean;
  refId?: string; // ID des Termins bzw. der Aufgabe
};

export const KIND_LABEL: Record<ItemKind, string> = {
  event: "Termin",
  todo: "To-Do",
  contract: "Vertrag",
  place: "Reise",
};

export const KIND_COLOR: Record<ItemKind, string> = {
  event: "#2f6f4f",
  todo: "#2563eb",
  contract: "#b45309",
  place: "#8e44ad",
};

// Alle Einträge zwischen zwei Daten (einschließlich), sortiert
export function itemsBetween(
  lib: Library,
  from: string,
  to: string
): CalendarItem[] {
  const out: CalendarItem[] = [];
  const inRange = (d: string) => d >= from && d <= to;

  // Eigene Termine (auch mehrtägig)
  for (const e of lib.events) {
    const end = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
    let day = e.date < from ? from : e.date;
    const last = end > to ? to : end;
    for (let guard = 0; day <= last && guard < 400; guard++) {
      out.push({
        key: `event-${e.id}-${day}`,
        date: day,
        kind: "event",
        title: e.title,
        time: e.time,
        detail: e.notes,
        refId: e.id,
      });
      day = addDays(day, 1);
    }
  }

  // Fällige Aufgaben
  for (const t of lib.todos) {
    if (t.dueDate && inRange(t.dueDate)) {
      out.push({
        key: `todo-${t.id}`,
        date: t.dueDate,
        kind: "todo",
        title: t.text,
        done: t.done,
        refId: t.id,
      });
    }
  }

  // Kündigungsfristen und Vertragsenden
  for (const c of lib.contracts) {
    if (c.cancelBy && inRange(c.cancelBy)) {
      out.push({
        key: `contract-cancel-${c.id}`,
        date: c.cancelBy,
        kind: "contract",
        title: `Kündigen bis: ${c.name}`,
        refId: c.id,
      });
    }
    if (c.runsUntil && inRange(c.runsUntil)) {
      out.push({
        key: `contract-end-${c.id}`,
        date: c.runsUntil,
        kind: "contract",
        title: `Vertrag läuft aus: ${c.name}`,
        refId: c.id,
      });
    }
  }

  // Reisedaten
  for (const p of lib.places) {
    if (p.date && inRange(p.date)) {
      out.push({
        key: `place-${p.id}`,
        date: p.date,
        kind: "place",
        title: `${p.status === "visited" ? "Besucht" : "Geplant"}: ${p.name}`,
        refId: p.id,
      });
    }
  }

  return out.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time ?? "99:99").localeCompare(b.time ?? "99:99") ||
      a.title.localeCompare(b.title)
  );
}