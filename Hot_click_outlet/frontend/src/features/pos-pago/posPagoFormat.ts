import { formatMiles } from '@/utils/format'
import { formatTelefonoCR } from '@/utils/telefono'
import type { MetodoQr, QrPagoInfo } from './posPagoTypes'

export function formatColones(monto: number | undefined | null): string {
  return formatMiles(Math.max(0, monto ?? 0))
}

export function nombreItem(item: { nombre?: string; nombreProducto?: string }): string {
  return item.nombre ?? item.nombreProducto ?? 'Producto'
}

export function inicialesProducto(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  if (palabras.length === 0) return '?'
  return palabras.map((palabra) => palabra.charAt(0).toUpperCase()).join('')
}

export function tituloYCodigo(nombre: string): { titulo: string; codigo: string | null } {
  const match = nombre.match(/^(.*)\s*\(([^)]+)\)\s*$/)
  if (!match) return { titulo: nombre, codigo: null }
  return { titulo: match[1].trim(), codigo: match[2].trim() }
}

/** Número SINPE sin el prefijo del país (`+506 7019-6686` -> `7019-6686`), con el formato único `8888-1234`. */
export function sinpeNumeroVisible(numero: string | undefined | null): string {
  return formatTelefonoCR(numero)
}

const METODOS_QR: readonly MetodoQr[] = ['SINPE', 'TARJETA']

function esMetodoQr(valor: unknown): valor is MetodoQr {
  return typeof valor === 'string' && (METODOS_QR as readonly string[]).includes(valor)
}

/**
 * Métodos que la caja habilitó para este cobro, sin repetir. Las sesiones
 * anteriores a la elección del cliente solo traen `metodoPago`.
 */
export function metodosDisponibles(info: Pick<QrPagoInfo, 'metodoPago' | 'metodosHabilitados'> | null | undefined): MetodoQr[] {
  const lista: MetodoQr[] = []
  for (const m of info?.metodosHabilitados ?? []) {
    if (esMetodoQr(m) && !lista.includes(m)) lista.push(m)
  }
  const principal = info?.metodoPago
  if (lista.length === 0 && esMetodoQr(principal)) lista.push(principal)
  return lista
}

/** Método marcado al abrir: el elegido por el cliente, o el principal de la caja si está habilitado. */
export function metodoActivo(disponibles: MetodoQr[], principal: string | undefined, elegido: MetodoQr | null): MetodoQr | null {
  if (elegido && disponibles.includes(elegido)) return elegido
  if (esMetodoQr(principal) && disponibles.includes(principal)) return principal
  return disponibles[0] ?? null
}

/** Fecha del comprobante (`2026-10-02T15:30` del servidor, hora de Costa Rica) como `02/10/2026 15:30`. */
export function fechaComprobante(iso: string | null | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return ''
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
}
