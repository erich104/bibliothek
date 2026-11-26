import type {
  Contract,
  ExpenseEntry,
  Library,
  MonthPlan,
} from "../models/types";

export const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

// "JJJJ-MM" aus Jahr und Monat (1 bis 12)
export function ymKey(year: number, month1: number): string {
  return `${year}-${String(month1).padStart(2, "0")}`;
}

// "2026-11-25" -> "2026-11"
export function ymOfIso(iso: string): string {
  return iso.slice(0, 7);
}

export function euro(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

// Preis eines Vertrags in einem Monat ("JJJJ-MM"), mit Preisänderungen
export function costInMonth(c: Contract, ym: string): number {
  let cost = c.cost ?? 0;
  const changes = [...(c.priceChanges ?? [])].sort((a, b) =>
    a.from.localeCompare(b.from)
  );
  for (const ch of changes) {
    if (ch.from <= ym) cost = ch.cost;
  }
  return cost;
}

// Wird der Vertrag in diesem Monat abgebucht?
export function chargedInMonth(
  c: Contract,
  year: number,
  month1: number
): boolean {
  if (!c.months.includes(month1)) return false;
  if (c.cancelled && c.runsUntil && ymKey(year, month1) > ymOfIso(c.runsUntil)) {
    return false;
  }
  return true;
}

// Gesamtkosten eines Vertrags in einem Jahr
export function contractYearCost(c: Contract, year: number): number {
  let sum = 0;
  for (let m = 1; m <= 12; m++) {
    if (chargedInMonth(c, year, m)) sum += costInMonth(c, ymKey(year, m));
  }
  return sum;
}

// Wert eines Feldes im Monat: erst der Monat selbst, sonst die Vorlage
function pickValue(
  lib: Library,
  ym: string,
  pick: (p: MonthPlan) => number | undefined
): number {
  return pick(lib.budget.months[ym] ?? {}) ?? pick(lib.budget.template) ?? 0;
}

export type GroupLine = {
  name: string;
  variable: boolean; // variable Gruppe: Einzelposten statt Vorlage
  entries: ExpenseEntry[]; // Einzelposten (nur bei variablen Gruppen)
  manual: number; // Plan-Betrag bzw. Summe der Einzelposten, ohne Verträge
  contracts: { id: string; name: string; amount: number }[];
  contractSum: number;
  total: number;
};

export type MonthSummary = {
  ym: string;
  salary: number;
  other: number;
  income: number;
  groups: GroupLine[];
  contractTotal: number;
  expenses: number;
  saldo: number;
};

export const NO_GROUP = "Ohne Gruppe";

export function summarizeMonth(
  lib: Library,
  year: number,
  month1: number
): MonthSummary {
  const ym = ymKey(year, month1);
  const salary = pickValue(lib, ym, (p) => p.salary);
  const other = pickValue(lib, ym, (p) => p.otherIncome);

  const groupNames = lib.settings.costGroups;
  const variableNames = lib.settings.variableCostGroups;
  const charged = lib.contracts
    .filter((c) => chargedInMonth(c, year, month1))
    .map((c) => ({
      id: c.id,
      name: c.name,
      group:
        c.costGroup && groupNames.includes(c.costGroup) ? c.costGroup : NO_GROUP,
      amount: costInMonth(c, ym),
    }));

  const groups: GroupLine[] = groupNames.map((name) => {
    const variable = variableNames.includes(name);
    const entries = variable
      ? lib.expenseEntries.filter((e) => e.ym === ym && e.group === name)
      : [];
    const manual = variable
      ? entries.reduce((s, e) => s + e.amount, 0)
      : pickValue(lib, ym, (p) => p.expenses?.[name]);
    const contracts = charged.filter((c) => c.group === name);
    const contractSum = contracts.reduce((s, c) => s + c.amount, 0);
    return {
      name,
      variable,
      entries,
      manual,
      contracts,
      contractSum,
      total: manual + contractSum,
    };
  });

  const loose = charged.filter((c) => c.group === NO_GROUP);
  if (loose.length > 0) {
    const contractSum = loose.reduce((s, c) => s + c.amount, 0);
    groups.push({
      name: NO_GROUP,
      variable: false,
      entries: [],
      manual: 0,
      contracts: loose,
      contractSum,
      total: contractSum,
    });
  }

  const income = salary + other;
  const expenses = groups.reduce((s, g) => s + g.total, 0);
  const contractTotal = groups.reduce((s, g) => s + g.contractSum, 0);
  return {
    ym,
    salary,
    other,
    income,
    groups,
    contractTotal,
    expenses,
    saldo: income - expenses,
  };
}