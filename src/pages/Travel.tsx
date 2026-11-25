import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DivIcon } from "leaflet";
import type { Place, PlaceLabel } from "../models/types";
import PlaceForm from "../components/PlaceForm";
import MapFlyTo from "../components/MapFlyTo";
import type { FlyTarget } from "../components/MapFlyTo";
import { pinIcon } from "../utils/mapIcons";
import { labelColor, placeColor, safeColor } from "../utils/colors";
import { formatDate } from "../utils/format";

type Props = {
  places: Place[];
  labels: PlaceLabel[];
  onChange: (places: Place[]) => void;
};

type View = { type: "map" } | { type: "form"; place?: Place };
type Filter = "all" | "visited" | "wishlist";
type MyPos = { lat: number; lng: number; accuracy: number };

const WORLD: [number, number] = [25, 10];

export default function Travel({ places, labels, onChange }: Props) {
  const [view, setView] = useState<View>({ type: "map" });
  const [filter, setFilter] = useState<Filter>("all");
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [focus, setFocus] = useState<FlyTarget | null>(null);

  // Eigener Standort
  const [tracking, setTracking] = useState<boolean>(() => {
    try {
      return localStorage.getItem("showMyLocation") === "1";
    } catch {
      return false;
    }
  });
  const [myPos, setMyPos] = useState<MyPos | null>(null);
  const [locError, setLocError] = useState("");
  const firstFix = useRef(true);

  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setLocError("");
        setMyPos(p);
        if (firstFix.current) {
          firstFix.current = false;
          setFocus({ lat: p.lat, lng: p.lng });
        }
      },
      () => {
        setLocError(
          "Standort nicht verfügbar. Bitte erlaube den Standortzugriff im Browser."
        );
        setTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [tracking]);

  function toggleTracking() {
    const next = !tracking;
    setTracking(next);
    setLocError("");
    if (next) {
      firstFix.current = true;
    } else {
      setMyPos(null);
    }
    try {
      localStorage.setItem("showMyLocation", next ? "1" : "0");
    } catch {
      // Speichern der Einstellung nicht möglich, ist nicht schlimm
    }
  }

  const editingId = view.type === "form" ? view.place?.id : undefined;

  const otherPlaces = useMemo(
    () => places.filter((p) => p.id !== editingId),
    [places, editingId]
  );

  // Pins nur neu erzeugen, wenn sich Orte oder Labels ändern
  const icons = useMemo(() => {
    const m = new Map<string, DivIcon>();
    for (const p of places) {
      m.set(
        p.id,
        pinIcon(placeColor(p, labels), p.status === "visited", !!p.highlight)
      );
    }
    return m;
  }, [places, labels]);

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
        labels={labels}
        otherPlaces={otherPlaces}
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
    .filter((p) => !labelFilter || p.labels?.includes(labelFilter))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="row">
        <div>
          <strong>{visited}</strong> besucht · <strong>{wishlist}</strong>{" "}
          Wunschorte
        </div>
        <button className="primary" onClick={() => setView({ type: "form" })}>
          + Ort hinzufügen
        </button>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={toggleTracking}>
          {tracking ? "Meinen Standort ausblenden" : "Meinen Standort anzeigen"}
        </button>
        {tracking && myPos && (
          <button onClick={() => setFocus({ lat: myPos.lat, lng: myPos.lng })}>
            Zu mir springen
          </button>
        )}
      </div>
      {locError && <p className="warn">{locError}</p>}
      {tracking && !myPos && !locError && (
        <p className="muted">Standort wird ermittelt …</p>
      )}

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

      {labels.length > 0 && (
        <p>
          <span className="muted">Label: </span>
          <button
            className={labelFilter === null ? "tag active" : "tag"}
            onClick={() => setLabelFilter(null)}
          >
            Alle
          </button>
          {labels.map((l) => (
            <button
              key={l.name}
              className={labelFilter === l.name ? "tag active" : "tag"}
              onClick={() =>
                setLabelFilter(labelFilter === l.name ? null : l.name)
              }
            >
              <span
                className="pin-dot"
                style={{ background: safeColor(l.color), marginRight: 4 }}
              />
              {l.name}
            </button>
          ))}
        </p>
      )}

      <MapContainer className="map" center={WORLD} zoom={2} worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFlyTo target={focus} />

        {myPos && (
          <>
            <Circle
              center={[myPos.lat, myPos.lng]}
              radius={myPos.accuracy}
              pathOptions={{
                color: "#2563eb",
                weight: 1,
                fillOpacity: 0.1,
                interactive: false,
              }}
            />
            <CircleMarker
              center={[myPos.lat, myPos.lng]}
              radius={8}
              pathOptions={{
                color: "#fff",
                weight: 3,
                fillColor: "#2563eb",
                fillOpacity: 1,
                interactive: false,
              }}
            />
          </>
        )}

        {shown.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icons.get(p.id)}>
            <Popup>
              <strong>
                {p.highlight ? "★ " : ""}
                {p.name}
              </strong>
              <br />
              {p.country ? `${p.country} · ` : ""}
              {p.status === "visited" ? "Besucht" : "Möchte hin"}
              {p.date ? ` · ${formatDate(p.date)}` : ""}
              {p.labels && p.labels.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {p.labels.map((n) => (
                    <span
                      key={n}
                      className="tag"
                      style={{
                        borderColor: labelColor(n, labels),
                        fontWeight: n === p.mainLabel ? 700 : 400,
                      }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
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

      <p className="muted legend">
        <span className="legend-item">✓ besucht</span>
        <span className="legend-item">
          <span className="pin-dot gold" /> Highlight
        </span>
        <span className="legend-item">Pin-Farbe = Hauptlabel</span>
      </p>

      {places.length === 0 && (
        <p className="muted">
          Noch keine Orte. Lege deinen ersten mit "+ Ort hinzufügen" an!
        </p>
      )}

      <ul className="todo-list">
        {shown.map((p) => (
          <li className="todo-item" key={p.id}>
            <span
              className="pin-dot"
              style={{ background: placeColor(p, labels) }}
            />
            <span style={{ flex: 1 }}>
              {p.highlight ? "★ " : ""}
              {p.name}
              {p.status === "visited" ? " ✓" : ""}
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