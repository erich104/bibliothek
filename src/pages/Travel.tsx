import { useState } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "../models/types";
import PlaceForm from "../components/PlaceForm";
import MapFlyTo from "../components/MapFlyTo";
import type { FlyTarget } from "../components/MapFlyTo";
import { pinIcon } from "../utils/mapIcons";
import { formatDate } from "../utils/format";

type Props = {
  places: Place[];
  onChange: (places: Place[]) => void;
};

type View = { type: "map" } | { type: "form"; place?: Place };
type Filter = "all" | "visited" | "wishlist";

const WORLD: [number, number] = [25, 10];

export default function Travel({ places, onChange }: Props) {
  const [view, setView] = useState<View>({ type: "map" });
  const [filter, setFilter] = useState<Filter>("all");
  const [focus, setFocus] = useState<FlyTarget | null>(null);

  function save(place: Place) {
    const exists = places.some((p) => p.id === place.id);
    onChange(
      exists
        ? places.map((p) => (p.id === place.id ? place : p))
        : [...places, place]
    );
    setFocus({ lat: place.lat, lng: place.lng });
    setView({ type: "map" });
  }

  function remove(id: string) {
    if (!confirm("Ort wirklich löschen?")) return;
    onChange(places.filter((p) => p.id !== id));
    setView({ type: "map" });
  }

  if (view.type === "form") {
    const existing = view.place;
    return (
      <PlaceForm
        initial={existing}
        onSave={save}
        onCancel={() => setView({ type: "map" })}
        onDelete={existing ? () => remove(existing.id) : undefined}
      />
    );
  }

  const visited = places.filter((p) => p.status === "visited").length;
  const wishlist = places.length - visited;
  const shown = places
    .filter((p) => filter === "all" || p.status === filter)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="row">
        <div>
          <strong>{visited}</strong> besucht · <strong>{wishlist}</strong>{" "}
          Wunschorte
        </div>
        <button
          className="primary"
          onClick={() => setView({ type: "form" })}
        >
          + Ort hinzufügen
        </button>
      </div>

      <p>
        <button
          className={filter === "all" ? "tag active" : "tag"}
          onClick={() => setFilter("all")}
        >
          Alle
        </button>
        <button
          className={filter === "visited" ? "tag active" : "tag"}
          onClick={() => setFilter("visited")}
        >
          Besucht
        </button>
        <button
          className={filter === "wishlist" ? "tag active" : "tag"}
          onClick={() => setFilter("wishlist")}
        >
          Wunschliste
        </button>
      </p>

      <MapContainer className="map" center={WORLD} zoom={2} worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFlyTo target={focus} />
        {shown.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.status)}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              {[p.country, p.category].filter(Boolean).join(" · ")}
              <br />
              {p.status === "visited" ? "Besucht" : "Möchte hin"}
              {p.date ? ` · ${formatDate(p.date)}` : ""}
              {p.notes && (
                <div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                  {p.notes}
                </div>
              )}
              {p.link && p.link.startsWith("http") && (
                <div>
                  <a href={p.link} target="_blank" rel="noreferrer">
                    Link öffnen
                  </a>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <button onClick={() => setView({ type: "form", place: p })}>
                  Bearbeiten
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {places.length === 0 && (
        <p className="muted">
          Noch keine Orte. Lege deinen ersten mit "+ Ort hinzufügen" an!
        </p>
      )}

      <ul className="todo-list">
        {shown.map((p) => (
          <li className="todo-item" key={p.id}>
            <span className={`pin-dot ${p.status}`} />
            <span style={{ flex: 1 }}>
              {p.name}
              <span className="muted">
                {p.country ? ` · ${p.country}` : ""}
              </span>
            </span>
            <button onClick={() => setFocus({ lat: p.lat, lng: p.lng })}>
              Zeigen
            </button>
            <button onClick={() => setView({ type: "form", place: p })}>
              Bearbeiten
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}