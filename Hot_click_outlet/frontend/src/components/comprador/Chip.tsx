import { Link } from 'react-router-dom'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'

type ChipVariante = 'categoria' | 'asistente' | 'seleccionado'

type ChipProps = {
  texto: string
  variante?: ChipVariante
  to?: string
  onClick?: () => void
  className?: string
  /** Chip de filtro: expone `aria-pressed` en el botón. */
  presionado?: boolean
}

const ESTILOS: Record<ChipVariante, string> = {
  categoria: 'border-hc-n-200 bg-hc-n-0 text-hc-n-900',
  asistente: 'border-hc-blue-100 bg-hc-blue-50 text-hc-blue-600',
  seleccionado: 'border-hc-blue-600 bg-hc-blue-600 text-hc-n-0',
}

/** Chip de categoría, de consulta sugerida al asistente o de filtro activo (Figma `5:44`, `28:1318`). */
export default function Chip({ texto, variante = 'categoria', to, onClick, className = '', presionado }: ChipProps) {
  const clases = `flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-medium ${ESTILOS[variante]} ${className}`
  const contenido = (
    <>
      {variante === 'asistente' && <IconoFigma src={ICONOS_COMPRADOR.chipAsistente} size={14} />}
      {texto}
    </>
  )
  if (to) return <Link to={to} className={clases}>{contenido}</Link>
  return <button type="button" onClick={onClick} aria-pressed={presionado} className={clases}>{contenido}</button>
}
