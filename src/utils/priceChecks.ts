import type { Contract, Library } from "../models/types";
import { addMonths, todayIso } from "./format";
import { costInMonth, ymOfIso } from "./costs";

export type OpenCheck = {
  key: string;
  contract: Contract;
  date: string; // "JJJJ-MM-TT"
  manualId?: string; // gesetzt, wenn die Prüfung von Hand angelegt wurde
};

// Nächste automatische Prüfung: 6 Monate nach der letzten Bestätigung (bzw. dem Anlegen)
export function nextAutoCheckDate(c: Contract): string {
  const base = c.lastPriceCheck ?? c.createdAt.slice(0, 10);
  return addMonths(base, 6);
}

function needsChecks(c: Contract, today: string): boolean {
  const hasCost = !!c.cost || (c.priceChanges ?? []).length > 0;
  if (!hasCost) return false;
  if (c.cancelled && c.runsUntil && c.runsUntil < today) return false;
  return true;
}

// Alle offenen Preisprüfungen (automatische und von Hand angelegte), nach Datum sortiert
export function openPriceChecks(lib: Library): OpenCheck[] {
  const today = todayIso();
  const out: OpenCheck[] = [];

  for (const c of lib.contracts) {
    if (needsChecks(c, today)) {
      out.push({ key: `auto-${c.id}`, contract: c, date: nextAutoCheckDate(c) });
    }
  }
  for (const m of lib.priceChecks) {
    const c = lib.contracts.find((x) => x.id === m.contractId);
    if (c) {
      out.push({ key: `manual-${m.id}`, contract: c, date: m.date, manualId: m.id });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Prüfung bestätigen, optional mit neuem Betrag (gilt ab dem aktuellen Monat)
export function applyPriceCheck(
  lib: Library,
  contractId: string,
  newCost?: number,
  manualId?: string
): Library {
  const today = todayIso();
  const ym = ymOfIso(today);

  return {
    ...lib,
    contracts: lib.contracts.map((c) => {
      if (c.id !== contractId) return c;
      const updated: Contract = { ...c, lastPriceCheck: today };
      if (newCost !== undefined && newCost !== costInMonth(c, ym)) {
        const others = (c.priceChanges ?? []).filter((p) => p.from !== ym);
        updated.priceChanges = [...others, { from: ym, cost: newCost }].sort(
          (a, b) => a.from.localeCompare(b.from)
        );
      }
      return updated;
    }),
    // Die bestätigte Prüfung und alle bereits fälligen Prüfungen dieses Vertrags erledigen
    priceChecks: lib.priceChecks.filter(
      (p) =>
        !(p.id === manualId || (p.contractId === contractId && p.date <= today))
    ),
  };
}

// Prüfung von Hand für ein Datum anlegen
export function addPriceCheck(
  lib: Library,
  contractId: string,
  date: string
): Library {
  return {
    ...lib,
    priceChecks: [
      ...lib.priceChecks,
      {
        id: crypto.randomUUID(),
        contractId,
        date,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}