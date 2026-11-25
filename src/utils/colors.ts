import type { Place, PlaceLabel } from "../models/types";

export const NEUTRAL_COLOR = "#6b7280";

// Nur gültige Farbcodes wie "#aabbcc" zulassen (Schutz vor kaputten Daten)
export function safeColor(color: string | undefined): string {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : NEUTRAL_COLOR;
}

export function labelColor(name: string, labels: PlaceLabel[]): string {
  return safeColor(labels.find((l) => l.name === name)?.color);
}

// Farbe eines Ortes = Farbe seines Hauptlabels
export function placeColor(place: Place, labels: PlaceLabel[]): string {
  return place.mainLabel ? labelColor(place.mainLabel, labels) : NEUTRAL_COLOR;
}