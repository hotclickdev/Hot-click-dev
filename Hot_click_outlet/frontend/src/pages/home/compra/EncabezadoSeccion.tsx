import { Link } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'

type EncabezadoSeccionProps = {
  id: string
  titulo: string
  /** Título propio de desktop (Figma `9:270`: "Destacados de la semana"). */
  tituloDesktop?: string
  nota?: string
  accion?: { texto: string; textoDesktop?: string; to: string }
}

/** Texto que cambia entre móvil y desktop sin duplicar el nodo accesible. */
function TextoResponsivo({ movil, desktop }: { movil: string; desktop?: string }) {
  if (!desktop) return <>{movil}</>
  return (
    <>
      <span className="lg:hidden">{movil}</span>
      <span className="hidden lg:inline">{desktop}</span>
    </>
  )
}

/** Título de sección del Home con enlace "Ver todo" (Figma `12:358`, `9:268`). */
export default function EncabezadoSeccion({ id, titulo, tituloDesktop, nota, accion }: EncabezadoSeccionProps) {
  return (
    <div className="flex items-center justify-between gap-4 lg:items-end">
      <div className="flex flex-col gap-[2px]">
        <h2 id={id} className="font-display text-[18px] font-bold leading-[23px] tracking-normal text-hc-n-900 [text-wrap:wrap] lg:text-[22px] lg:leading-[28px]">
          <TextoResponsivo movil={titulo} desktop={tituloDesktop} />
        </h2>
        {nota && <p className="text-[12px] leading-[normal] text-hc-n-600 lg:text-[13px]">{nota}</p>}
      </div>
      {accion && (
        <Link to={accion.to} className="flex shrink-0 items-center gap-[2px] text-[13px] font-semibold leading-[normal] text-hc-blue-600 lg:text-[14px]">
          <TextoResponsivo movil={accion.texto} desktop={accion.textoDesktop} />
          <span className="flex size-[14px] lg:size-4">
            <IconoFigma src={ICONOS_COMPRADOR.verTodo} size="100%" />
          </span>
        </Link>
      )}
    </div>
  )
}
