import { emptyLibrary, normalizeLibrary } from "../models/types";
import type { Library } from "../models/types";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "bibliothek.json";

let accessToken: string | null = null;
let tokenExpiresAt = 0;
let fileId: string | null = null;
let loginError: string | null = null;
let useChooser = false;

// Adresse, zu der Google nach der Anmeldung zurückkehrt
function redirectUri(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}

// Anmeldung: Die ganze Seite wechselt zu Google und kommt danach zurück
export function login(): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem("oauth_state", state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "token",
    scope: SCOPE,
    state,
    include_granted_scopes: "true",
  });
  if (useChooser) params.set("prompt", "select_account");
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Abmelden: Token vergessen und bei Google ungültig machen
export function logout(): void {
  const token = accessToken;
  accessToken = null;
  tokenExpiresAt = 0;
  fileId = null;
  useChooser = true; // beim nächsten Anmelden das Konto neu auswählen lassen
  if (token) {
    fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${encodeURIComponent(token)}`,
    }).catch(() => {
      // Fehler sind hier egal, das Token läuft ohnehin nach einer Stunde ab
    });
  }
}

// Beim Start der Seite: Kommen wir gerade von der Google-Anmeldung zurück?
function readLoginResult() {
  const hash = window.location.hash;
  if (!hash.includes("access_token") && !hash.includes("error")) return;

  const params = new URLSearchParams(hash.slice(1));
  const expectedState = sessionStorage.getItem("oauth_state");
  sessionStorage.removeItem("oauth_state");

  // Token sofort aus der Adresszeile entfernen
  history.replaceState(null, "", window.location.pathname + window.location.search);

  const error = params.get("error");
  if (error) {
    loginError = error;
    return;
  }
  if (!expectedState || params.get("state") !== expectedState) {
    loginError = "Ungültige Anmeldeantwort (state).";
    return;
  }
  const token = params.get("access_token");
  if (!token) {
    loginError = "Kein Zugriffstoken erhalten.";
    return;
  }
  accessToken = token;
  const expiresIn = Number(params.get("expires_in") ?? "3600");
  // Token gilt ca. 1 Stunde, wir rechnen eine Minute Puffer ein
  tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;
}

readLoginResult();

export function getLoginError(): string | null {
  return loginError;
}

export function isLoggedIn(): boolean {
  return accessToken !== null && Date.now() < tokenExpiresAt;
}

// Hilfsfunktion: Anfrage an Google Drive mit Anmelde-Token
async function driveFetch(url: string, options: RequestInit = {}) {
  if (!isLoggedIn()) {
    throw new Error("Bitte neu anmelden.");
  }
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Drive-Fehler ${res.status}: ${await res.text()}`);
  }
  return res;
}

// Sucht unsere Datei im versteckten App-Ordner
async function findFile(): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,name)`
  );
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

// Laden: gibt die Bibliothek zurück (oder eine leere, falls es noch keine Datei gibt)
export async function loadLibrary(): Promise<Library> {
  fileId = await findFile();
  if (!fileId) return emptyLibrary();
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
  );
  return normalizeLibrary(await res.json());
}

// Speichern: legt die Datei beim ersten Mal an, danach wird sie überschrieben
export async function saveLibrary(lib: Library): Promise<void> {
  if (!fileId) {
    fileId = await findFile();
  }

  if (!fileId) {
    // Datei neu anlegen
    const metadata = { name: FILE_NAME, parents: ["appDataFolder"] };
    const boundary = "bibliothek_boundary";
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(lib)}\r\n` +
      `--${boundary}--`;
    const res = await driveFetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      }
    );
    fileId = (await res.json()).id;
  } else {
    // Bestehende Datei überschreiben
    await driveFetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lib),
      }
    );
  }
}