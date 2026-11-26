import { useState } from "react";
import type { Contract, Library } from "../models/types";
import { costInMonth, euro, MONTH_NAMES, ymOfIso } from "../utils/costs";
import { formatDate, todayIso } from "../utils/format";
import { applyPriceCheck } from "../utils/priceChecks";

type Props = {
  contract: Contract;
  date: string;
  manualId?: string;
  library: Library;
  onChange: (library: Library) => void;
};

export default function PriceCheckRow({
  contract,
  date,
  manualId,
  library,
  onChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  const today = todayIso();
  const current = costInMonth(contract, ymOfIso(today));
  const overdue = date < today;
  const monthName = MONTH_NAMES[new Date().getMonth()];

  function confirmSame() {
    onChange(applyPriceCheck(library, contract.id, undefined, manualId));
  }

  function saveNew() {
    const n = Number(text.trim().replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || text.trim() === "") {
      alert("Bitte gib einen gültigen Betrag ein.");
      return;
    }
    onChange(
      applyPriceCheck(
        library,
        contract.id,
        Math.round(n * 100) / 100,
        manualId
      )
    );
    setEditing(false);
  }

  function removeManual() {
    if (!manualId) return;
    onChange({
      ...library,
      priceChecks: library.priceChecks.filter((p) => p.id !== manualId),
    });
  }

  return (
    <div className="pricecheck">
      <div>
        <strong>Preis prüfen: {contract.name}</strong>
        <div className="muted">
          Aktuell {euro(current)} pro Abbuchung
          {overdue ? ` · überfällig seit ${formatDate(date)}` : ""}
        </div>
      </div>

      {!editing ? (
        <div className="row" style={{ marginTop: 6 }}>
          <button className="primary" onClick={confirmSame}>
            ✓ Bestätigen
          </button>
          <button onClick={() => setEditing(true)}>Betrag ändern</button>
          {manualId && <button onClick={removeManual}>Entfernen</button>}
        </div>
      ) : (
        <div style={{ marginTop: 6 }}>
          <div className="row">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Neuer Betrag in €"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="primary" onClick={saveNew}>
              Speichern
            </button>
            <button onClick={() => setEditing(false)}>Abbrechen</button>
          </div>
          <div className="muted">Der neue Betrag gilt ab {monthName}.</div>
        </div>
      )}
    </div>
  );
}