export type GeoResult = {
  name: string;
  lat: number;
  lng: number;
  country?: string;
};

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
  address?: { country?: string };
};

// Sucht Orte nach Namen. Bitte nur auf Knopfdruck aufrufen, nicht bei jedem Tastendruck
// (die kostenlose Suche erlaubt nur wenige Anfragen pro Sekunde).
export async function searchPlaces(query: string): Promise<GeoResult[]> {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&accept-language=de&q=" +
    encodeURIComponent(query);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Suche fehlgeschlagen (${res.status})`);
  const data = (await res.json()) as NominatimItem[];
  return data.map((d) => ({
    name: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
    country: d.address?.country,
  }));
}