/** Abreviaturas de mes que usa el Figma en español de Costa Rica («24 set. 2026»). */
const MESES_CORTOS_ES = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'set.', 'oct.', 'nov.', 'dic.']

/** Plazo de Correos que promete el correo de guía: «Llegan en 2 a 4 días hábiles». */
export const DIAS_HABILES_ENTREGA_MIN = 2
export const DIAS_HABILES_ENTREGA_MAX = 4

const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/

export type PartesFecha = { dia: number; mes: string; anio: number }

/** `LocalDate` («2026-09-26») se lee en hora local: `new Date()` lo tomaría como UTC y restaría un día en CR. */
export function aFecha(valor?: string | null): Date | null {
  if (!valor) return null
  const soloFecha = SOLO_FECHA.exec(valor)
  const fecha = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

function mesCorto(fecha: Date, idioma: string): string {
  if (idioma.startsWith('es')) return MESES_CORTOS_ES[fecha.getMonth()]
  return new Intl.DateTimeFormat(idioma, { month: 'short' }).format(fecha)
}

export function partesFecha(fecha: Date, idioma: string): PartesFecha {
  return { dia: fecha.getDate(), mes: mesCorto(fecha, idioma), anio: fecha.getFullYear() }
}

/** «24 set. 2026». Vacío si la fecha no se puede leer. */
export function fechaCorta(valor: string | null | undefined, idioma: string): string {
  const fecha = aFecha(valor)
  if (!fecha) return ''
  const { dia, mes, anio } = partesFecha(fecha, idioma)
  return `${dia} ${mes} ${anio}`
}

export function sumarDiasHabiles(desde: Date, dias: number): Date {
  const fecha = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate())
  let restantes = dias
  while (restantes > 0) {
    fecha.setDate(fecha.getDate() + 1)
    const diaSemana = fecha.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) restantes -= 1
  }
  return fecha
}

/** Ventana de llegada estimada a partir del día en que salió el paquete. */
export function ventanaEntrega(fechaEnvio: Date): { desde: Date; hasta: Date } {
  return {
    desde: sumarDiasHabiles(fechaEnvio, DIAS_HABILES_ENTREGA_MIN),
    hasta: sumarDiasHabiles(fechaEnvio, DIAS_HABILES_ENTREGA_MAX),
  }
}
