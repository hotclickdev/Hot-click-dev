import isotipo from '@/assets/figma/comprador/isotipo.png'
import { inicialesNegocio } from './qrNegocioHelpers'

type Props = Readonly<{
  nombre: string
  /** Segunda línea (mesa, cobro). Sin dato no se dibuja. */
  subtitulo?: string | null
  logoUrl?: string | null
  /** Texto fijo de "Pedido seguro con HotClick". */
  seguro: string
}>

/**
 * Encabezado del negocio de las pantallas QR (Figma `29:1651`): logo de 44,
 * nombre en Sora 17, subtítulo en 12 y la nota "Pedido seguro con HotClick".
 * Es un `div` (no `header`): `index.css` pinta toda etiqueta `header` con fondo propio.
 */
export default function QrEncabezadoNegocio({ nombre, subtitulo, logoUrl, seguro }: Props) {
  return (
    <div
      role="banner"
      className="flex flex-col gap-[10px] border-b border-[var(--hc-n-200)] bg-[var(--hc-n-0)] px-4 pb-[14px] pt-4"
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="size-11 shrink-0 rounded-[12px] object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[var(--hc-blue-900)] font-display text-[16px] font-bold text-white"
          >
            {inicialesNegocio(nombre)}
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <p className="truncate font-display text-[17px] font-bold leading-[21px] text-[var(--hc-n-900)]">
            {nombre}
          </p>
          {subtitulo ? (
            <p className="truncate text-[12px] leading-[14px] text-[var(--hc-n-500)]">{subtitulo}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-[6px]">
        <img src={isotipo} alt="" className="size-[14px] object-contain" />
        <p className="text-[11px] leading-[13px] text-[var(--hc-n-500)]">{seguro}</p>
      </div>
    </div>
  )
}
