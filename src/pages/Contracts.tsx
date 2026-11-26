import { useState } from "react";
import type { FormEvent } from "react";
import type { Contract, Library, PriceChange } from "../models/types";
import { daysUntil, formatDate, todayIso } from "../utils/format";
import {
  contractYearCost,
  costInMonth,
  euro,
  MONTH_NAMES,
  MONTH_SHORT,
  ymOfIso,
} from "../utils/costs";
import { addPriceCheck, nextAutoCheckDate } from "../utils/priceChecks";

const TYPES = ["Abo", "Versicherung", "Vertrag", "Mitgliedschaft", "Sonstiges"];

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function monthsLabel(months: number[]): string {
  if (months.length === 12) return "monatlich";
  if (months.length === 0) return "keine Abbuchung";
  return [...months]
    .sort((a, b) => a - b)
    .map((m) => MONTH_SHORT[m - 1])
    .join(", ");
}

type Props = {
  library: Library;
  onChange: (library: Library) => void;
};

export default function Contracts({ library, onChange }: Props) {
  const [editing, setEditing] = useState<Contract | "new" | null>(null);
  const contracts = library.contracts;
  const year = new Date().getFullYear();
  const ym = ymOfIso(todayIso());

  function save(contract: Contract) {
    const exists = contracts.some((c) => c.id === contract.id);
    onChange({
      ...library,
      contracts: exists
        ? contracts.map((c) => (c.id === contract.id ? contract : c))
        : [...contracts, contract],
    });
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    onChange({
      ...library,
      contracts: contracts.filter((c) => c.id !== id),
      priceChecks: library.priceChecks.filter((p) => p.contractId !== id),
    });
    setEditing(null);
  }

  if (editing) {
    const existing = editing === "new" ? undefined : editing;
    return (
      <ContractForm
        initial={existing}
        costGroups={library.settings.costGroups}
        onSave={save}
        onCancel={() => setEditing(null)}
        onDelete={existing ? () => remove(existing.id) : undefined}
        onAddCheck={
          existing
            ? () => {
                onChange(addPriceCheck(library, existing.id, todayIso()));
                alert(
                  "Die Preisprüfung für heute wurde angelegt. Du findest sie auf der Startseite und im Kalender."
                );
              }
            : undefined
        }
      />
    );
  }

  const sorted = [...contracts].sort((a, b) => a.name.localeCompare(b.name));
  const perYear = contracts.reduce((sum, c) => sum + contractYearCost(c, year), 0);

  return (
    <div>
      <div className="row">
        <div>
          <strong>{euro(perYear / 12)}</strong> pro Monat (Ø {year})
          <div className="muted">
            {euro(perYear)} pro Jahr · {contracts.length} Einträge
          </div>
        </div>
        <button className="primary" onClick={() => setEditing("new")}>
          + Neuer Eintrag
        </button>
      </div>

      {contracts.length === 0 && (
        <p className="muted">Noch keine Verträge oder Abos eingetragen.</p>
      )}

      <ul className="cards">
        {sorted.map((c) => {
          const days = c.cancelBy ? daysUntil(c.cancelBy) : null;
          const soon = days !== null && days >= 0 && days <= 30;
          const current = costInMonth(c, ym);
          return (
            <li key={c.id} onClick={() => setEditing(c)}>
              <strong>{c.name}</strong>
              {c.provider && <span className="muted"> · {c.provider}</span>}
              <div className="muted">
                {c.type} · {monthsLabel(c.months)}
                {current ? ` · ${euro(current)}` : ""}
                {c.costGroup ? ` · ${c.costGroup}` : ""}
                {c.cancelled ? " · gekündigt" : ""}
              </div>
              {c.cancelBy && (
                <div className={soon ? "warn" : "muted"}>
                  Kündigen bis {formatDate(c.cancelBy)}
                  {soon ? ` (noch ${days} Tage!)` : ""}
                </div>
              )}
              {c.runsUntil && (
                <div className="muted">Läuft bis {formatDate(c.runsUntil)}</div>
              )}
              {!!current && (
                <div className="muted">
                  Nächste Preisprüfung: {formatDate(nextAutoCheckDate(c))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type FormProps = {
  initial?: Contract;
  costGroups: string[];
  onSave: (contract: Contract) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onAddCheck?: () => void;
};

function ContractForm({
  initial,
  costGroups,
  onSave,
  onCancel,
  onDelete,
  onAddCheck,
}: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [provider, setProvider] = useState(initial?.provider ?? "");
  const [type, setType] = useState(initial?.type ?? TYPES[0]);
  const [costGroup, setCostGroup] = useState(initial?.costGroup ?? "");
  const [cost, setCost] = useState(initial?.cost?.toString() ?? "");
  const [months, setMonths] = useState<number[]>(initial?.months ?? ALL_MONTHS);
  const [changes, setChanges] = useState<PriceChange[]>(
    initial?.priceChanges ?? []
  );
  const [runsUntil, setRunsUntil] = useState(initial?.runsUntil ?? "");
  const [cancelBy, setCancelBy] = useState(initial?.cancelBy ?? "");
  const [cancelled, setCancelled] = useState(initial?.cancelled ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // Falls die Kostengruppe inzwischen gelöscht wurde, bleibt sie sichtbar
  const groupOptions =
    costGroup && !costGroups.includes(costGroup)
      ? [costGroup, ...costGroups]
      : costGroups;

  function toggleMonth(m: number) {
    setMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Bitte gib einen Namen ein.");
      return;
    }
    if (cost && Number(cost) > 0 && months.length === 0) {
      alert("Bitte wähle mindestens einen Abbuchungsmonat.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      provider: provider.trim() || undefined,
      type,
      costGroup: costGroup || undefined,
      cost: cost ? Number(cost) : undefined,
      priceChanges: changes.length ? changes : undefined,
      months: [...months].sort((a, b) => a - b),
      runsUntil: runsUntil || undefined,
      cancelBy: cancelBy || undefined,
      cancelled: cancelled || undefined,
      notes: notes.trim() || undefined,
      lastPriceCheck: initial?.lastPriceCheck,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initial ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h2>

      <label>
        Name *
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label>
        Anbieter
        <input value={provider} onChange={(e) => setProvider(e.target.value)} />
      </label>

      <div className="row">
        <label>
          Art
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kostengruppe
          <select
            value={costGroup}
            onChange={(e) => setCostGroup(e.target.value)}
          >
            <option value="">– keine –</option>
            {groupOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Kosten pro Abbuchung (€)
        <input
          type="number"
          min="0"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
      </label>

      {changes.length > 0 && (
        <div>
          <p className="muted" style={{ marginBottom: 4 }}>
            Preisverlauf (der Grundpreis oben gilt bis zur ersten Änderung):
          </p>
          <ul className="todo-list">
            {changes.map((ch) => {
              const [y, m] = ch.from.split("-");
              return (
                <li className="todo-item" key={ch.from}>
                  <span style={{ flex: 1 }}>
                    Ab {MONTH_NAMES[Number(m) - 1]} {y}: {euro(ch.cost)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setChanges((prev) => prev.filter((p) => p.from !== ch.from))
                    }
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <h3>Abbuchungsmonate</h3>
      <div className="months-grid">
        {ALL_MONTHS.map((m) => (
          <label className="month-check" key={m}>
            <input
              type="checkbox"
              checked={months.includes(m)}
              onChange={() => toggleMonth(m)}
            />
            {MONTH_SHORT[m - 1]}
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" onClick={() => setMonths(ALL_MONTHS)}>
          Alle Monate
        </button>
        <button type="button" onClick={() => setMonths([])}>
          Keine
        </button>
      </div>
      <p className="muted">
        Beispiel: Netflix alle Monate, KFZ-Versicherung nur Dezember.
      </p>

      <div className="row">
        <label>
          Läuft bis
          <input
            type="date"
            value={runsUntil}
            onChange={(e) => setRunsUntil(e.target.value)}
          />
        </label>
        <label>
          Kündigen bis
          <input
            type="date"
            value={cancelBy}
            onChange={(e) => setCancelBy(e.target.value)}
          />
        </label>
      </div>

      <label className="inline-check">
        <input
          type="checkbox"
          checked={cancelled}
          onChange={(e) => setCancelled(e.target.checked)}
        />
        Bereits gekündigt (keine Kosten nach "Läuft bis")
      </label>

      <label>
        Notizen
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {initial && (
        <p className="muted">
          {initial.lastPriceCheck
            ? `Preis zuletzt geprüft am ${formatDate(initial.lastPriceCheck)}. `
            : "Preis noch nicht geprüft. "}
          {onAddCheck && (
            <button type="button" onClick={onAddCheck}>
              Preisprüfung für heute anlegen
            </button>
          )}
        </p>
      )}

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