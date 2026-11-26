import type { CalendarEvent, Library } from "../models/types";
import { addDays, addMonths, diffDays } from "./format";
import { safeColor } from "./colors";
import { openPriceChecks } from "./priceChecks";

export type ItemKind = "event" | "todo" | "contract" | "place" | "pricecheck";

export type CalendarItem = {
  key: string;
  date: string; // "JJJJ-MM-TT"
  kind: ItemKind;
  title: string;
  color: string;
  time?: string;
  detail?: string;
  done?: boolean;
  refId?: string; // ID des Termins, der Aufgabe bzw. des Vertrags
  manualId?: string; // bei von Hand angelegten Preisprüfungen
  category?: string;
  repeats?: boolean;
};

export const KIND_LABEL: Record<ItemKind, string> = {
  event: "Termin",
  todo: "To-Do",
  contract: "Vertrag",
  place: "Reise",
  pricecheck: "Preisprüfung",
};

export const KIND_COLOR: Record<ItemKind, string> = {
  event: "#2f6f4f",
  todo: "#2563eb",
  contract: "#b45309",
  place: "#8e44ad",
  pricecheck: "#0d9488",
};

// Alle Anfangsdaten eines Termins (bei Wiederholung viele) bis zum Ende des Zeitraums
function occurrenceStarts(
  e: CalendarEvent,
  from: string,
  to: string,
  duration: number
): string[] {
  const r = e.repeat;
  if (!r) return [e.date];

  const every = Math.max(1, Math.floor(r.every) || 1);
  const limit = r.until && r.until < to ? r.until : to;

  // Nicht bei Null anfangen, sondern nahe am gesuchten Zeitraum (nur zur Beschleunigung)
  let k0 = 0;
  if (from > e.date) {
    const gap = diffDays(e.date, from) - duration;
    if (gap > 0) {
      if (r.unit === "day") k0 = Math.floor(gap / every);
      else if (r.unit === "week") k0 = Math.floor(gap / (7 * every));
      else if (r.unit === "month") k0 = Math.floor(gap / (31 * every));
      else k0 = Math.floor(gap / (366 * every));
    }
  }

  const starts: string[] = [];
  for (let k = Math.max(0, k0); k < k0 + 5000; k++) {
    let s: string;
    if (r.unit === "day") s = addDays(e.date, k * every);
    else if (r.unit === "week") s = addDays(e.date, k * every * 7);
    else if (r.unit === "month") s = addMonths(e.date, k * every);
    else s = addMonths(e.date, k * every * 12);
    if (s > limit) break;
    starts.push(s);
  }
  return starts;
}

// Alle Einträge zwischen zwei Daten (einschließlich), sortiert
export function itemsBetween(
  lib: Library,
  from: string,
  to: string
): CalendarItem[] {
  const out: CalendarItem[] = [];
  const inRange = (d: string) => d >= from && d <= to;

  // Eigene Termine (auch mehrtägig und wiederholt)
  for (const e of lib.events) {
    const color = e.category
      ? safeColor(
          lib.settings.eventCategories.find((c) => c.name === e.category)?.color
        )
      : KIND_COLOR.event;
    const duration =
      e.endDate && e.endDate >= e.date ? diffDays(e.date, e.endDate) : 0;

    for (const s of occurrenceStarts(e, from, to, duration)) {
      const end = addDays(s, duration);
      let day = s < from ? from : s;
      const last = end > to ? to : end;
      for (let guard = 0; day <= last && guard < 400; guard++) {
        out.push({
          key: `event-${e.id}-${s}-${day}`,
          date: day,
          kind: "event",
          title: e.title,
          color,
          time: e.time,
          detail: e.notes,
          refId: e.id,
          category: e.category,
          repeats: !!e.repeat,
        });
        day = addDays(day, 1);
      }
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
        color: KIND_COLOR.todo,
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
        color: KIND_COLOR.contract,
        refId: c.id,
      });
    }
    if (c.runsUntil && inRange(c.runsUntil)) {
      out.push({
        key: `contract-end-${c.id}`,
        date: c.runsUntil,
        kind: "contract",
        title: `Vertrag läuft aus: ${c.name}`,
        color: KIND_COLOR.contract,
        refId: c.id,
      });
    }
  }

  // Preisprüfungen (automatisch alle 6 Monate und von Hand angelegte)
  for (const chk of openPriceChecks(lib)) {
    if (inRange(chk.date)) {
      out.push({
        key: `pricecheck-${chk.key}`,
        date: chk.date,
        kind: "pricecheck",
        title: `Preis prüfen: ${chk.contract.name}`,
        color: KIND_COLOR.pricecheck,
        refId: chk.contract.id,
        manualId: chk.manualId,
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
        color: KIND_COLOR.place,
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