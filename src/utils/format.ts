// Datum als "JJJJ-MM-TT" in lokaler Zeit (nicht UTC)
export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Heutiges Datum als "JJJJ-MM-TT"
export function todayIso(): string {
  return toIso(new Date());
}

// "2026-12-31" -> Datum um Mitternacht (lokale Zeit)
export function parseIso(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

// Datum um n Tage verschieben
export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

// "2026-12-31" -> "31.12.2026"
export function formatDate(iso: string): string {
  return parseIso(iso).toLocaleDateString("de-DE");
}

// "2026-12-31" -> "Donnerstag, 31. Dezember"
export function formatDateLong(iso: string): string {
  return parseIso(iso).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Anzahl Tage von heute bis zum Datum (negativ = schon vorbei)
export function daysUntil(iso: string): number {
  const target = parseIso(iso).getTime();
  const today = parseIso(todayIso()).getTime();
  return Math.round((target - today) / 86400000);
}