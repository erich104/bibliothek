// Heutiges Datum als "JJJJ-MM-TT" in lokaler Zeit
export function todayIso(): string {
  return new Date().toLocaleDateString("sv-SE");
}

// "2026-12-31" -> "31.12.2026"
export function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("de-DE");
}

// Anzahl Tage von heute bis zum Datum (negativ = schon vorbei)
export function daysUntil(iso: string): number {
  const target = new Date(iso + "T00:00:00").getTime();
  const today = new Date(todayIso() + "T00:00:00").getTime();
  return Math.round((target - today) / 86400000);
}