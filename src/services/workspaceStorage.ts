/**
 * WorkspaceStorage — IndexedDB persistence for workspace data.
 *
 * Uses the raw IndexedDB API with a thin promise wrapper so we don't
 * need an extra dependency (idb / Dexie).  The access pattern is simple:
 * list metas, load one workspace, save one workspace, delete one.
 */

import type { WorkspaceMeta, WorkspaceData } from '../types/workspace'

const DB_NAME = 'muddakir'
const DB_VERSION = 1
const STORE_NAME = 'workspaces'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'meta.id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(
  db: IDBDatabase,
  mode: IDBTransactionMode,
): IDBObjectStore {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** List lightweight metadata for all saved workspaces (sorted newest-first). */
export async function listWorkspaces(): Promise<WorkspaceMeta[]> {
  const db = await openDB()
  const all = await reqToPromise<WorkspaceData[]>(tx(db, 'readonly').getAll())
  db.close()

  return all
    .map((w) => w.meta)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Load a full workspace by ID. Returns null if not found. */
export async function loadWorkspace(id: string): Promise<WorkspaceData | null> {
  const db = await openDB()
  const result = await reqToPromise<WorkspaceData | undefined>(tx(db, 'readonly').get(id))
  db.close()
  return result ?? null
}

/** Save (create or overwrite) a workspace. */
export async function saveWorkspace(data: WorkspaceData): Promise<void> {
  const db = await openDB()
  await reqToPromise(tx(db, 'readwrite').put(data))
  db.close()
}

/** Delete a workspace by ID. */
export async function deleteWorkspace(id: string): Promise<void> {
  const db = await openDB()
  await reqToPromise(tx(db, 'readwrite').delete(id))
  db.close()
}
