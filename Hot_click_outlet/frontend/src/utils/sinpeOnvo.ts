/**
 * SINPE Móvil por ONVO (mobile_number). Misma regla que el backend (`OnvoService`):
 * enum identificationType 0 física nacional, 1 residente, 2 estatal, 3 jurídica, 4 autónoma,
 * 5 diplomático, 9 extranjero (distinto del enum 1-4 de bankDeposit), con el formato exacto de cada tipo.
 */
export const TIPOS_IDENTIFICACION_SINPE = [
  { valor: 0, clave: 'pos.pago.sinpeTipoFisica' },
  { valor: 1, clave: 'pos.pago.sinpeTipoResidente' },
  { valor: 2, clave: 'pos.pago.sinpeTipoEstatal' },
  { valor: 3, clave: 'pos.pago.sinpeTipoJuridica' },
  { valor: 4, clave: 'pos.pago.sinpeTipoAutonoma' },
  { valor: 5, clave: 'pos.pago.sinpeTipoDiplomatico' },
  { valor: 9, clave: 'pos.pago.sinpeTipoExtranjero' },
] as const

/** Tipo con el que arranca el formulario: cuenta empresa → 3 (jurídica), si no → 0 (física nacional). */
export function tipoSinpeInicial(esEmpresa: boolean): number {
  return esEmpresa ? 3 : 0
}

const FORMATO_POR_TIPO: Readonly<Record<number, RegExp>> = {
  0: /^0\d-\d{4}-\d{4}$/,
  1: /^1\d{11}$/,
  2: /^2-\d{3}-\d{6}$/,
  3: /^3-\d{3}-\d{6}$/,
  4: /^4-000-\d{6}$/,
  5: /^5\d{11}$/,
  9: /^9\d{11}$/,
}

export function tipoIdentificacionSinpeValido(tipo: number | null | undefined): boolean {
  return tipo != null && Object.prototype.hasOwnProperty.call(FORMATO_POR_TIPO, tipo)
}

export function identificacionSinpeValida(valor: string | null | undefined, tipo: number | null | undefined): boolean {
  if (valor == null || !tipoIdentificacionSinpeValido(tipo)) return false
  const v = valor.trim()
  return v.length <= 20 && FORMATO_POR_TIPO[tipo as number].test(v)
}

const PREFIJO_CR = '+506'

/** SINPE del comprador a E.164 (`+506` + 8 dígitos); null si no queda en 8 dígitos. */
export function normalizarNumeroSinpe(telefono: string | null | undefined): string | null {
  if (telefono == null) return null
  let v = telefono.replace(/[\s-]/g, '')
  if (v.length > 20) return null
  if (v.startsWith(PREFIJO_CR)) v = v.slice(PREFIJO_CR.length)
  else if (v.length === 11 && v.startsWith('506')) v = v.slice(3)
  return /^\d{8}$/.test(v) ? PREFIJO_CR + v : null
}

/** Datos SINPE ONVO listos para el body, o null si algo es inválido (fail-closed: no se llama). */
export function datosSinpeOnvo(identificacion: string, tipo: number, telefono: string):
  { identificacion: string; tipoIdentificacion: number; telefono: string } | null {
  const numero = normalizarNumeroSinpe(telefono)
  if (!identificacionSinpeValida(identificacion, tipo) || !numero) return null
  return { identificacion: identificacion.trim(), tipoIdentificacion: tipo, telefono: numero }
}
