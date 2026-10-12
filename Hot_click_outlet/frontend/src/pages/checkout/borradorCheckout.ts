/** Borrador del checkout en sessionStorage: sobrevive a «Ingresar» y a la vuelta de Tilopay. Nunca datos de pago. */
export type BorradorCheckout = {
  nombre?: string
  correo?: string
  telefonoInvitado?: string
  telefono?: string
  direccion?: string
  provincia?: string
  canton?: string
  distrito?: string
}

export const CLAVE_BORRADOR = 'hc-checkout-borrador'
const CAMPOS: Array<keyof BorradorCheckout> = ['nombre', 'correo', 'telefonoInvitado', 'telefono', 'direccion', 'provincia', 'canton', 'distrito']

export function leerBorrador(): BorradorCheckout {
  try {
    const raw = globalThis.sessionStorage?.getItem(CLAVE_BORRADOR)
    const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    const limpio: BorradorCheckout = {}
    for (const c of CAMPOS) if (typeof data[c] === 'string') limpio[c] = (data[c] as string).slice(0, 500)
    return limpio
  } catch {
    return {}
  }
}

export function guardarBorrador(b: BorradorCheckout): void {
  try {
    const limpio: BorradorCheckout = {}
    for (const c of CAMPOS) if (b[c]) limpio[c] = b[c]
    globalThis.sessionStorage?.setItem(CLAVE_BORRADOR, JSON.stringify(limpio))
  } catch { /* sin storage: el formulario sigue funcionando */ }
}

export function borrarBorrador(): void {
  try { globalThis.sessionStorage?.removeItem(CLAVE_BORRADOR) } catch { /* nada */ }
}
