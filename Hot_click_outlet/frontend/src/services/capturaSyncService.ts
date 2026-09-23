import {
  getCapturaPendientes,
  actualizarCapturaEstado,
  eliminarCapturaItem,
} from '@/db/capturaOffline'
import { inventarioPaqueteService } from '@/services/inventarioPaqueteService'
import type { LineaRequest } from '@/services/inventarioPaqueteService'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'

const MAX_INTENTOS_SYNC = 5
/** Persistido tras POST OK; si el delete falla, el reintento solo limpia la cola. */
const MARCA_POST_OK = 'HC_POST_OK'

/**
 * Sincroniza la cola de captura offline: sube foto si hay blob, luego POST línea.
 * Tras un POST exitoso se marca HC_POST_OK antes de borrar — evita doble POST si
 * el proceso muere entre respuesta y delete.
 */
export async function procesarColaCaptura() {
  const pendientes = await getCapturaPendientes()
  let procesados = 0
  let errores = 0

  for (const item of pendientes) {
    if (item.errorDetalle === MARCA_POST_OK || item.estado === 'OK') {
      await eliminarCapturaItem(item.id)
      procesados++
      continue
    }

    if (item.intentos >= MAX_INTENTOS_SYNC) {
      if (item.estado !== 'ERROR') {
        await actualizarCapturaEstado(item.id, 'ERROR', 'Máximo de reintentos alcanzado')
      }
      continue
    }

    await actualizarCapturaEstado(item.id, 'SINCRONIZANDO')
    try {
      const payload = { ...(item.payload as LineaRequest) }
      if (item.fotoBlob) {
        const file = new File([item.fotoBlob], 'captura.jpg', { type: 'image/jpeg' })
        const { data } = await inventarioPaqueteService.subirImagen(file)
        payload.imagenUrl = data.url
      }
      await inventarioPaqueteService.agregarLinea(item.paqueteId, payload)
      await actualizarCapturaEstado(item.id, 'OK', MARCA_POST_OK)
      await eliminarCapturaItem(item.id)
      procesados++
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err, 'Error de sync')
      await actualizarCapturaEstado(item.id, 'ERROR', msg)
      errores++
    }
  }

  return { procesados, errores }
}
