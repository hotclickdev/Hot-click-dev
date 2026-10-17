import { useEffect, useSyncExternalStore } from 'react'

/**
 * Tarifas de envío en colones por método. La única tabla vive en el servidor
 * (`OrderPricingService.calcularCostoEnvio`, expuesta en `GET /api/public/envio/tarifas`):
 * el frontend no guarda montos propios (QA-COM-006).
 */
export type TarifasEnvio = Readonly<Record<string, number>>

const SIN_TARIFAS: TarifasEnvio = Object.freeze({})
let tarifas: TarifasEnvio = SIN_TARIFAS
let pedido: Promise<void> | null = null
const oyentes = new Set<() => void>()

/** Costo de un método; 0 mientras la tabla no llegó o si el método no tiene tarifa (retiro). */
export function costoDeEnvio(t: TarifasEnvio, metodo: string | undefined | null): number {
  const v = metodo ? t[metodo] : undefined
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

export function normalizarTarifas(data: unknown): TarifasEnvio {
  if (!data || typeof data !== 'object') return SIN_TARIFAS
  const r: Record<string, number> = {}
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) r[k] = v
  }
  return Object.freeze(r)
}

function publicar(t: TarifasEnvio) {
  tarifas = t
  oyentes.forEach((o) => o())
}

/** Pide la tabla una vez por carga de página; si falla, se reintenta en el próximo uso. */
export function cargarTarifasEnvio(): Promise<void> {
  if (pedido) return pedido
  pedido = fetch('/api/public/envio/tarifas', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((data) => publicar(normalizarTarifas(data)))
    .catch(() => { pedido = null })
  return pedido
}

/** Solo para tests. */
export function fijarTarifasEnvio(t: TarifasEnvio) {
  publicar(normalizarTarifas(t))
}

export function useTarifasEnvio(): TarifasEnvio {
  const actual = useSyncExternalStore(
    (o) => { oyentes.add(o); return () => { oyentes.delete(o) } },
    () => tarifas,
    () => tarifas,
  )
  useEffect(() => { void cargarTarifasEnvio() }, [])
  return actual
}
