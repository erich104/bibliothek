import { divIcon } from "leaflet";
import type { DivIcon } from "leaflet";

export function pinIcon(status: "visited" | "wishlist"): DivIcon {
  return divIcon({
    className: "pin-wrapper",
    html: `<div class="pin ${status}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}