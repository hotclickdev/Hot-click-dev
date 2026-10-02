import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_CATALOGO } from './iconosCatalogo'

/**
 * Casilla de Figma: radio 5, borde 1,5 (n/400; azul con check si está marcada).
 * `columna` (desktop `30:1903`): 18 px con check de 12. `hoja` (móvil `26:937`): 20 px con check de 14.
 */
export default function Casilla({
  etiqueta, marcada, onCambiar, cuenta, tamano = 'columna',
}: {
  etiqueta: string
  marcada: boolean
  onCambiar: () => void
  cuenta?: number
  tamano?: 'columna' | 'hoja'
}) {
  const hoja = tamano === 'hoja'
  return (
    <label className="flex cursor-pointer items-center gap-[10px] leading-[normal]">
      <input type="checkbox" checked={marcada} onChange={onCambiar} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`flex shrink-0 items-center justify-center rounded-[5px] border-[1.5px] peer-focus-visible:ring-2 peer-focus-visible:ring-hc-blue-600/40 ${hoja ? 'size-5' : 'size-[18px]'} ${marcada ? 'border-hc-blue-600 bg-hc-blue-600 text-hc-n-0' : 'border-hc-n-400 bg-hc-n-0'}`}
      >
        {marcada && <IconoFigma src={hoja ? ICONOS_CATALOGO.casillaCheck14 : ICONOS_CATALOGO.casillaCheck} size={hoja ? 14 : 12} />}
      </span>
      <span className="min-w-0 flex-1 text-[14px] text-hc-n-900">{etiqueta}</span>
      {cuenta != null && <span className="shrink-0 text-[13px] text-hc-n-500">{cuenta}</span>}
    </label>
  )
}
