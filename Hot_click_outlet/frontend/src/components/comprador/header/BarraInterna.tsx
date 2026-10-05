import MarcaComprador from './MarcaComprador'
import type { DatosBarraInterna } from './tiposHeader'

const CLASE_TITULO = 'min-w-0 flex-1 truncate font-display text-[17px] font-bold text-hc-n-900'
/** Anula el tracking y el balance globales de `h1` para que el cambio de etiqueta no mueva el texto. */
const CLASE_TITULO_PRINCIPAL = `${CLASE_TITULO} tracking-normal [text-wrap:nowrap]`

/**
 * Barra superior de las pantallas internas en móvil: logo de HotClick + título (derivado de Figma `28:1144`).
 * El atrás y el adelante viven en la fila de migas, para no duplicar la flecha.
 */
export default function BarraInterna({ titulo, acciones, esTituloPrincipal }: DatosBarraInterna) {
  return (
    <div className="flex items-center gap-3 border-b border-hc-n-200 bg-hc-n-0 px-4 py-[14px] leading-[normal] lg:hidden">
      <MarcaComprador tamano="pequena" />
      {esTituloPrincipal
        ? <h1 className={CLASE_TITULO_PRINCIPAL}>{titulo}</h1>
        : <p className={CLASE_TITULO}>{titulo}</p>}
      {acciones}
    </div>
  )
}
