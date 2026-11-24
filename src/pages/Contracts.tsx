import { useState } from "react";
import type { FormEvent } from "react";
import type { Contract, ContractInterval } from "../models/types";
import { daysUntil, formatDate } from "../utils/format";

const TYPES = ["Abo", "Versicherung", "Vertrag", "Mitgliedschaft", "Sonstiges"];

const INTERVALS: Record<ContractInterval, string> = {
  monthly: "monatlich",
  quarterly: "vierteljährlich",
  yearly: "jährlich",
};

// Kosten pro Monat (zum Vergleichen und Aufsummieren)
function monthlyCost(c: Contract): number {
  if (!c.cost) return 0;
  if (c.interval === "monthly") return c.cost;
  if (c.interval === "quarterly") return c.cost / 3;
  return c.cost / 12;
}

function euro(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

type Props = {
  contracts: Contract[];
  onChange: (contracts: Contract[]) => void;
};

export default function Contracts({ contracts, onChange }: Props) {
  const [editing, setEditing] = useState<Contract | "new" | null>(null);

  function save(contract: Contract) {
    const exists = contracts.some((c) => c.id === contract.id);
    onChange(
      exists
        ? contracts.map((c) => (c.id === contract.id ? contract : c))
        : [...contracts, contract]
    );
    setEditing(null);
  }

  function remove(id: string) {
    if (!confirm("Eintrag wirklich löschen?")) return;
    onChange(contracts.filter((c) => c.id !== id));
    setEditing(null);
  }

  if (editing) {
    const existing = editing === "new" ? undefined : editing;
    return (
      <ContractForm
        initial={existing}
        onSave={save}
        onCancel={() => setEditing(null)}
        onDelete={existing ? () => remove(existing.id) : undefined}
      />
    );
  }

  const sorted = [...contracts].sort((a, b) => a.name.localeCompare(b.name));
  const perMonth = contracts.reduce((sum, c) => sum + monthlyCost(c), 0);

  return (
    <div>
      <div className="row">
        <div>
          <strong>{euro(perMonth)}</strong> pro Monat
          <div className="muted">
            {euro(perMonth * 12)} pro Jahr · {contracts.length} Einträge
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
          return (
            <li key={c.id} onClick={() => setEditing(c)}>
              <strong>{c.name}</strong>
              {c.provider && <span className="muted"> · {c.provider}</span>}
              <div className="muted">
                {c.type} · {INTERVALS[c.interval]}
                {c.cost ? ` · ${euro(c.cost)}` : ""}
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type FormProps = {
  initial?: Contract;
  onSave: (contract: Contract) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

function ContractForm({ initial, onSave, onCancel, onDelete }: FormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [provider, setProvider] = useState(initial?.provider ?? "");
  const [type, setType] = useState(initial?.type ?? TYPES[0]);
  const [cost, setCost] = useState(initial?.cost?.toString() ?? "");
  const [billing, setBilling] = useState<ContractInterval>(
    initial?.interval ?? "monthly"
  );
  const [runsUntil, setRunsUntil] = useState(initial?.runsUntil ?? "");
  const [cancelBy, setCancelBy] = useState(initial?.cancelBy ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert("Bitte gib einen Namen ein.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      provider: provider.trim() || undefined,
      type,
      cost: cost ? Number(cost) : undefined,
      interval: billing,
      runsUntil: runsUntil || undefined,
      cancelBy: cancelBy || undefined,
      notes: notes.trim() || undefined,
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
          Kosten (€)
          <input
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        </label>
        <label>
          Zahlweise
          <select
            value={billing}
            onChange={(e) => setBilling(e.target.value as ContractInterval)}
          >
            <option value="monthly">monatlich</option>
            <option value="quarterly">vierteljährlich</option>
            <option value="yearly">jährlich</option>
          </select>
        </label>
      </div>

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