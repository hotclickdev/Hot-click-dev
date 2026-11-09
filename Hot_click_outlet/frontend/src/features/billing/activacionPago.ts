/** Tope del sondeo. El backend permite 6 reconciliaciones por minuto y empresa. */
export const INTENTOS_RECONCILIAR = 4

/** Pausa entre lecturas a ONVO. Cabe en la ventana de 60 s sin llegar al 429. */
export const ESPERA_RECONCILIAR_MS = 3000

export type EstadoActivacion = 'confirmando' | 'pendiente'

export function statusReconciliacion(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const status = (data as Record<string, unknown>).status
  return typeof status === 'string' ? status : null
}

function es429(err: unknown): boolean {
  if (!err || typeof err !== 'object' || !('response' in err)) return false
  return (err as { response?: { status?: number } }).response?.status === 429
}

/**
 * Después del SDK se lee ONVO (GET vía el backend). Solo `activado` es éxito.
 * Un 429 corta el sondeo: seguir pegándole al tope no confirma el pago.
 */
export async function sondearActivacion(
  reconciliar: () => Promise<{ data: unknown }>,
  opciones?: {
    intentos?: number
    esperaMs?: number
    esperar?: (ms: number) => Promise<void>
  },
): Promise<'activo' | 'pendiente'> {
  const intentos = opciones?.intentos ?? INTENTOS_RECONCILIAR
  const esperaMs = opciones?.esperaMs ?? ESPERA_RECONCILIAR_MS
  const esperar = opciones?.esperar ?? ((ms: number) => new Promise((r) => { setTimeout(r, ms) }))
  for (let i = 0; i < intentos; i++) {
    try {
      const { data } = await reconciliar()
      if (statusReconciliacion(data) === 'activado') return 'activo'
    } catch (err) {
      if (es429(err)) return 'pendiente'
    }
    if (i < intentos - 1) await esperar(esperaMs)
  }
  return 'pendiente'
}

/**
 * El embed no activa el plan. Se reconcilia y, solo si ONVO confirmó, se sigue.
 * Si la confirmación local falla, queda pendiente: no se muestra como activo.
 */
export async function trasPagoEmbed(
  reconciliar: () => Promise<{ data: unknown }>,
  alActivar: () => Promise<void>,
  opciones?: {
    intentos?: number
    esperaMs?: number
    esperar?: (ms: number) => Promise<void>
  },
): Promise<'activo' | 'pendiente'> {
  const estado = await sondearActivacion(reconciliar, opciones)
  if (estado !== 'activo') return 'pendiente'
  try {
    await alActivar()
  } catch {
    return 'pendiente'
  }
  return 'activo'
}
