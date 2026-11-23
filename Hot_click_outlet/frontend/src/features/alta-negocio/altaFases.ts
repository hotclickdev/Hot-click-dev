/** Lógica pura del alta por fases (sin React): textos, fases y la validación del enlace de ONVO. */

export const FASES = [
  { id: 'REGISTRO', numero: 1, titulo: 'Registro' },
  { id: 'PRODUCTOS', numero: 2, titulo: 'Productos y configuración' },
  { id: 'ONVO', numero: 3, titulo: 'ONVO' },
  { id: 'REVISION_HOTCLICK', numero: 4, titulo: 'Revisión HotClick' },
  { id: 'PUBLICADA', numero: 5, titulo: 'Publicada' },
] as const

export type FaseId = (typeof FASES)[number]['id']

export type EstadoAlta = {
  altaPorFases: boolean
  estadoEmpresa: string
  fase: FaseId | null
  faseNumero: number | null
  publicada: boolean
  rechazada: boolean
  productosActivos: number
  cuentaOnvo: string
  cuentaActiva: boolean
  cuentaPerdida: boolean
}

export const TEXTO_BANNER = 'Tu tienda aún no está publicada (en espera)'
export const TEXTO_BOTON_ONVO = 'Ir a ONVO a llenar tus datos y verificar el depósito a tu cuenta'
export const TEXTO_CUENTA_PERDIDA = 'Sus pagos en línea están pausados: su cuenta de ONVO dejó de estar activa.'

const FASES_IDS = new Set<string>(FASES.map((f) => f.id))

/** Normaliza lo que llega del backend; cualquier cosa rara se descarta (el banner no se muestra). */
export function leerEstado(data: unknown): EstadoAlta | null {
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (typeof d.altaPorFases !== 'boolean') return null
  const fase = typeof d.fase === 'string' && FASES_IDS.has(d.fase) ? (d.fase as FaseId) : null
  return {
    altaPorFases: d.altaPorFases,
    estadoEmpresa: typeof d.estadoEmpresa === 'string' ? d.estadoEmpresa : '',
    fase,
    faseNumero: typeof d.faseNumero === 'number' ? d.faseNumero : null,
    publicada: d.publicada === true,
    rechazada: d.rechazada === true,
    productosActivos: typeof d.productosActivos === 'number' ? d.productosActivos : 0,
    cuentaOnvo: typeof d.cuentaOnvo === 'string' ? d.cuentaOnvo : 'SIN_CUENTA',
    cuentaActiva: d.cuentaActiva === true,
    cuentaPerdida: d.cuentaPerdida === true,
  }
}

/** El panel se muestra a negocios por fases que no están publicados, o que perdieron su cuenta. */
export function mostrarPanelAlta(e: EstadoAlta | null): boolean {
  if (!e || !e.altaPorFases) return false
  if (e.rechazada) return false
  return !e.publicada || e.cuentaPerdida
}

export type EstadoFase = 'hecha' | 'actual' | 'pendiente'

export function estadoDeFase(e: EstadoAlta, numero: number): EstadoFase {
  const actual = e.faseNumero ?? 1
  if (e.publicada && !e.cuentaPerdida) return 'hecha'
  if (numero < actual) return 'hecha'
  return numero === actual ? 'actual' : 'pendiente'
}

export function etiquetaCuenta(estado: string): { texto: string; tono: 'ok' | 'alerta' | 'neutro' | 'azul' } {
  switch (estado) {
    case 'ACTIVA': return { texto: 'Activa', tono: 'ok' }
    case 'EN_APROBACION': return { texto: 'En revisión', tono: 'azul' }
    case 'PENDIENTE_ONBOARDING': return { texto: 'Pendiente de sus datos', tono: 'neutro' }
    case 'PENDIENTE_ONVO': return { texto: 'Pendiente', tono: 'neutro' }
    case 'SUSPENDIDA': return { texto: 'Suspendida', tono: 'alerta' }
    case 'INACTIVA': return { texto: 'Inactiva', tono: 'alerta' }
    default: return { texto: 'Sin cuenta todavía', tono: 'neutro' }
  }
}

/** Mensaje corto de la fase actual, en usted. */
export function mensajeDeFase(e: EstadoAlta): string {
  if (e.cuentaPerdida) return TEXTO_CUENTA_PERDIDA
  switch (e.fase) {
    case 'PRODUCTOS': return 'Cree sus productos y configure su tienda. Todavía puede hacerlo todo desde este panel.'
    case 'ONVO': return 'Complete sus datos en ONVO y verifique el depósito a su cuenta para poder cobrar en línea.'
    case 'REVISION_HOTCLICK': return 'Su cuenta de ONVO ya está activa. HotClick está revisando su tienda y le avisaremos cuando se publique.'
    default: return 'Su tienda todavía no está visible al público.'
  }
}

/** Mostrar el botón de ONVO mientras la cuenta no esté activa (o si se perdió). */
export function mostrarBotonOnvo(e: EstadoAlta): boolean {
  return !e.cuentaActiva || e.cuentaPerdida
}

const HOSTS_ONVO = ['onvopay.com', 'onvo.cr']

/** Solo https de dominios ONVO; cualquier otra cosa no se abre. (El backend ya filtra: esto es defensa en profundidad.) */
export function urlOnvoSegura(url: unknown, hosts: readonly string[] = HOSTS_ONVO): string | null {
  if (typeof url !== 'string' || url.length === 0 || url.length > 1000) return null
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'https:' || u.username || u.password) return null
    const host = u.hostname.toLowerCase()
    return hosts.some((h) => host === h || host.endsWith(`.${h}`)) ? u.toString() : null
  } catch {
    return null
  }
}

/** Saca la URL de la respuesta de /onvo-enlace (el interceptor ya desenvuelve el ResponseDTO). */
export function urlDeRespuesta(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  return urlOnvoSegura((data as Record<string, unknown>).url)
}
