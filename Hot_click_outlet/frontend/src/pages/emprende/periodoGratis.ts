import type { CupoEmprende } from '@/services/emprendeCupoService'

type Traductor = (key: string, opts?: Record<string, unknown>) => string

/**
 * Período gratis para los textos («3 meses»). Sale del backend (TRIAL_EMPRENDEDOR_DIAS); nunca va fijo en el texto.
 * Si todavía no cargó, o falló, se usa una frase genérica («unos meses») en vez de inventar un número.
 */
export function periodoGratis(cupo: Pick<CupoEmprende, 'periodoGratis'> | null | undefined, t: Traductor): string {
  const dePeriodo = cupo?.periodoGratis?.trim()
  return dePeriodo ? dePeriodo : t('emprende.periodoFallback')
}
