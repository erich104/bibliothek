import { emptyLibrary, normalizeLibrary } from "../models/types";
import type { Library } from "../models/types";

// Kommt von dem Google-Skript aus index.html
declare const google: any;

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "bibliothek.json";

let accessToken: string | null = null;
let tokenExpiresAt = 0;
let fileId: string | null = null;

// Anmeldung: öffnet das Google-Fenster
export function login(): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        accessToken = response.access_token;
        // Token gilt ca. 1 Stunde, wir rechnen eine Minute Puffer ein
        tokenExpiresAt = Date.now() + (response.expires_in - 60) * 1000;
        resolve();
      },
      error_callback: (err: any) =>
        reject(new Error(err?.type ?? "Anmeldung fehlgeschlagen")),
    });
    client.requestAccessToken();
  });
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