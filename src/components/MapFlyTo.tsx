import { useEffect } from "react";
import { useMap } from "react-leaflet";

export type FlyTarget = { lat: number; lng: number };

export default function MapFlyTo({ target }: { target: FlyTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.setView([target.lat, target.lng], Math.max(map.getZoom(), 10));
    }
  }, [target, map]);

  return null;
}