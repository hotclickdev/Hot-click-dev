import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from './iconosCompra'

type SelectorCompraProps = {
  id: string
  etiqueta: string
  valor: string
  opciones: readonly string[]
  onCambiar: (valor: string) => void
  placeholder: string
  error?: string
  deshabilitado?: boolean
}

/** Provincia y cantón (Figma `29:1248`): lista nativa con el chevron del diseño. */
export default function SelectorCompra({
  id, etiqueta, valor, opciones, onCambiar, placeholder, error, deshabilitado = false,
}: SelectorCompraProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
      <label htmlFor={id} className="text-[13px] font-semibold text-hc-n-900">{etiqueta}</label>
      <div className="relative">
        <select
          id={id}
          value={valor}
          disabled={deshabilitado}
          onChange={(evento) => onCambiar(evento.target.value)}
          aria-invalid={Boolean(error)}
          className={`w-full appearance-none rounded-[12px] border bg-hc-n-0 py-[13px] pl-[14px] pr-[36px] text-[15px] outline-none disabled:opacity-60 lg:rounded-[10px] lg:py-[12px] ${valor ? 'text-hc-n-900' : 'text-[#9aa1ae]'} ${error ? 'border-hc-red-500' : 'border-hc-n-200'}`}
        >
          <option value="">{placeholder}</option>
          {opciones.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
        </select>
        <span className="pointer-events-none absolute right-[14px] top-1/2 flex -translate-y-1/2 text-hc-n-500">
          <IconoFigma src={ICONOS_COMPRA.chevronAbajo} size={16} />
        </span>
      </div>
      {error ? <p role="alert" className="text-[12px] text-hc-red-600">{error}</p> : null}
    </div>
  )
}
