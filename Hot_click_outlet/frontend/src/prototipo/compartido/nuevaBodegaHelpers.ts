import { parseCountry } from 'react-international-phone'
import { PHONE_FIELD_COUNTRIES } from '@/components/ui/phoneFieldCountries'
import { mapearErrorBackend } from '@/services/errorMapper'
import { PREFIJO_CR } from '@/utils/telefono'
import {
  MENSAJE_UBICACION_INCOMPLETA,
  UBICACION_INICIAL,
  payloadUbicacion,
  ubicacionCompleta,
  type UbicacionDespacho,
} from './ubicacionDespachoHelpers'

/** Mensaje genérico cuando la API no da un motivo que se pueda mostrar. */
export const ERROR_GUARDAR_BODEGA = 'No se pudo guardar la bodega.'
export const ERROR_LIMITE_BODEGAS = 'Llegaste al límite de bodegas de tu plan.'
export const ERROR_DATOS_BODEGA = 'Revisá los datos de la bodega e intentá de nuevo.'
export const TELEFONO_OBLIGATORIO = 'El teléfono es obligatorio.'
/** Mismo texto que `checkout.phoneInvalid` (es.json). */
export const TELEFONO_INVALIDO = 'Ingresá un número válido (8 dígitos)'
export const MENSAJE_NOMBRE_OBLIGATORIO = 'El nombre es obligatorio.'

const CODIGO_CR = PREFIJO_CR.slice(1)
const DIGITOS_CR = 8
const MIN_DIGITOS_INTERNACIONAL = 8
const MAX_DIGITOS_E164 = 15

/** Códigos de país que ofrece PhoneField (sin `+`). */
const CODIGOS_PAIS = new Set(PHONE_FIELD_COUNTRIES.map((c) => parseCountry(c).dialCode))

/** QA-B01-1: si borran el `+506` y escriben el número, los primeros dígitos no son un código de país real. */
function tieneCodigoPaisConocido(digitos: string): boolean {
  for (let largo = 1; largo <= 3; largo++) {
    if (CODIGOS_PAIS.has(digitos.slice(0, largo))) return true
  }
  return false
}

/**
 * Validaciones de `POST /api/bodegas` (BodegaController) cuyo texto se puede mostrar tal cual.
 * Cualquier otro 400 puede traer el mensaje crudo de una excepción y no se muestra.
 */
const VALIDACIONES_API = new Set([
  'El nombre es obligatorio',
  'La dirección es obligatoria',
  'El teléfono es obligatorio',
  TELEFONO_INVALIDO,
  'La ubicación del mapa no es válida',
])

/** Valor de PhoneField (`+50688881234`, `+506 8888-1234`…) → `+` y solo dígitos; vacío si no hay número. */
export function normalizarTelefonoBodega(valor: string | null | undefined): string {
  const digitos = (valor ?? '').replace(/\D/g, '')
  return digitos ? `+${digitos}` : ''
}

/** null = válido. Costa Rica (+506): 8 dígitos locales; otro código de país (de los de PhoneField): largo E.164. */
export function validarTelefonoBodega(valor: string | null | undefined): string | null {
  const normal = normalizarTelefonoBodega(valor)
  if (!normal || normal === PREFIJO_CR) return TELEFONO_OBLIGATORIO
  const digitos = normal.slice(1)
  if (digitos.startsWith(CODIGO_CR)) {
    return digitos.length - CODIGO_CR.length === DIGITOS_CR ? null : TELEFONO_INVALIDO
  }
  if (digitos.length < MIN_DIGITOS_INTERNACIONAL || digitos.length > MAX_DIGITOS_E164) return TELEFONO_INVALIDO
  if (!tieneCodigoPaisConocido(digitos)) return TELEFONO_INVALIDO
  return null
}

function respuesta(err: unknown): { status?: number; data?: { error?: unknown } } | undefined {
  if (!err || typeof err !== 'object') return undefined
  return (err as { response?: { status?: number; data?: { error?: unknown } } }).response
}

/**
 * Texto para el usuario cuando falla `POST /api/bodegas`:
 * - 403 por límite de plan (`LIMIT_REACHED`): el mensaje del backend
 *   (ej. «Has alcanzado el límite de bodegas de tu plan (1/1).»).
 * - 400 de validación conocida: el mensaje del backend; otro 400: pedir que revise los datos (sin texto crudo).
 * - Resto (red, 5xx, 401, otro 403): el genérico.
 */
export function mensajeErrorGuardarBodega(err: unknown): string {
  const res = respuesta(err)
  if (res?.status === 403 && res.data?.error === 'LIMIT_REACHED') {
    return mapearErrorBackend(err, ERROR_LIMITE_BODEGAS).mensaje.trim() || ERROR_LIMITE_BODEGAS
  }
  if (res?.status === 400) {
    const limpio = mapearErrorBackend(err, '').mensaje.trim().replace(/\.$/, '')
    return VALIDACIONES_API.has(limpio) ? `${limpio}.` : ERROR_DATOS_BODEGA
  }
  return ERROR_GUARDAR_BODEGA
}

export type FormBodega = {
  nombre: string
  telefono: string
  encargado: string
  ubicacion: UbicacionDespacho
}

export type PasoBodega = 'nombre' | 'ubicacion' | 'telefono' | 'encargado'

export const FORM_BODEGA_INICIAL: FormBodega = {
  nombre: '',
  telefono: '',
  encargado: '',
  ubicacion: UBICACION_INICIAL,
}

/** Primer error que bloquea el paso; null si se puede avanzar. */
export function validarPasoBodega(paso: PasoBodega | undefined, form: FormBodega): string | null {
  if (paso === 'nombre' && !form.nombre.trim()) return MENSAJE_NOMBRE_OBLIGATORIO
  if (paso === 'ubicacion' && !ubicacionCompleta(form.ubicacion)) return MENSAJE_UBICACION_INCOMPLETA
  if (paso === 'telefono') return validarTelefonoBodega(form.telefono)
  return null
}

/** Cuerpo de `POST /api/bodegas`: nombre, ubicación de despacho y teléfono normalizado. */
export function payloadCrearBodega(form: FormBodega): Record<string, string> {
  const encargado = form.encargado.trim()
  return {
    nombreBodega: form.nombre.trim(),
    telefono: normalizarTelefonoBodega(form.telefono),
    ...payloadUbicacion(form.ubicacion),
    ...(encargado ? { encargadoNombre: encargado } : {}),
  }
}
