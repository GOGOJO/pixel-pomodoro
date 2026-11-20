import { isTauri } from "./platform";

export const MAX_AMBIENCE_MB = 200;

async function invoke<T>(cmd: string, args?: Record<string, unknown> | Uint8Array): Promise<T> {
  const core = await import("@tauri-apps/api/core");
  return core.invoke<T>(cmd, args);
}

const DB = "pixel-pomodoro";
const STORE = "files";
const KEY = "ambience";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }).finally(() => d.close());
}

/** Stores the user's ambient track (in the app data folder, or IndexedDB in a browser). */
export async function saveCustomAmbience(file: Blob): Promise<void> {
  if (file.size > MAX_AMBIENCE_MB * 1024 * 1024) throw new Error(`Files up to ${MAX_AMBIENCE_MB} MB only.`);
  if (isTauri) {
    await invoke<void>("save_ambience", new Uint8Array(await file.arrayBuffer()));
  } else {
    await idb("readwrite", (s) => s.put(file, KEY));
  }
}

export async function loadCustomAmbience(type: string): Promise<Blob | null> {
  if (isTauri) {
    const buf = await invoke<ArrayBuffer>("load_ambience");
    return buf.byteLength ? new Blob([buf], { type }) : null;
  }
  return (await idb<Blob | undefined>("readonly", (s) => s.get(KEY))) ?? null;
}

export async function deleteCustomAmbience(): Promise<void> {
  if (isTauri) await invoke<void>("delete_ambience");
  else await idb("readwrite", (s) => s.delete(KEY));
}

/** Resolves if this webview can decode the file, so bad uploads fail before they're saved. */
export function checkPlayable(file: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Audio();
    const done = (err?: Error) => {
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      if (err) reject(err);
      else resolve();
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done();
    el.onerror = () => done(new Error("That file can't be played. Try MP3, M4A, WAV, AIFF or FLAC."));
    el.src = url;
  });
}
