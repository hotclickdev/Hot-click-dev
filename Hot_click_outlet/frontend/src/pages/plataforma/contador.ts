import { formatPrice } from '@/utils/format'

/** Lógica pura del Contador IA (formato y etiquetas). Sin cálculos fiscales: esos los hace el servidor. */

export const AVISO_LEGAL = 'La IA ayuda y prepara; la responsabilidad legal y la presentación son del dueño.'
export const VERIFICAR = 'Verificar con contador'

/** Monto en colones; null o vacío se muestra como una raya (sin dato, nunca un cero inventado). */
export function colones(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return formatPrice(valor)
}

/** Ancho de una barra de progreso, de 0 a 100. */
export function anchoBarra(pct: number | null | undefined): number {
  if (pct == null || Number.isNaN(pct)) return 0
  return Math.max(0, Math.min(100, pct))
}

export function tonoConfianza(confianza: string): 'ok' | 'azul' | 'alerta' {
  if (confianza === 'Seguro') return 'ok'
  if (confianza === 'Verificar') return 'azul'
  return 'alerta'
}

export function cuentaRegresiva(dias: number): string {
  if (dias <= 0) return 'Vence hoy'
  if (dias === 1) return 'Vence mañana'
  return `Faltan ${dias} días`
}

/** Parámetros editables: etiqueta, ayuda y tipo de control. Todos llevan la etiqueta «Verificar con contador». */
export type CampoParametro = { clave: string; etiqueta: string; ayuda: string; opciones?: string[] }

export const CAMPOS_PARAMETROS: CampoParametro[] = [
  { clave: 'RTS_ACTIVIDAD', etiqueta: 'Actividad del RTS', ayuda: 'Actividad con la que se calcula la cuota.', opciones: ['4719.9', '4741.0'] },
  { clave: 'RTS_FACTOR_IVA_4719_9', etiqueta: 'Factor de IVA, actividad 4719.9', ayuda: 'Número entre 0 y 1 (Decreto 25514-H). Vacío: no se calcula.' },
  { clave: 'RTS_FACTOR_RENTA_4719_9', etiqueta: 'Factor de renta, actividad 4719.9', ayuda: 'Número entre 0 y 1. Vacío: no se calcula.' },
  { clave: 'RTS_FACTOR_IVA_4741_0', etiqueta: 'Factor de IVA, actividad 4741.0', ayuda: 'Número entre 0 y 1. Vacío: no se calcula.' },
  { clave: 'RTS_FACTOR_RENTA_4741_0', etiqueta: 'Factor de renta, actividad 4741.0', ayuda: 'Número entre 0 y 1. Vacío: no se calcula.' },
  { clave: 'RTS_FORMULARIO', etiqueta: 'Formulario de la declaración del RTS', ayuda: 'Sin confirmar: D-105, 104, 105 o 153.' },
  { clave: 'RTS_DIA_LIMITE', etiqueta: 'Día límite de la declaración trimestral', ayuda: 'Primeros días de enero, abril, julio y octubre.' },
  { clave: 'TIPO_PERSONA', etiqueta: 'Tipo de persona', ayuda: 'Define la tabla de renta.', opciones: ['JURIDICA', 'FISICA'] },
  { clave: 'PERIODO_FISCAL_RENTA', etiqueta: 'Período fiscal de renta', ayuda: 'OCT_SEP declara en diciembre; ENE_DIC el 15 de marzo.', opciones: ['OCT_SEP', 'ENE_DIC'] },
  { clave: 'RENTA_UMBRAL', etiqueta: 'Umbral de ingresos brutos (₡)', ayuda: 'Hasta este monto aplican las tarifas reducidas.' },
  { clave: 'RENTA_TASA_SOBRE_UMBRAL', etiqueta: 'Tarifa sobre el umbral (%)', ayuda: 'Persona jurídica por encima del umbral.' },
  { clave: 'RENTA_TRAMOS_JURIDICA', etiqueta: 'Tramos de renta, persona jurídica', ayuda: 'Formato hasta:tasa separados por punto y coma; el último sin tope.' },
  { clave: 'RENTA_TRAMOS_FISICA', etiqueta: 'Tramos de renta, persona física', ayuda: 'Formato hasta:tasa separados por punto y coma; el último sin tope.' },
  { clave: 'PAGOS_PARCIALES', etiqueta: 'Fechas de pagos parciales', ayuda: 'Día-mes separados por coma (tradicional).' },
  { clave: 'PAGOS_PARCIALES_PCT', etiqueta: 'Porcentaje de cada pago parcial', ayuda: 'Por defecto 25.' },
  { clave: 'FORMULARIO_INFORMATIVA', etiqueta: 'Formulario de la declaración informativa', ayuda: 'Sin confirmar.' },
  { clave: 'DIA_INFORMATIVA', etiqueta: 'Día de la declaración informativa', ayuda: 'Por defecto el 25.' },
  { clave: 'DIA_RETENCIONES', etiqueta: 'Día de las retenciones', ayuda: 'Por defecto el 15 (tradicional).' },
]

/** Solo las claves que cambiaron, para no reescribir lo que el dueño no tocó. */
export function cambios(original: Record<string, string>, actual: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [clave, valor] of Object.entries(actual)) {
    if ((original[clave] ?? '') !== valor) out[clave] = valor
  }
  return out
}

/** Texto de un borrador para copiar: una línea por monto, con su nota de casilla. */
export function textoBorrador(cajas: Array<{ etiqueta: string; valor: number | null }>): string {
  return cajas.map((c) => `${c.etiqueta}: ${c.valor == null ? 'sin dato' : String(c.valor)}`).join('\n')
}
