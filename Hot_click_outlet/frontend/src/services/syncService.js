import api from '@/services/api'
import {
  getPendientes,
  actualizarEstado,
  eliminarItem,
  limpiarOk,
} from '@/db/offlineDb'

const DELAYS_MS = [0, 30_000, 5 * 60_000]   // intento 1: inmediato, 2: 30s, 3: 5min
const MAX_INTENTOS = 3

/**
 * Procesa la cola de operaciones pendientes.
 * Llama a la API secuencialmente (FIFO) para mantener el orden histórico.
 * Se detiene si un item falla — el operador debe resolver el conflicto primero.
 *
 * Retorna: { procesados, errores, conflictos }
 */
export async function procesarCola() {
  const pendientes = await getPendientes()
  if (pendientes.length === 0) return { procesados: 0, errores: 0, conflictos: 0 }

  let procesados = 0, errores = 0, conflictos = 0

  for (const item of pendientes) {
    await actualizarEstado(item.id, 'SINCRONIZANDO')
    try {
      const delay = DELAYS_MS[Math.min(item.intentos, DELAYS_MS.length - 1)]
      if (delay > 0) await sleep(delay)

      await api({
        method: item.method,
        url: item.endpoint,
        data: item.payload,
        headers: { 'X-Client-Request-Id': item.id },
      })
      await actualizarEstado(item.id, 'OK')
      procesados++
    } catch (err) {
      const status = err?.response?.status
      const body   = err?.response?.data

      if (status === 409) {
        // Conflicto de stock u otro conflicto de negocio
        const detalle = body?.tipo === 'STOCK_INSUFICIENTE'
          ? `Stock insuficiente: ${body.cantidadVendida} solicitados, ${body.stockReal} disponibles`
          : (body?.error ?? 'Conflicto en el servidor')
        await actualizarEstado(item.id, 'CONFLICTO', detalle)
        conflictos++
        break // pausa la cola — requiere acción manual
      }

      if (item.intentos + 1 >= MAX_INTENTOS) {
        await actualizarEstado(item.id, 'ERROR', err?.response?.data?.error ?? err.message)
        errores++
        break
      }

      await actualizarEstado(item.id, 'PENDIENTE')
    }
  }

  await limpiarOk()
  return { procesados, errores, conflictos }
}

/**
 * Descarta un item de la cola (acción manual del operador).
 */
export async function descartarItem(id) {
  await eliminarItem(id)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
