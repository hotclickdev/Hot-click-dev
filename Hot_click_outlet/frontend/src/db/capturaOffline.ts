import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Id, JsonBody } from '@/types/api'

const DB_NAME = 'hotclick-captura-offline'
const DB_VERSION = 1

export type CapturaQueueItem = {
  id: string
  tipo: string
  paqueteId: Id
  payload: JsonBody
  fotoBlob: Blob | null
  creadoAt: string
  intentos: number
  estado: string
  errorDetalle: string | null
}

interface CapturaOfflineDB extends DBSchema {
  capturaQueue: {
    key: string
    value: CapturaQueueItem
    indexes: { 'by-estado': string; 'by-creadoAt': string }
  }
}

let _db: IDBPDatabase<CapturaOfflineDB> | null = null

async function getDb() {
  if (_db) return _db
  _db = await openDB<CapturaOfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('capturaQueue')) {
        const store = db.createObjectStore('capturaQueue', { keyPath: 'id' })
        store.createIndex('by-estado', 'estado')
        store.createIndex('by-creadoAt', 'creadoAt')
      }
    },
  })
  return _db
}

export async function encolarCaptura(opts: {
  tipo: string
  paqueteId: Id
  payload: JsonBody
  fotoBlob?: Blob | null
}) {
  const db = await getDb()
  const item: CapturaQueueItem = {
    id: crypto.randomUUID(),
    tipo: opts.tipo,
    paqueteId: opts.paqueteId,
    payload: opts.payload,
    fotoBlob: opts.fotoBlob ?? null,
    creadoAt: new Date().toISOString(),
    intentos: 0,
    estado: 'PENDIENTE',
    errorDetalle: null,
  }
  await db.add('capturaQueue', item)
  return item
}

const MAX_INTENTOS_CAPTURA = 5

/** Pendiente, error reintentable, o sync colgado (crash mid-flight). */
export function esCapturaReintentable(item: CapturaQueueItem): boolean {
  const activo =
    item.estado === 'PENDIENTE'
    || item.estado === 'ERROR'
    || item.estado === 'SINCRONIZANDO'
  return activo && item.intentos < MAX_INTENTOS_CAPTURA
}

export async function getCapturaPendientes() {
  const db = await getDb()
  const todos = await db.getAll('capturaQueue')
  return todos
    .filter(esCapturaReintentable)
    .sort((a, b) => a.creadoAt.localeCompare(b.creadoAt))
}

export async function contarCapturaPendientes() {
  const db = await getDb()
  const todos = await db.getAll('capturaQueue')
  return todos.filter(esCapturaReintentable).length
}

export async function getCapturaColaCompleta() {
  const db = await getDb()
  return (await db.getAll('capturaQueue')).sort((a, b) => b.creadoAt.localeCompare(a.creadoAt))
}

export async function actualizarCapturaEstado(id: string, estado: string, errorDetalle: string | null = null) {
  const db = await getDb()
  const item = await db.get('capturaQueue', id)
  if (!item) return
  item.estado = estado
  item.errorDetalle = errorDetalle
  if (estado === 'ERROR') item.intentos += 1
  await db.put('capturaQueue', item)
}

export async function eliminarCapturaItem(id: string) {
  const db = await getDb()
  await db.delete('capturaQueue', id)
}

/** Comprime a JPEG ~1280px calidad 0.7. Falla visible si el canvas no puede. */
export async function comprimirImagenCaptura(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const max = 1280
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo comprimir la foto')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Foto demasiado grande o formato no soportado'))
        else resolve(blob)
      },
      'image/jpeg',
      0.7,
    )
  })
}
