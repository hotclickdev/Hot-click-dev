import { useId, useState, type ReactNode } from 'react'
import { IcoSrv } from '@/pages/servicios/IcoSrv'

type PreguntaFrecuenteProps = {
  pregunta: string
  children: ReactNode
  /** Abierta al cargar (Figma `28:1740` muestra la primera abierta). */
  abiertaInicial?: boolean
}

/** Pregunta frecuente desplegable: tarjeta blanca con pregunta de 14 y chevron de 16 (Figma `28:1740`). */
export default function PreguntaFrecuente({ pregunta, children, abiertaInicial = false }: PreguntaFrecuenteProps) {
  const [abierta, setAbierta] = useState(abiertaInicial)
  const idRespuesta = useId()
  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls={idRespuesta}
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="min-w-0 flex-1 text-[14px] font-semibold text-hc-n-900">{pregunta}</span>
        <IcoSrv nombre="infoChevronAbajo" size={16} className={abierta ? 'rotate-180' : ''} />
      </button>
      {abierta && (
        <div id={idRespuesta} className="text-[13px] leading-[18px] text-hc-n-600">{children}</div>
      )}
    </div>
  )
}
