export type Recipe = {
  id: string;
  title: string;
  category?: string;
  image?: string; // verkleinertes Bild als Data-URL
  ingredients: { name: string; amount?: string; unit?: string }[];
  steps: string[];
  servings?: number;
  minutes?: number;
  tags: string[];
  source?: string;
  notes?: string;
  rating?: number;
  createdAt: string;
};

export type PlaceLabel = {
  name: string;
  color: string; // z. B. "#2e8b57"
};

export type Place = {
  id: string;
  name: string;
  country?: string;
  lat: number;
  lng: number;
  status: "visited" | "wishlist";
  labels?: string[]; // Namen der Labels
  mainLabel?: string; // bestimmt die Pin-Farbe
  highlight?: boolean; // goldener Rand
  date?: string;
  notes?: string;
  link?: string;
  createdAt: string;
};

export type TodoPriority = "urgent" | "soon" | "normal";

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  priority?: TodoPriority; // fehlt = "normal"
  dueDate?: string; // "JJJJ-MM-TT"
  createdAt: string;
};

// Langfristiger Wunsch (nur Text)
export type Wish = {
  id: string;
  text: string;
  createdAt: string;
};

export type ContractInterval = "monthly" | "quarterly" | "yearly";

// Preisänderung, gilt ab dem Monat "from" ("JJJJ-MM")
export type PriceChange = {
  from: string;
  cost: number;
};

export type Contract = {
  id: string;
  name: string;
  provider?: string;
  type: string; // Abo, Versicherung, Vertrag, ...
  cost?: number; // Grundpreis pro Abbuchung, in Euro
  priceChanges?: PriceChange[]; // spätere Preisänderungen
  months: number[]; // Abbuchungsmonate (1 bis 12)
  interval?: ContractInterval; // veraltet, nur zum Übernehmen alter Daten
  costGroup?: string; // Kostengruppe in der Kostenübersicht
  lastPriceCheck?: string; // "JJJJ-MM-TT"
  cancelled?: boolean; // gekündigt: keine Kosten nach "Läuft bis"
  runsUntil?: string; // "JJJJ-MM-TT"
  cancelBy?: string; // "JJJJ-MM-TT"
  notes?: string;
  createdAt: string;
};

// Von Hand angelegte Preisprüfung für ein Datum
export type PriceCheck = {
  id: string;
  contractId: string;
  date: string; // "JJJJ-MM-TT"
  createdAt: string;
};

export type EventCategory = {
  name: string;
  color: string;
};

export type RepeatUnit = "day" | "week" | "month" | "year";

export type Repeat = {
  unit: RepeatUnit;
  every: number; // alle n Einheiten
  until?: string; // letztes Datum der Wiederholung
};

export type CalendarEvent = {
  id: string;
  title: string;
  category?: string; // Name der Kategorie
  date: string; // "JJJJ-MM-TT"
  endDate?: string; // bei mehrtägigen Terminen
  time?: string; // "HH:MM"
  repeat?: Repeat;
  notes?: string;
  createdAt: string;
};

export type ShoppingItem = {
  id: string;
  text: string;
  done: boolean;
  recipeTitle?: string; // aus welchem Rezept die Zutat stammt
};

// Plan für einen Monat: leere Felder übernehmen die Vorlage
export type MonthPlan = {
  salary?: number;
  otherIncome?: number;
  expenses?: Record<string, number>; // je Festkosten-Gruppe, ohne Verträge
};

export type Budget = {
  template: MonthPlan; // gilt für alle Monate
  months: Record<string, MonthPlan>; // Überschreibungen je Monat ("JJJJ-MM")
};

// Einzelner Posten einer variablen Kostengruppe (z. B. ein Einkauf)
export type ExpenseEntry = {
  id: string;
  ym: string; // Monat, "JJJJ-MM"
  group: string; // Name der Kostengruppe
  label: string; // Verwendungszweck
  amount: number;
  createdAt: string;
};

export type Settings = {
  recipeCategories: string[];
  placeLabels: PlaceLabel[];
  eventCategories: EventCategory[];
  costGroups: string[];
  variableCostGroups: string[]; // Teilmenge von costGroups, die variabel sind
};

export type Library = {
  version: 1;
  recipes: Recipe[];
  places: Place[];
  todos: Todo[];
  wishes: Wish[];
  contracts: Contract[];
  priceChecks: PriceCheck[];
  budget: Budget;
  expenseEntries: ExpenseEntry[];
  events: CalendarEvent[];
  shopping: ShoppingItem[];
  settings: Settings;
};

export const DEFAULT_RECIPE_CATEGORIES = [
  "Hauptgang",
  "Vorspeise",
  "Nachspeise",
  "Kuchen",
  "Getränk",
];

export const DEFAULT_PLACE_LABELS: PlaceLabel[] = [
  { name: "Klettersteig", color: "#c0392b" },
  { name: "Wanderung", color: "#2e8b57" },
  { name: "Sonnenaufgang", color: "#f39c12" },
  { name: "Stadt", color: "#3b82f6" },
  { name: "Strand", color: "#06b6d4" },
  { name: "Essen & Trinken", color: "#8e44ad" },
];

export const DEFAULT_EVENT_CATEGORIES: EventCategory[] = [
  { name: "Privat", color: "#2f6f4f" },
  { name: "Arzt", color: "#dc2626" },
  { name: "Geburtstag", color: "#db2777" },
  { name: "Arbeit", color: "#0891b2" },
  { name: "Sonstiges", color: "#6b7280" },
];

export const DEFAULT_COST_GROUPS = [
  "Miete",
  "Essen",
  "Mobilität",
  "Versicherungen",
  "Freizeit",
  "Sonstiges",
];

export const DEFAULT_VARIABLE_COST_GROUPS = ["Essen"];

export function emptyLibrary(): Library {
  return {
    version: 1,
    recipes: [],
    places: [],
    todos: [],
    wishes: [],
    contracts: [],
    priceChecks: [],
    budget: { template: {}, months: {} },
    expenseEntries: [],
    events: [],
    shopping: [],
    settings: {
      recipeCategories: [...DEFAULT_RECIPE_CATEGORIES],
      placeLabels: DEFAULT_PLACE_LABELS.map((l) => ({ ...l })),
      eventCategories: DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c })),
      costGroups: [...DEFAULT_COST_GROUPS],
      variableCostGroups: [...DEFAULT_VARIABLE_COST_GROUPS],
    },
  };
}

// Alte Verträge hatten eine Zahlweise statt Abbuchungsmonaten
function monthsFromInterval(interval: ContractInterval | undefined): number[] {
  if (interval === "quarterly") return [1, 4, 7, 10];
  if (interval === "yearly") return [1];
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

// Ergänzt fehlende Felder (z. B. bei Daten aus älteren Versionen der App)
export function normalizeLibrary(
  data: Partial<Library> | null | undefined
): Library {
  const d: Partial<Library> = data ?? {};
  const categories = d.settings?.recipeCategories;
  const labels = d.settings?.placeLabels;
  const eventCats = d.settings?.eventCategories;
  const costGroups = d.settings?.costGroups;
  const variableGroups = d.settings?.variableCostGroups;
  const budget = d.budget;
  return {
    version: 1,
    recipes: Array.isArray(d.recipes) ? d.recipes : [],
    places: Array.isArray(d.places) ? d.places : [],
    todos: Array.isArray(d.todos) ? d.todos : [],
    wishes: Array.isArray(d.wishes) ? d.wishes : [],
    contracts: Array.isArray(d.contracts)
      ? d.contracts.map((c) => ({
          ...c,
          months: Array.isArray(c.months)
            ? c.months
            : monthsFromInterval(c.interval),
        }))
      : [],
    priceChecks: Array.isArray(d.priceChecks) ? d.priceChecks : [],
    budget: {
      template: budget?.template ?? {},
      months: budget?.months ?? {},
    },
    expenseEntries: Array.isArray(d.expenseEntries) ? d.expenseEntries : [],
    events: Array.isArray(d.events) ? d.events : [],
    shopping: Array.isArray(d.shopping) ? d.shopping : [],
    settings: {
      recipeCategories: Array.isArray(categories)
        ? categories
        : [...DEFAULT_RECIPE_CATEGORIES],
      placeLabels: Array.isArray(labels)
        ? labels
        : DEFAULT_PLACE_LABELS.map((l) => ({ ...l })),
      eventCategories: Array.isArray(eventCats)
        ? eventCats
        : DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c })),
      costGroups: Array.isArray(costGroups)
        ? costGroups
        : [...DEFAULT_COST_GROUPS],
      // Bei bestehenden Daten bleiben zunächst alle Gruppen Festkosten
      variableCostGroups: Array.isArray(variableGroups) ? variableGroups : [],
    },
  };
}