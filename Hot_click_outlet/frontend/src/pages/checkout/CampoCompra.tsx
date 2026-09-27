import type { InputHTMLAttributes } from 'react'
import IconoFigma from '@/components/comprador/IconoFigma'

type CampoCompraProps = {
  id: string
  etiqueta: string
  valor: string
  onCambiar: (valor: string) => void
  /** Ícono del campo móvil; el desktop no lo lleva. */
  icono?: string
  pista?: string
  error?: string
  className?: string
} & Pick<InputHTMLAttributes<HTMLInputElement>, 'type' | 'autoComplete' | 'inputMode' | 'placeholder'>

/** Campo del checkout: móvil `28:1083` (con ícono) y desktop `30:2385`. */
export default function CampoCompra({
  id, etiqueta, valor, onCambiar, icono, pista, error, className = '', ...input
}: CampoCompraProps) {
  const idAyuda = `${id}-ayuda`
  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      <label htmlFor={id} className="text-[13px] font-semibold text-hc-n-900">{etiqueta}</label>
      <div
        className={`flex items-center gap-[10px] rounded-[12px] border bg-hc-n-0 px-[14px] py-[13px] lg:rounded-[10px] lg:py-[12px] ${error ? 'border-hc-red-500' : 'border-hc-n-200'}`}
      >
        {icono ? <span className="flex text-hc-n-500 lg:hidden"><IconoFigma src={icono} size={18} /></span> : null}
        <input
          id={id}
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error || pista ? idAyuda : undefined}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-hc-n-900 outline-none placeholder:text-[#9aa1ae]"
          {...input}
        />
      </div>
      {error ? (
        <p id={idAyuda} role="alert" className="text-[12px] text-hc-red-600">{error}</p>
      ) : null}
      {!error && pista ? <p id={idAyuda} className="text-[12px] text-hc-n-500 lg:hidden">{pista}</p> : null}
    </div>
  )
}
