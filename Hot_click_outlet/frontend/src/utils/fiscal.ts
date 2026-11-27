/** Base fiscal: situación del negocio ante Hacienda y comisión efectiva (el servidor siempre decide el cobro). */

export type SituacionFiscal = 'INSCRITO' | 'REGIMEN_SIMPLIFICADO' | 'NO_INSCRITO'

export const SITUACIONES: ReadonlyArray<{ id: SituacionFiscal; etiqueta: string; detalle: string }> = [
  { id: 'INSCRITO', etiqueta: 'Sí, estoy inscrito', detalle: 'Facturo con mi inscripción ante Hacienda.' },
  { id: 'REGIMEN_SIMPLIFICADO', etiqueta: 'Régimen Simplificado', detalle: 'Estoy inscrito en el Régimen de Tributación Simplificada.' },
  { id: 'NO_INSCRITO', etiqueta: 'No, todavía no', detalle: 'Pagás un extra de comisión hasta inscribirte.' },
]

export type EstadoFiscal = {
  situacionFiscal: SituacionFiscal | null
  comisionPlanPct: number
  comisionExtraPct: number
  comisionEfectivaPct: number
  diasEnviarFactura: number
}

export function esSituacion(valor: unknown): valor is SituacionFiscal {
  return valor === 'INSCRITO' || valor === 'REGIMEN_SIMPLIFICADO' || valor === 'NO_INSCRITO'
}

/** Cédula de Costa Rica: solo dígitos, con guiones o espacios de formato. Devuelve los dígitos o null. */
export function normalizarCedula(valor: string): string | null {
  const t = valor.trim()
  if (!/^[0-9][0-9 -]*$/.test(t)) return null
  const digitos = t.replace(/\D/g, '')
  return digitos.length >= 9 && digitos.length <= 12 ? digitos : null
}

/** 9 dígitos = física, 10 = jurídica, 11 o 12 = DIMEX. */
export function tipoCedula(digitos: string): 'FISICA' | 'JURIDICA' | 'DIMEX' | null {
  if (digitos.length === 9) return 'FISICA'
  if (digitos.length === 10) return 'JURIDICA'
  if (digitos.length === 11 || digitos.length === 12) return 'DIMEX'
  return null
}

export const MENSAJE_CEDULA = 'Cédula física de 9 dígitos, jurídica de 10 o DIMEX de 11 o 12.'

export function correoValido(valor: string): boolean {
  const t = valor.trim()
  return t.length <= 150 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(t)
}

/** 7.5 -> "7,5 %"; 23 -> "23 %". */
export function formatoPct(valor: number): string {
  const n = Number.isFinite(valor) ? valor : 0
  return `${String(Math.round(n * 100) / 100).replace('.', ',')} %`
}

function num(valor: unknown): number {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

/** Acepta la respuesta con o sin el sobre { data } del servidor. */
export function leerEstadoFiscal(raw: unknown): EstadoFiscal {
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const o = base.data && typeof base.data === 'object' ? (base.data as Record<string, unknown>) : base
  return {
    situacionFiscal: esSituacion(o.situacionFiscal) ? o.situacionFiscal : null,
    comisionPlanPct: num(o.comisionPlanPct),
    comisionExtraPct: num(o.comisionExtraPct),
    comisionEfectivaPct: num(o.comisionEfectivaPct),
    diasEnviarFactura: num(o.diasEnviarFactura) || 7,
  }
}
