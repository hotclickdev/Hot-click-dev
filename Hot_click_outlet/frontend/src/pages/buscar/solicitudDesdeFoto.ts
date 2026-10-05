import { normalizarTelefono } from '@/pages/servicios/serviciosHelpers'
import { servicioService } from '@/services/servicioService'

const TELEFONO_DIGITOS_MIN = 7
const TELEFONO_DIGITOS_MAX = 15

/** Prefijo para que el admin distinga estas solicitudes de las de Servicios HOT. */
export const PREFIJO_SOLICITUD_FOTO = '[Búsqueda por foto]'

/** Texto de la solicitud: la foto ya va adjunta; acá queda por qué se pidió y qué se detectó. */
export function descripcionSolicitudFoto(etiquetas: string[], habiaParecidos: boolean, falloAnalisis = false): string {
  const motivo = motivoSolicitud(habiaParecidos, falloAnalisis)
  const detectado = etiquetas.map((e) => e.trim()).filter(Boolean).join(', ')
  const detalle = detectado ? ` Detectamos: ${detectado}.` : ''
  return `${PREFIJO_SOLICITUD_FOTO} ${motivo}${detalle}`
}

function motivoSolicitud(habiaParecidos: boolean, falloAnalisis: boolean): string {
  if (falloAnalisis) return 'No se pudo comparar la foto con el catálogo.'
  if (habiaParecidos) return 'Las opciones parecidas no eran el producto.'
  return 'No había un producto parecido en el catálogo.'
}

/** Teléfono listo para la solicitud, o null si no alcanza. Sin sesión es obligatorio. */
export function telefonoSolicitudFoto(texto: string): string | null {
  const digitos = texto.replace(/\D/g, '')
  if (digitos.length < TELEFONO_DIGITOS_MIN || digitos.length > TELEFONO_DIGITOS_MAX) return null
  const normalizado = normalizarTelefono(texto)
  return normalizado.length <= 30 ? normalizado : null
}

/** La subida responde `{ url }` (el interceptor ya quitó el sobre) o la URL directa. */
export function urlDeFotoSubida(data: unknown): string | null {
  if (typeof data === 'string' && data.startsWith('http')) return data
  if (!data || typeof data !== 'object' || !('url' in data)) return null
  const url = (data as { url: unknown }).url
  return typeof url === 'string' && url !== '' ? url : null
}

/** La foto no se pudo guardar: no tiene sentido una solicitud de búsqueda sin la imagen. */
export class SolicitudFotoError extends Error {
  constructor() {
    super('solicitud-foto')
    this.name = 'SolicitudFotoError'
  }
}

/**
 * Manda la solicitud desde la búsqueda por foto, sin pasar por Servicios HOT.
 * La foto de la búsqueda se adjunta para que quien la atienda vea el producto.
 */
export async function enviarSolicitudDesdeFoto(
  archivo: File,
  descripcion: string,
  nombre: string | null,
  telefono: string | null,
  turnstileToken: string,
): Promise<void> {
  const fd = new FormData()
  fd.append('file', archivo)
  const subida = await servicioService.subirFoto(fd)
  const url = urlDeFotoSubida(subida.data)
  if (!url) throw new SolicitudFotoError()
  await servicioService.crear({
    descripcion,
    presupuesto: '',
    nombreContacto: nombre ?? '',
    ...(telefono ? { telefonoContacto: telefono } : {}),
    fotosUrls: JSON.stringify([url]),
    ...(turnstileToken ? { turnstileToken } : {}),
  })
}
