import {
  mapMetodoCobroApi,
  metodosCobroService,
  type MetodoCobroApi,
} from '@/services/metodosCobroService'

export type TipoMetodoCobro = 'sinpe' | 'iban' | 'tarjeta'

export type MetodoCobro = {
  id: string
  tipo: TipoMetodoCobro
  nombre: string
  mascara: string
  nota: string
  predeterminado?: boolean
}

/** Demo solo si falla la carga API (offline / sin sesión). */
export const METODOS_COBRO_DEMO: readonly MetodoCobro[] = [
  {
    id: 'demo-sinpe',
    tipo: 'sinpe',
    nombre: 'SINPE Móvil',
    mascara: '8888-0000',
    nota: 'Ingreso al instante en Costa Rica',
    predeterminado: true,
  },
  {
    id: 'demo-iban',
    tipo: 'iban',
    nombre: 'Cuenta IBAN',
    mascara: 'CR21 0000 **** 4521',
    nota: 'Transferencia a tu banco',
  },
  {
    id: 'demo-tarjeta',
    tipo: 'tarjeta',
    nombre: 'Tarjeta de crédito',
    mascara: 'Visa •••• 4412',
    nota: 'Liquidación de cobros con tarjeta',
  },
]

/** @deprecated Usar METODOS_COBRO_DEMO o cargarMetodosCobro() */
export const METODOS_COBRO = METODOS_COBRO_DEMO

export const TIPOS_METODO_COBRO: ReadonlyArray<{
  tipo: TipoMetodoCobro
  titulo: string
  ayuda: string
}> = [
  { tipo: 'sinpe', titulo: 'SINPE Móvil', ayuda: 'Número de 8 dígitos en Costa Rica' },
  { tipo: 'iban', titulo: 'Cuenta IBAN', ayuda: 'Cuenta bancaria CR…' },
  { tipo: 'tarjeta', titulo: 'Tarjeta', ayuda: 'Últimos 4 dígitos para referencia' },
]

export function mascaraDesdeDato(tipo: TipoMetodoCobro, dato: string): string {
  const limpio = dato.replace(/\s+/g, '')
  if (tipo === 'sinpe') {
    if (limpio.length < 4) return limpio || '••••'
    return `${limpio.slice(0, 4)}-${limpio.slice(4, 8) || '••••'}`
  }
  if (tipo === 'iban') {
    if (limpio.length < 8) return limpio.toUpperCase()
    return `${limpio.slice(0, 4).toUpperCase()} **** ${limpio.slice(-4)}`
  }
  const digitos = limpio.replace(/\D/g, '')
  return `•••• ${digitos.slice(-4) || '0000'}`
}

export function notaPorTipo(tipo: TipoMetodoCobro): string {
  if (tipo === 'sinpe') return 'Ingreso al instante en Costa Rica'
  if (tipo === 'iban') return 'Transferencia a tu banco'
  return 'Liquidación de cobros con tarjeta'
}

export function nombrePorTipo(tipo: TipoMetodoCobro): string {
  if (tipo === 'sinpe') return 'SINPE Móvil'
  if (tipo === 'iban') return 'Cuenta IBAN'
  return 'Tarjeta'
}

export function validarDatoMetodo(tipo: TipoMetodoCobro, dato: string): string | null {
  const limpio = dato.trim()
  if (!limpio) return 'Completá el dato de la cuenta.'
  if (tipo === 'sinpe' && limpio.replace(/\D/g, '').length < 8) {
    return 'El SINPE debe tener 8 dígitos.'
  }
  if (tipo === 'iban' && limpio.replace(/\s/g, '').length < 10) {
    return 'Indicá un IBAN válido (mínimo 10 caracteres).'
  }
  if (tipo === 'tarjeta' && limpio.replace(/\D/g, '').length < 4) {
    return 'Indicá al menos los últimos 4 dígitos.'
  }
  return null
}

function esMetodoApi(v: unknown): v is MetodoCobroApi {
  if (!v || typeof v !== 'object') return false
  const m = v as Record<string, unknown>
  return (
    typeof m.id === 'number'
    && (m.tipo === 'sinpe' || m.tipo === 'iban' || m.tipo === 'tarjeta')
    && typeof m.nombre === 'string'
    && typeof m.mascara === 'string'
    && typeof m.nota === 'string'
  )
}

/**
 * Lista cuentas de cobro del negocio vía API.
 * Fallback a METODOS_COBRO_DEMO solo si la petición falla (prototipo / offline).
 */
export async function cargarMetodosCobro(): Promise<MetodoCobro[]> {
  try {
    const { data } = await metodosCobroService.listar()
    if (!Array.isArray(data)) return []
    return data.filter(esMetodoApi).map(mapMetodoCobroApi)
  } catch {
    // Fallback demo: no bloquear UI del prototipo si API/auth no está disponible.
    return [...METODOS_COBRO_DEMO]
  }
}

export async function crearMetodoCobro(tipo: TipoMetodoCobro, dato: string): Promise<MetodoCobro> {
  const { data } = await metodosCobroService.crear(tipo, dato)
  if (!esMetodoApi(data)) throw new Error('Respuesta inválida al crear método de cobro')
  return mapMetodoCobroApi(data)
}

export async function marcarMetodoPredeterminado(id: string): Promise<MetodoCobro> {
  const { data } = await metodosCobroService.marcarPredeterminado(id)
  if (!esMetodoApi(data)) throw new Error('Respuesta inválida al marcar predeterminado')
  return mapMetodoCobroApi(data)
}

/** @deprecated Preferí cargarMetodosCobro() (API). */
export function leerMetodosCobro(): MetodoCobro[] {
  return [...METODOS_COBRO_DEMO]
}
