import { Link } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'

type EncabezadoSeccionProps = {
  id: string
  titulo: string
  nota?: string
  accion?: { texto: string; to: string }
}

/** Título de sección del Home con enlace "Ver todo" (Figma `7:156`, `9:386`). */
export default function EncabezadoSeccion({ id, titulo, nota, accion }: EncabezadoSeccionProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex flex-col gap-[2px]">
        <h2 id={id} className="font-display text-[18px] font-bold text-hc-n-900 lg:text-[22px]">{titulo}</h2>
        {nota && <p className="text-[12px] text-hc-n-500 lg:text-[13px]">{nota}</p>}
      </div>
      {accion && (
        <Link to={accion.to} className="flex shrink-0 items-center gap-[2px] text-[13px] font-semibold text-hc-blue-600 lg:text-[14px]">
          {accion.texto}
          <IconoFigma src={ICONOS_COMPRADOR.verTodo} size={14} />
        </Link>
      )}
    </div>
  )
}
