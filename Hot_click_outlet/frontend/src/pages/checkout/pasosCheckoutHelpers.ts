import { useNavigate } from 'react-router-dom'
import { PREFIJO_CR, digitosTelefonoCR, formatTelefonoCR } from '@/utils/telefono'

/** Dígitos locales de un teléfono guardado como `+506XXXXXXXX`. */
export function digitosTelefono(valor: string): string {
  return digitosTelefonoCR(valor)
}

/** `8888-1234` para mostrar (formato único, `utils/telefono`); el valor guardado conserva el prefijo del país. */
export function formatoTelefonoCampo(valor: string): string {
  return formatTelefonoCR(digitosTelefonoCR(valor))
}

export function telefonoDesdeCampo(texto: string): string {
  const d = digitosTelefono(texto)
  return d ? `${PREFIJO_CR}${d}` : ''
}

/** Opciones al cambiar de paso: `reemplazar` no agrega una entrada al historial. */
export type OpcionesPaso = { reemplazar?: boolean }

/** Atrás del checkout móvil: paso anterior o, desde el primero, el carrito. */
export function useVolver(rutaCarrito: string, paso: number, irAPaso: (paso: number, opciones?: OpcionesPaso) => void) {
  const navigate = useNavigate()
  return () => {
    if (paso > 1) irAPaso(paso - 1, { reemplazar: true })
    else navigate(rutaCarrito)
  }
}

export const PASO_MAXIMO = 3

/** `?paso=` del checkout móvil (decisión R3): 1, 2 o 3; cualquier otro valor es el 1. */
export function pasoDesdeQuery(valor: string | null): number {
  const n = Number(valor)
  return Number.isInteger(n) && n >= 1 && n <= PASO_MAXIMO ? n : 1
}

export type DatosPasos = {
  conSesion: boolean
  necesitaDireccion: boolean
  requiereEntrega: boolean
  telefono: string
  guestEmail: string
  guestPhone: string
  nombre: string
  direccion: string
  provincia: string
  canton: string
}

export type ValidadoresPasos = {
  telefono: (v: string) => string
  correo: (v: string) => string
  direccion: (v: string) => string
}

/**
 * Paso más alto al que se puede llegar con los datos actuales, sin mostrar errores:
 * guarda contra `?paso=3` en un enlace o al recargar (se vuelve al primer paso incompleto).
 */
export function pasoMaximoCheckout(d: DatosPasos, v: ValidadoresPasos): number {
  const datosOk = d.conSesion
    ? !d.necesitaDireccion || !v.telefono(d.telefono)
    : !v.correo(d.guestEmail) && (!d.requiereEntrega || !v.telefono(d.guestPhone)) && Boolean(d.nombre.trim())
  if (!datosOk) return 1
  const entregaOk = !d.necesitaDireccion || (!v.direccion(d.direccion) && Boolean(d.provincia) && Boolean(d.canton))
  return entregaOk ? 3 : 2
}
