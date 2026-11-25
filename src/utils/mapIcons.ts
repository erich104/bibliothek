import { divIcon } from "leaflet";
import type { DivIcon } from "leaflet";
import { safeColor } from "./colors";

// Pin: Farbe = Hauptlabel, Häkchen = besucht, goldener Rand = Highlight
export function pinIcon(
  color: string,
  visited: boolean,
  highlight: boolean,
  small = false
): DivIcon {
  const size = small ? 14 : 24;
  const cls = ["pin", highlight ? "highlight" : "", small ? "small" : ""]
    .filter(Boolean)
    .join(" ");
  return divIcon({
    className: "pin-wrapper",
    html: `<div class="${cls}" style="background:${safeColor(color)}">${
      visited && !small ? "✓" : ""
    }</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}