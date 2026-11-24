import { useState } from "react";
import type { FormEvent } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "../models/types";
import { searchPlaces } from "../utils/geocode";
import type { GeoResult } from "../utils/geocode";
import { pinIcon } from "../utils/mapIcons";
import MapFlyTo from "./MapFlyTo";
import type { FlyTarget } from "./MapFlyTo";

const CATEGORIES = [
  "Stadt",
  "Natur",
  "Sehenswürdigkeit",
  "Restaurant / Café",
  "Unterkunft",
  "Sonstiges",
];

const WORLD: [number, number] = [25, 10];

const round = (n: number) => Number(n.toFixed(5));

// Klick auf die Karte setzt den Pin
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

type Props = {
  initial?: Place;
  onSave: (place: Place) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export default function PlaceForm({ initial, onSave, onCancel, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [status, setStatus] = useState<Place["status"]>(
    initial?.status ?? "wishlist"
  );
  const [country, setCountry] = useState(initial?.country ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [position, setPosition] = useState<[number, number] | null>(
    initial ? [initial.lat, initial.lng] : null
  );
  const [fly, setFly] = useState<FlyTarget | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null
  );

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchInfo, setSearchInfo] = useState("");

  function pick(lat: number, lng: number) {
    setPosition([round(lat), round(lng)]);
  }

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchInfo("");
    setResults([]);
    try {
      const found = await searchPlaces(query.trim());
      setResults(found);
      if (found.length === 0) {
        setSearchInfo(
          "Nichts gefunden. Versuche einen anderen Namen oder klicke auf die Karte."
        );
      }
    } catch {
      setSearchInfo(
        "Die Suche ist gerade nicht erreichbar. Du kannst den Ort auch direkt auf der Karte anklicken."
      );
    } finally {
      setSearching(false);
    }
  }

  function chooseResult(r: GeoResult) {
    pick(r.lat, r.lng);
    setFly({ lat: r.lat, lng: r.lng });
    if (!name.trim()) setName(r.name.split(",")[0]);
    if (!country.trim() && r.country) setCountry(r.country);
    setResults([]);
  }

  function pickMyLocation() {
    if (!navigator.geolocation) {
      alert("Dein Browser unterstützt keine Standortbestimmung.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pick(pos.coords.latitude, pos.coords.longitude);
        setFly({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () =>
        alert(
          "Der Standort konnte nicht ermittelt werden. Bitte erlaube den Standortzugriff im Browser."
        )
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Bitte gib einen Namen ein.");
      return;
    }
    if (!position) {
      alert("Bitte wähle den Ort über die Suche oder per Klick auf der Karte aus.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      country: country.trim() || undefined,
      lat: position[0],
      lng: position[1],
      status,
      date: date || undefined,
      category: category || undefined,
      notes: notes.trim() || undefined,
      link: link.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initial ? "Ort bearbeiten" : "Neuer Ort"}</h2>

      <label>
        Ort suchen
        <div className="row">
          <input
            placeholder="z. B. Lissabon oder Eiffelturm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doSearch();
              }
            }}
          />
          <button type="button" onClick={doSearch} disabled={searching}>
            {searching ? "Suche …" : "Suchen"}
          </button>
        </div>
      </label>

      {searchInfo && <p className="muted">{searchInfo}</p>}

      {results.length > 0 && (
        <ul className="cards">
          {results.map((r, i) => (
            <li key={i} onClick={() => chooseResult(r)}>
              {r.name}
            </li>
          ))}
        </ul>
      )}

      <p className="muted">
        Oder klicke direkt auf die Karte, um den Ort zu setzen.{" "}
        <button type="button" onClick={pickMyLocation}>
          Meinen Standort verwenden
        </button>
      </p>

      <MapContainer
        className="map small"
        center={position ?? WORLD}
        zoom={position ? 10 : 2}
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={pick} />
        <MapFlyTo target={fly} />
        {position && <Marker position={position} icon={pinIcon(status)} />}
      </MapContainer>

      <p className="muted">
        {position
          ? `Gewählt: ${position[0]}, ${position[1]}`
          : "Noch kein Ort gewählt."}
      </p>

      <label>
        Name *
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="row">
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Place["status"])}
          >
            <option value="wishlist">Möchte hin</option>
            <option value="visited">Besucht</option>
          </select>
        </label>
        <label>
          Land
          <input value={country} onChange={(e) => setCountry(e.target.value)} />
        </label>
      </div>

      <div className="row">
        <label>
          Kategorie
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">– keine –</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          Datum (z. B. Reisedatum)
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      <label>
        Link
        <input value={link} onChange={(e) => setLink(e.target.value)} />
      </label>

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