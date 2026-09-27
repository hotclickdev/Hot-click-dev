import {
  MENSAJE_UBICACION_INCOMPLETA,
  UBICACION_INICIAL,
  payloadUbicacion,
  ubicacionCompleta,
  type UbicacionDespacho,
} from './ubicacionDespachoHelpers'

export type FormBodega = {
  nombre: string
  telefono: string
  encargado: string
  ubicacion: UbicacionDespacho
}

export type PasoBodega = 'nombre' | 'ubicacion' | 'encargado'

export const FORM_BODEGA_INICIAL: FormBodega = {
  nombre: '',
  telefono: '',
  encargado: '',
  ubicacion: UBICACION_INICIAL,
}

const TELEFONO_VALIDO = /^[0-9+\-\s()]{7,20}$/

export const MENSAJE_NOMBRE_OBLIGATORIO = 'El nombre es obligatorio.'
export const MENSAJE_TELEFONO_OBLIGATORIO = 'El teléfono es obligatorio.'
export const MENSAJE_TELEFONO_INVALIDO = 'Escribí un teléfono válido (7 a 20 dígitos).'

export function errorTelefono(telefono: string): string | null {
  const limpio = telefono.trim()
  if (!limpio) return MENSAJE_TELEFONO_OBLIGATORIO
  return TELEFONO_VALIDO.test(limpio) ? null : MENSAJE_TELEFONO_INVALIDO
}

/** Primer error que bloquea el paso; null si se puede avanzar. */
export function validarPasoBodega(paso: PasoBodega | undefined, form: FormBodega): string | null {
  if (paso === 'nombre') {
    if (!form.nombre.trim()) return MENSAJE_NOMBRE_OBLIGATORIO
    return errorTelefono(form.telefono)
  }
  if (paso === 'ubicacion' && !ubicacionCompleta(form.ubicacion)) return MENSAJE_UBICACION_INCOMPLETA
  return null
}

/** Cuerpo de `POST /api/bodegas`: nombre, dirección y teléfono son obligatorios en el backend. */
export function payloadCrearBodega(form: FormBodega): Record<string, string> {
  const encargado = form.encargado.trim()
  return {
    nombreBodega: form.nombre.trim(),
    telefono: form.telefono.trim(),
    ...payloadUbicacion(form.ubicacion),
    ...(encargado ? { encargadoNombre: encargado } : {}),
  }
}
