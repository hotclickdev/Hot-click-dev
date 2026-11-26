import type { CSSProperties } from 'react'
import { NOTA_UNA_VEZ_POR_NEGOCIO, textoPrimerMesLuego, type ClavePlan } from '@/config/planesPrecios'
import { useMensualidadesPlanes } from './useMensualidadesPlanes'
import { useDiasPrimerMes } from './useOfertaPrimerMes'

type Props = {
  plan: Exclude<ClavePlan, 'EMPRENDEDOR'>
  className?: string
  style?: CSSProperties
}

/**
 * «Primer mes gratis, luego ₡12.900/mes» + «Una vez por negocio.». Los días y el monto salen del backend
 * (`diasPrueba`, `precioUsd` + `moneda` de GET /api/planes); sin `diasPrueba` > 0 no se muestra nada.
 */
export default function OfertaPrimerMes({ plan, className, style }: Props) {
  const { montos, moneda, diasPrueba } = useMensualidadesPlanes()
  const visibles = useDiasPrimerMes()
  const linea = textoPrimerMesLuego(visibles(diasPrueba[plan]), montos[plan], moneda)
  if (!linea) return null
  return (
    <div className={className} style={style} data-testid="oferta-primer-mes">
      <p className="font-semibold">{linea}</p>
      <p className="text-xs opacity-80">{NOTA_UNA_VEZ_POR_NEGOCIO}</p>
    </div>
  )
}
