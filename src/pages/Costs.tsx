import { useState } from "react";
import type {
  Budget,
  ExpenseEntry,
  Library,
  MonthPlan,
} from "../models/types";
import AmountInput from "../components/AmountInput";
import {
  euro,
  MONTH_NAMES,
  NO_GROUP,
  summarizeMonth,
  ymKey,
} from "../utils/costs";

type Props = {
  library: Library;
  onChange: (library: Library) => void;
};

// Entfernt leere Teile aus einem Monatsplan
function cleanPlan(plan: MonthPlan): MonthPlan | null {
  const expenses =
    plan.expenses && Object.keys(plan.expenses).length > 0
      ? plan.expenses
      : undefined;
  const result: MonthPlan = {
    salary: plan.salary,
    otherIncome: plan.otherIncome,
    expenses,
  };
  const empty =
    result.salary === undefined &&
    result.otherIncome === undefined &&
    result.expenses === undefined;
  return empty ? null : result;
}

export default function Costs({ library, onChange }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const budget = library.budget;
  const groups = library.settings.costGroups;
  const variableGroups = library.settings.variableCostGroups;
  const fixedGroups = groups.filter((g) => !variableGroups.includes(g));

  function saveBudget(b: Budget) {
    onChange({ ...library, budget: b });
  }

  // ---- Vorlage ----
  function setTemplateField(field: "salary" | "otherIncome", v: number | undefined) {
    const t = { ...budget.template, [field]: v };
    saveBudget({ ...budget, template: cleanPlan(t) ?? {} });
  }

  function setTemplateExpense(group: string, v: number | undefined) {
    const expenses = { ...(budget.template.expenses ?? {}) };
    if (v === undefined) delete expenses[group];
    else expenses[group] = v;
    saveBudget({
      ...budget,
      template: cleanPlan({ ...budget.template, expenses }) ?? {},
    });
  }

  // ---- Einzelner Monat (überschreibt die Vorlage) ----
  function updateMonth(ym: string, plan: MonthPlan) {
    const months = { ...budget.months };
    const cleaned = cleanPlan(plan);
    if (cleaned) months[ym] = cleaned;
    else delete months[ym];
    saveBudget({ ...budget, months });
  }

  function setMonthField(
    ym: string,
    field: "salary" | "otherIncome",
    v: number | undefined
  ) {
    updateMonth(ym, { ...(budget.months[ym] ?? {}), [field]: v });
  }

  function setMonthExpense(ym: string, group: string, v: number | undefined) {
    const plan = budget.months[ym] ?? {};
    const expenses = { ...(plan.expenses ?? {}) };
    if (v === undefined) delete expenses[group];
    else expenses[group] = v;
    updateMonth(ym, { ...plan, expenses });
  }

  // ---- Einzelposten variabler Gruppen ----
  function addEntry(ym: string, group: string, label: string, amount: number) {
    const entry: ExpenseEntry = {
      id: crypto.randomUUID(),
      ym,
      group,
      label,
      amount,
      createdAt: new Date().toISOString(),
    };
    onChange({ ...library, expenseEntries: [...library.expenseEntries, entry] });
  }

  function removeEntry(id: string) {
    onChange({
      ...library,
      expenseEntries: library.expenseEntries.filter((e) => e.id !== id),
    });
  }

  const summaries = Array.from({ length: 12 }, (_, i) =>
    summarizeMonth(library, year, i + 1)
  );
  const yearIncome = summaries.reduce((s, m) => s + m.income, 0);
  const yearExpenses = summaries.reduce((s, m) => s + m.expenses, 0);
  const yearContracts = summaries.reduce((s, m) => s + m.contractTotal, 0);
  const yearSaldo = yearIncome - yearExpenses;

  const tpl = budget.template;

  return (
    <div>
      <div className="cal-head">
        <button onClick={() => setYear(year - 1)}>‹</button>
        <strong>Kosten {year}</strong>
        <button onClick={() => setYear(year + 1)}>›</button>
      </div>

      {/* Jahressumme */}
      <div className="home-section" style={{ marginTop: 12 }}>
        <h3>Jahresübersicht</h3>
        <div className="sum-row" style={{ borderTop: "none" }}>
          <span>Einnahmen</span>
          <span>{euro(yearIncome)}</span>
        </div>
        <div className="sum-row">
          <span>Ausgaben</span>
          <span>{euro(yearExpenses)}</span>
        </div>
        <div className="muted">davon Verträge: {euro(yearContracts)}</div>
        <div className="sum-row">
          <span>Saldo</span>
          <span className={yearSaldo >= 0 ? "pos" : "neg"}>{euro(yearSaldo)}</span>
        </div>
        <div className="muted">Ø Ausgaben pro Monat: {euro(yearExpenses / 12)}</div>
      </div>

      {/* Vorlage */}
      <details className="settings-group">
        <summary>Vorlage für alle Monate</summary>
        <div className="settings-body">
          <p className="muted">
            Diese Werte gelten für jeden Monat, solange du ihn nicht einzeln
            überschreibst. Verträge werden zusätzlich automatisch berechnet.
          </p>
          <div className="cost-row">
            <span className="label">Gehalt</span>
            <AmountInput
              key={`t-salary-${tpl.salary}`}
              value={tpl.salary}
              placeholder="0"
              ariaLabel="Gehalt (Vorlage)"
              onCommit={(v) => setTemplateField("salary", v)}
            />
          </div>
          <div className="cost-row">
            <span className="label">Sonstige Einnahmen</span>
            <AmountInput
              key={`t-other-${tpl.otherIncome}`}
              value={tpl.otherIncome}
              placeholder="0"
              ariaLabel="Sonstige Einnahmen (Vorlage)"
              onCommit={(v) => setTemplateField("otherIncome", v)}
            />
          </div>
          <h3>Festkosten (ohne Verträge)</h3>
          {fixedGroups.length === 0 && (
            <p className="muted">
              Keine Festkosten-Gruppen. Lege sie unter Konfiguration → Kosten an.
            </p>
          )}
          {fixedGroups.map((g) => (
            <div className="cost-row" key={g}>
              <span className="label">{g}</span>
              <AmountInput
                key={`t-${g}-${tpl.expenses?.[g]}`}
                value={tpl.expenses?.[g]}
                placeholder="0"
                ariaLabel={`${g} (Vorlage)`}
                onCommit={(v) => setTemplateExpense(g, v)}
              />
            </div>
          ))}
          {variableGroups.length > 0 && (
            <p className="muted">
              Variable Gruppen ({variableGroups.join(", ")}) hast du keine
              Vorlage: Dort trägst du im jeweiligen Monat einzelne Posten ein.
            </p>
          )}
        </div>
      </details>

      {/* Monate */}
      {summaries.map((s, i) => {
        const month1 = i + 1;
        const ym = ymKey(year, month1);
        const plan = budget.months[ym] ?? {};
        const isCurrent =
          year === now.getFullYear() && month1 === now.getMonth() + 1;
        return (
          <details className="settings-group" key={ym} open={isCurrent}>
            <summary className="month-summary">
              <span>{MONTH_NAMES[i]}</span>
              <span className="muted">
                {euro(s.income)} − {euro(s.expenses)}
              </span>
              <strong className={s.saldo >= 0 ? "pos" : "neg"}>
                {euro(s.saldo)}
              </strong>
            </summary>
            <div className="settings-body">
              <h3>Einnahmen</h3>
              <div className="cost-row">
                <span className="label">Gehalt</span>
                <AmountInput
                  key={`${ym}-salary-${plan.salary}`}
                  value={plan.salary}
                  placeholder={
                    tpl.salary !== undefined
                      ? String(tpl.salary).replace(".", ",")
                      : "0"
                  }
                  ariaLabel={`Gehalt ${MONTH_NAMES[i]}`}
                  onCommit={(v) => setMonthField(ym, "salary", v)}
                />
              </div>
              <div className="cost-row">
                <span className="label">Sonstige Einnahmen</span>
                <AmountInput
                  key={`${ym}-other-${plan.otherIncome}`}
                  value={plan.otherIncome}
                  placeholder={
                    tpl.otherIncome !== undefined
                      ? String(tpl.otherIncome).replace(".", ",")
                      : "0"
                  }
                  ariaLabel={`Sonstige Einnahmen ${MONTH_NAMES[i]}`}
                  onCommit={(v) => setMonthField(ym, "otherIncome", v)}
                />
              </div>

              <h3>Ausgaben</h3>
              {s.groups.map((g) => {
                if (g.variable) {
                  return (
                    <div key={g.name}>
                      <div className="cost-row">
                        <span className="label">
                          {g.name}
                          <span className="muted">
                            {" "}
                            · variabel · gesamt {euro(g.total)}
                          </span>
                        </span>
                      </div>
                      {g.entries.map((e) => (
                        <div className="entry-line" key={e.id}>
                          <span className="label">{e.label}</span>
                          <span>{euro(e.amount)}</span>
                          <button
                            className="small-x"
                            title="Posten entfernen"
                            aria-label={`Posten ${e.label} entfernen`}
                            onClick={() => removeEntry(e.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <EntryAdder
                        onAdd={(label, amount) =>
                          addEntry(ym, g.name, label, amount)
                        }
                      />
                      {g.contracts.map((c) => (
                        <div className="cost-sub" key={c.id}>
                          + Vertrag {c.name}: {euro(c.amount)}
                        </div>
                      ))}
                    </div>
                  );
                }

                const isLoose = g.name === NO_GROUP;
                return (
                  <div key={g.name}>
                    <div className="cost-row">
                      <span className="label">
                        {g.name}
                        {g.contractSum > 0 && (
                          <span className="muted"> · gesamt {euro(g.total)}</span>
                        )}
                      </span>
                      {!isLoose && (
                        <AmountInput
                          key={`${ym}-${g.name}-${plan.expenses?.[g.name]}`}
                          value={plan.expenses?.[g.name]}
                          placeholder={
                            tpl.expenses?.[g.name] !== undefined
                              ? String(tpl.expenses[g.name]).replace(".", ",")
                              : "0"
                          }
                          ariaLabel={`${g.name} ${MONTH_NAMES[i]}`}
                          onCommit={(v) => setMonthExpense(ym, g.name, v)}
                        />
                      )}
                    </div>
                    {g.contracts.map((c) => (
                      <div className="cost-sub" key={c.id}>
                        + Vertrag {c.name}: {euro(c.amount)}
                      </div>
                    ))}
                  </div>
                );
              })}

              <div className="sum-row">
                <span>Einnahmen</span>
                <span>{euro(s.income)}</span>
              </div>
              <div className="sum-row">
                <span>Ausgaben</span>
                <span>{euro(s.expenses)}</span>
              </div>
              <div className="sum-row">
                <span>Saldo</span>
                <span className={s.saldo >= 0 ? "pos" : "neg"}>
                  {euro(s.saldo)}
                </span>
              </div>
            </div>
          </details>
        );
      })}

      <p className="muted">
        Bei Festkosten übernehmen leere Felder die Vorlage (grauer Wert), ein
        eingetragener Wert gilt nur für den jeweiligen Monat. Bei variablen
        Gruppen trägst du einzelne Posten mit Verwendungszweck und Betrag ein.
        Vertragskosten kommen automatisch dazu.
      </p>
    </div>
  );
}

// Zwei Felder (Verwendungszweck, Betrag) und ein Plus-Knopf für variable Gruppen
function EntryAdder({
  onAdd,
}: {
  onAdd: (label: string, amount: number) => void;
}) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  function add() {
    const n = Number(amount.trim().replace(",", "."));
    if (!label.trim()) {
      alert("Bitte gib einen Verwendungszweck ein.");
      return;
    }
    if (amount.trim() === "" || !Number.isFinite(n) || n <= 0) {
      alert("Bitte gib einen gültigen Betrag ein.");
      return;
    }
    onAdd(label.trim(), Math.round(n * 100) / 100);
    setLabel("");
    setAmount("");
  }

  function onEnter(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div className="row entry-adder">
      <input
        placeholder="Verwendungszweck"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={onEnter}
      />
      <input
        className="amount-input"
        inputMode="decimal"
        placeholder="Betrag"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={onEnter}
      />
      <button type="button" className="primary" onClick={add} aria-label="Posten hinzufügen">
        +
      </button>
    </div>
  );
}