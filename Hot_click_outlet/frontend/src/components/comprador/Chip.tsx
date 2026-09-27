import { Link } from 'react-router-dom'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'

type ChipVariante = 'categoria' | 'asistente'

type ChipProps = {
  texto: string
  variante?: ChipVariante
  to?: string
  onClick?: () => void
  className?: string
}

const ESTILOS: Record<ChipVariante, string> = {
  categoria: 'border-hc-n-200 bg-hc-n-0 text-hc-n-900',
  asistente: 'border-hc-blue-100 bg-hc-blue-50 text-hc-blue-600',
}

/** Chip de categoría o de consulta sugerida al asistente (Figma `5:44`). */
export default function Chip({ texto, variante = 'categoria', to, onClick, className = '' }: ChipProps) {
  const clases = `flex shrink-0 items-center gap-[6px] whitespace-nowrap rounded-full border px-[14px] py-2 text-[13px] font-medium ${ESTILOS[variante]} ${className}`
  const contenido = (
    <>
      {variante === 'asistente' && <IconoFigma src={ICONOS_COMPRADOR.chipAsistente} size={14} />}
      {texto}
    </>
  )
  if (to) return <Link to={to} className={clases}>{contenido}</Link>
  return <button type="button" onClick={onClick} className={clases}>{contenido}</button>
}
