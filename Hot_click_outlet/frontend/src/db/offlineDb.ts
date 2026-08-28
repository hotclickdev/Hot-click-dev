import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Id, JsonBody } from '@/types/api'

const DB_NAME = 'hotclick-offline'
const ESTADOS_PENDIENTES = new Set<string>(['PENDIENTE', 'ERROR', 'CONFLICTO'])
const DB_VERSION = 1

export type SyncQueueItem = {
  id: string
  tipo: string
  endpoint: string
  method: string
  payload: JsonBody
  creadoAt: string
  intentos: number
  estado: string
  errorDetalle: string | null
}

type ProductCacheEntry = {
  cacheKey: string
  productos: JsonBody[]
  cachedAt: string
}

interface HotclickOfflineDB extends DBSchema {
  syncQueue: {
    key: string
    value: SyncQueueItem
    indexes: { 'by-estado': string; 'by-creadoAt': string }
  }
  productCache: {
    key: string
    value: ProductCacheEntry
    indexes: { 'by-cachedAt': string }
  }
}

/**
 * Schema:
 *  syncQueue — operaciones en cola para sincronizar cuando haya conexión
 *  productCache — caché manual del catálogo de productos por empresa
 */
let _db: IDBPDatabase<HotclickOfflineDB> | null = null

async function getDb() {
  if (_db) return _db
  _db = await openDB<HotclickOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cola de sincronización
      if (!db.objectStoreNames.contains('syncQueue')) {
        const store = db.createObjectStore('syncQueue', { keyPath: 'id' })
        store.createIndex('by-estado', 'estado')
        store.createIndex('by-creadoAt', 'creadoAt')
      }
      // Caché de productos
      if (!db.objectStoreNames.contains('productCache')) {
        const store = db.createObjectStore('productCache', { keyPath: 'cacheKey' })
        store.createIndex('by-cachedAt', 'cachedAt')
      }
    },
  })
  return _db
}

// ── syncQueue ─────────────────────────────────────────────────────────────

export async function encolarOperacion({ tipo, endpoint, method, payload }: {
  tipo: string
  endpoint: string
  method?: string
  payload: JsonBody
}) {
  const db = await getDb()
  const item: SyncQueueItem = {
    id:           crypto.randomUUID(),
    tipo,
    endpoint,
    method:       method ?? 'POST',
    payload,
    creadoAt:     new Date().toISOString(),
    intentos:     0,
    estado:       'PENDIENTE',   // PENDIENTE | SINCRONIZANDO | OK | ERROR | CONFLICTO
    errorDetalle: null,
  }
  await db.add('syncQueue', item)
  return item
}

export async function getPendientes() {
  const db = await getDb()
  const todos = await db.getAll('syncQueue')
  return todos
    .filter((i) => i.estado === 'PENDIENTE' || i.estado === 'ERROR')
    .sort((a, b) => a.creadoAt.localeCompare(b.creadoAt))
}

export async function getColaCompleta() {
  const db = await getDb()
  const todos = await db.getAll('syncQueue')
  return todos.sort((a, b) => a.creadoAt.localeCompare(b.creadoAt))
}

export async function contarPendientes() {
  const db = await getDb()
  const todos = await db.getAll('syncQueue')
  return todos.filter((i) => ESTADOS_PENDIENTES.has(i.estado)).length
}

export async function actualizarEstado(id: Id, estado: string, errorDetalle: string | null | undefined = null) {
  const db = await getDb()
  const item = await db.get('syncQueue', String(id))
  if (!item) return
  item.estado = estado
  item.errorDetalle = errorDetalle ?? null
  if (estado !== 'PENDIENTE') item.intentos = (item.intentos ?? 0) + 1
  await db.put('syncQueue', item)
  return item
}

export async function eliminarItem(id: Id) {
  const db = await getDb()
  await db.delete('syncQueue', String(id))
}

/** Limpia los items OK con más de 24h */
export async function limpiarOk() {
  const db = await getDb()
  const todos = await db.getAll('syncQueue')
  const corte = Date.now() - 24 * 60 * 60 * 1000
  for (const item of todos) {
    if (item.estado === 'OK' && new Date(item.creadoAt).getTime() < corte) {
      await db.delete('syncQueue', item.id)
    }
  }
}

// ── productCache ──────────────────────────────────────────────────────────

export async function guardarProductCache(empresaId: Id, productos: JsonBody[]) {
  const db = await getDb()
  await db.put('productCache', {
    cacheKey: `productos_${empresaId}`,
    productos,
    cachedAt: new Date().toISOString(),
  })
}

export async function getProductCache(empresaId: Id) {
  const db = await getDb()
  const entry = await db.get('productCache', `productos_${empresaId}`)
  if (!entry) return null
  // Expirar si tiene más de 30 minutos
  const age = Date.now() - new Date(entry.cachedAt).getTime()
  if (age > 30 * 60 * 1000) return null
  return entry.productos
}
