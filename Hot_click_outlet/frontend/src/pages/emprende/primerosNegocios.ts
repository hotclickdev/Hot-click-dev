import type { CupoEmprende } from '@/services/emprendeCupoService'

type Traductor = (key: string, opts?: Record<string, unknown>) => string

/** Cantidad de negocios con trial gratis, tal como la publica el backend (TRIAL_EMPRENDEDOR_CUPO); null si no es un entero > 0. */
export function limiteCupo(cupo: Pick<CupoEmprende, 'limite'> | null | undefined): number | null {
  const limite = cupo?.limite
  return typeof limite === 'number' && Number.isInteger(limite) && limite > 0 ? limite : null
}

/**
 * «los primeros N negocios» para los textos. N sale del backend (`GET /api/public/emprende/cupos` → limite, que lee
 * hotclick.trial-emprendedor.cupo); nunca va fijo en el texto. Mientras no cargó, o si falló, se usa la frase sin número
 * («los primeros negocios») en vez de inventar una cifra.
 */
export function primerosNegocios(cupo: Pick<CupoEmprende, 'limite'> | null | undefined, t: Traductor): string {
  const limite = limiteCupo(cupo)
  return limite === null ? t('emprende.primerosNegociosFallback') : t('emprende.primerosNegocios', { limite })
}
