import { normalizeLibrary } from "../models/types";
import type { Library } from "../models/types";

export type SectionId =
  | "recipes"
  | "travel"
  | "calendar"
  | "todos"
  | "contracts"
  | "costs"
  | "shopping";

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "recipes", label: "Rezepte" },
  { id: "travel", label: "Reisen" },
  { id: "calendar", label: "Kalender" },
  { id: "todos", label: "To-Do und Wunschliste" },
  { id: "contracts", label: "Verträge" },
  { id: "costs", label: "Kosten" },
  { id: "shopping", label: "Einkaufsliste" },
];

export function sectionLabel(id: SectionId): string {
  return SECTIONS.find((s) => s.id === id)?.label ?? id;
}

function isSection(s: string): s is SectionId {
  return SECTIONS.some((x) => x.id === s);
}

const isArr = (v: unknown): v is unknown[] => Array.isArray(v);
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// Daten eines Bereichs (inklusive der zugehörigen Konfiguration)
export function pickSection(lib: Library, id: SectionId): Record<string, unknown> {
  switch (id) {
    case "recipes":
      return {
        recipes: lib.recipes,
        recipeCategories: lib.settings.recipeCategories,
      };
    case "travel":
      return { places: lib.places, placeLabels: lib.settings.placeLabels };
    case "calendar":
      return {
        events: lib.events,
        eventCategories: lib.settings.eventCategories,
      };
    case "todos":
      return { todos: lib.todos, wishes: lib.wishes };
    case "contracts":
      return { contracts: lib.contracts, priceChecks: lib.priceChecks };
    case "costs":
      return {
        budget: lib.budget,
        expenseEntries: lib.expenseEntries,
        costGroups: lib.settings.costGroups,
        variableCostGroups: lib.settings.variableCostGroups,
      };
    case "shopping":
      return { shopping: lib.shopping };
  }
}

// Ersetzt einen Bereich in der Bibliothek. Gibt null zurück, wenn die Daten nicht passen.
export function applySection(
  lib: Library,
  id: SectionId,
  data: Record<string, unknown>
): Library | null {
  const settings = lib.settings;
  switch (id) {
    case "recipes":
      if (!isArr(data.recipes) || !isArr(data.recipeCategories)) return null;
      return normalizeLibrary({
        ...lib,
        recipes: data.recipes as Library["recipes"],
        settings: {
          ...settings,
          recipeCategories: data.recipeCategories as string[],
        },
      });
    case "travel":
      if (!isArr(data.places) || !isArr(data.placeLabels)) return null;
      return normalizeLibrary({
        ...lib,
        places: data.places as Library["places"],
        settings: {
          ...settings,
          placeLabels: data.placeLabels as Library["settings"]["placeLabels"],
        },
      });
    case "calendar":
      if (!isArr(data.events) || !isArr(data.eventCategories)) return null;
      return normalizeLibrary({
        ...lib,
        events: data.events as Library["events"],
        settings: {
          ...settings,
          eventCategories:
            data.eventCategories as Library["settings"]["eventCategories"],
        },
      });
    case "todos":
      if (!isArr(data.todos) || !isArr(data.wishes)) return null;
      return normalizeLibrary({
        ...lib,
        todos: data.todos as Library["todos"],
        wishes: data.wishes as Library["wishes"],
      });
    case "contracts":
      if (!isArr(data.contracts) || !isArr(data.priceChecks)) return null;
      return normalizeLibrary({
        ...lib,
        contracts: data.contracts as Library["contracts"],
        priceChecks: data.priceChecks as Library["priceChecks"],
      });
    case "costs":
      if (
        !isObj(data.budget) ||
        !isArr(data.expenseEntries) ||
        !isArr(data.costGroups) ||
        !isArr(data.variableCostGroups)
      ) {
        return null;
      }
      return normalizeLibrary({
        ...lib,
        budget: data.budget as Library["budget"],
        expenseEntries: data.expenseEntries as Library["expenseEntries"],
        settings: {
          ...settings,
          costGroups: data.costGroups as string[],
          variableCostGroups: data.variableCostGroups as string[],
        },
      });
    case "shopping":
      if (!isArr(data.shopping)) return null;
      return normalizeLibrary({
        ...lib,
        shopping: data.shopping as Library["shopping"],
      });
  }
}

export type ParsedBackup =
  | { kind: "full"; library: Library }
  | { kind: "section"; section: SectionId; data: Record<string, unknown> };

// Liest eine Backup-Datei: Gesamtbackup oder Bereichs-Datei
export function parseBackup(text: string): ParsedBackup | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObj(json)) return null;

  if (
    json.kind === "section" &&
    typeof json.section === "string" &&
    isSection(json.section) &&
    isObj(json.data)
  ) {
    return { kind: "section", section: json.section, data: json.data };
  }
  if (Array.isArray(json.recipes)) {
    return { kind: "full", library: normalizeLibrary(json as Partial<Library>) };
  }
  return null;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSectionFile(lib: Library, id: SectionId): void {
  downloadJson(`basislager-${id}-${new Date().toISOString().slice(0, 10)}.json`, {
    app: "basislager",
    kind: "section",
    section: id,
    exportedAt: new Date().toISOString(),
    data: pickSection(lib, id),
  });
}