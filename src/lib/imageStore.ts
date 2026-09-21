/**
 * Uploaded images live in IndexedDB (localStorage can't hold blobs), keyed "<generator>:<control>".
 * Every call swallows errors: storage is a convenience, and the app must work without it.
 */
const DB_NAME = 'video-asset-maker';
const STORE = 'images';

let dbPromise: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const store = (await db()).transaction(STORE, mode).objectStore(STORE);
    return await new Promise<T>((resolve, reject) => {
      const req = op(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export const putBlob = (key: string, blob: Blob) => run('readwrite', (s) => s.put(blob, key));
export const deleteBlob = (key: string) => run('readwrite', (s) => s.delete(key));
export const getBlob = (key: string) => run<Blob>('readonly', (s) => s.get(key) as IDBRequest<Blob>);

export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = URL.createObjectURL(blob);
  });
}

/** Persist an image param (or remove it when null). Images are always backed by an object URL. */
export async function saveImage(key: string, img: HTMLImageElement | null) {
  if (!img) return void (await deleteBlob(key));
  try {
    const blob = await fetch(img.src).then((r) => r.blob());
    await putBlob(key, blob);
  } catch {
    // ignore — the image just won't survive a reload
  }
}

export async function loadImage(key: string): Promise<HTMLImageElement | null> {
  const blob = await getBlob(key);
  if (!blob) return null;
  try {
    return await blobToImage(blob);
  } catch {
    return null;
  }
}
