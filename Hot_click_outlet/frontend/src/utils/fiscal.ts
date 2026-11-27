/** Base fiscal: situación del negocio ante Hacienda y comisión efectiva (el servidor siempre decide el cobro). */

export type SituacionFiscal = 'INSCRITO' | 'REGIMEN_SIMPLIFICADO' | 'NO_INSCRITO'

export const SITUACIONES: ReadonlyArray<{ id: SituacionFiscal; etiqueta: string; detalle: string }> = [
  { id: 'INSCRITO', etiqueta: 'Sí, estoy inscrito', detalle: 'Facturo con mi inscripción ante Hacienda.' },
  { id: 'REGIMEN_SIMPLIFICADO', etiqueta: 'Régimen Simplificado', detalle: 'Estoy inscrito en el Régimen de Tributación Simplificada.' },
  { id: 'NO_INSCRITO', etiqueta: 'No, todavía no', detalle: 'Pagás un extra de comisión hasta inscribirte.' },
]

export type VerifAuto = 'COINCIDE' | 'NO_COINCIDE' | 'NO_ENCONTRADO' | 'ERROR_CONSULTA'

export type EstadoFiscal = {
  situacionFiscal: SituacionFiscal | null
  /** Un ADMIN confirmó la inscripción: recién ahí se quita el extra. */
  verificado: boolean
  /** Declaró una inscripción con datos y falta que un ADMIN la confirme. */
  pendiente: boolean
  tieneDatos: boolean
  /** Resultado de comparar con Hacienda; el vendedor solo ve el estado, nunca lo que respondió Hacienda. */
  verifAuto: VerifAuto | null
  comisionPlanPct: number
  comisionExtraPct: number
  comisionEfectivaPct: number
  diasEnviarFactura: number
}

export function esVerifAuto(valor: unknown): valor is VerifAuto {
  return valor === 'COINCIDE' || valor === 'NO_COINCIDE' || valor === 'NO_ENCONTRADO' || valor === 'ERROR_CONSULTA'
}

export const MENSAJE_SIN_DECLARAR = 'Sin declarar: se cobra el extra hasta que declares.'

/** Mensaje al vendedor con una inscripción pendiente de verificar, según lo que dijo la comprobación automática. */
export function mensajePendiente(verifAuto: VerifAuto | null): string {
  if (verifAuto === 'COINCIDE') return 'Recibimos tus datos y coinciden con Hacienda; HotClick los confirma pronto. El extra se quita cuando lo confirme.'
  if (verifAuto === 'NO_COINCIDE' || verifAuto === 'NO_ENCONTRADO') {
    return 'Tus datos no coinciden con Hacienda: revisá cédula o nombre. Podés volver a enviarlos.'
  }
  return 'Pendiente de verificación: el extra se quita cuando HotClick lo confirme.'
}

const CAMPOS: Record<string, string> = {
  cedula: 'cédula', situacion: 'situación', regimen: 'régimen', nombre: 'nombre', actividad: 'actividad',
}

/** Sello para el ADMIN: coincide, no coincide (qué campo) o no se pudo consultar. */
export function selloVerifAuto(verifAuto: VerifAuto | null, diferencias: unknown): { texto: string; tono: 'ok' | 'alerta' | 'neutro' } {
  if (verifAuto === 'COINCIDE') return { texto: 'Coincide con Hacienda', tono: 'ok' }
  if (verifAuto === 'NO_COINCIDE' || verifAuto === 'NO_ENCONTRADO') {
    const lista = Array.isArray(diferencias) ? diferencias.map((d) => CAMPOS[String(d)] ?? String(d)) : []
    return { texto: `No coincide${lista.length ? `: ${lista.join(', ')}` : ''}`, tono: 'alerta' }
  }
  return { texto: 'No se pudo consultar a Hacienda', tono: 'neutro' }
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
    verificado: o.fiscalVerificado === true,
    pendiente: o.pendienteVerificacion === true,
    tieneDatos: o.tieneDatosFiscales === true,
    verifAuto: esVerifAuto(o.verifAuto) ? o.verifAuto : null,
    comisionPlanPct: num(o.comisionPlanPct),
    comisionExtraPct: num(o.comisionExtraPct),
    comisionEfectivaPct: num(o.comisionEfectivaPct),
    diasEnviarFactura: num(o.diasEnviarFactura) || 7,
  }
}
