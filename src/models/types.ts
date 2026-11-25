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

export type Todo = {
  id: string;
  text: string;
  done: boolean;
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

export type CalendarEvent = {
  id: string;
  title: string;
  date: string; // "JJJJ-MM-TT"
  endDate?: string; // bei mehrtägigen Terminen
  time?: string; // "HH:MM"
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
    },
  };
}