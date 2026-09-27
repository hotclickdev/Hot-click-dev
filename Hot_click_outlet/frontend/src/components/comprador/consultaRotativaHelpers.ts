/** Nota Figma `23:846`: rotación cada 10 s, palabras en escalera. */
export const INTERVALO_ROTACION_MS = 10_000
export const RETRASO_POR_PALABRA_MS = 60
export const DURACION_PALABRA_MS = 400
export const SALIDA_PREGUNTA_MS = 200
/** Escalón inicial y paso entre palabras, según las variantes “Entrando” de `23:820`. */
export const ESCALON_INICIAL_PX = 12
export const PASO_ESCALON_PX = 6

export const CLAVES_PREGUNTAS = [
  'comprador.consulta.pregunta1',
  'comprador.consulta.pregunta2',
  'comprador.consulta.pregunta3',
  'comprador.consulta.pregunta4',
  'comprador.consulta.pregunta5',
] as const

export function siguienteIndice(actual: number, total: number): number {
  if (total <= 0) return 0
  return (actual + 1) % total
}

export function palabrasDe(pregunta: string): string[] {
  return pregunta.trim().split(/\s+/).filter(Boolean)
}

export function escalonPalabra(indice: number): { desdePx: number; retrasoMs: number } {
  return {
    desdePx: ESCALON_INICIAL_PX + PASO_ESCALON_PX * indice,
    retrasoMs: RETRASO_POR_PALABRA_MS * indice,
  }
}
