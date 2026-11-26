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

export type ContractInterval = "monthly" | "quarterly" | "yearly";

export type Contract = {
  id: string;
  name: string;
  provider?: string;
  type: string; // Abo, Versicherung, Vertrag, ...
  cost?: number; // pro Zahlung, in Euro
  interval: ContractInterval;
  runsUntil?: string; // "JJJJ-MM-TT"
  cancelBy?: string; // "JJJJ-MM-TT"
  notes?: string;
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

export type Settings = {
  recipeCategories: string[];
  placeLabels: PlaceLabel[];
  eventCategories: EventCategory[];
};

export type Library = {
  version: 1;
  recipes: Recipe[];
  places: Place[];
  todos: Todo[];
  contracts: Contract[];
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

export function emptyLibrary(): Library {
  return {
    version: 1,
    recipes: [],
    places: [],
    todos: [],
    contracts: [],
    events: [],
    shopping: [],
    settings: {
      recipeCategories: [...DEFAULT_RECIPE_CATEGORIES],
      placeLabels: DEFAULT_PLACE_LABELS.map((l) => ({ ...l })),
      eventCategories: DEFAULT_EVENT_CATEGORIES.map((c) => ({ ...c })),
    },
  };
}

// Ergänzt fehlende Felder (z. B. bei Daten aus älteren Versionen der App)
export function normalizeLibrary(
  data: Partial<Library> | null | undefined
): Library {
  const d: Partial<Library> = data ?? {};
  const categories = d.settings?.recipeCategories;
  const labels = d.settings?.placeLabels;
  const eventCats = d.settings?.eventCategories;
  return {
    version: 1,
    recipes: Array.isArray(d.recipes) ? d.recipes : [],
    places: Array.isArray(d.places) ? d.places : [],
    todos: Array.isArray(d.todos) ? d.todos : [],
    contracts: Array.isArray(d.contracts) ? d.contracts : [],
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
    },
  };
}