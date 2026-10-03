import { useTranslation } from 'react-i18next'
import { ICONOS_QR } from '@/features/qr-negocio/iconosQr'
import { inicialesNegocio } from '@/features/qr-negocio/qrNegocioHelpers'
import { fmt } from './selfCheckoutFormat'
import type { ProductoSelfCheckout } from './selfCheckoutTypes'

type Props = Readonly<{
  producto: ProductoSelfCheckout
  cantidad: number
  onCambiar: (producto: ProductoSelfCheckout, cantidad: number) => void
}>

/**
 * Producto del menú en fila (Figma `29:1689`): foto de 68, nombre, categoría y
 * precio; botón "+" rojo de 36 o, con cantidad, selector azul y borde azul.
 */
export default function SelfCheckoutProductCard({ producto, cantidad, onCambiar }: Props) {
  const { t } = useTranslation()
  const nombre = producto.nombre ?? ''
  const elegido = cantidad > 0

  return (
    <li
      className={`flex items-center gap-3 overflow-hidden rounded-[14px] bg-hc-n-0 ${
        elegido
          ? 'border-[1.5px] border-hc-blue-600 p-[10px]'
          : 'border border-hc-n-200 p-[10px]'
      }`}
    >
      {producto.imagenUrl ? (
        <img src={producto.imagenUrl} alt="" className="size-[68px] shrink-0 rounded-[10px] object-cover" />
      ) : (
        <span
          aria-hidden="true"
          className="grid size-[68px] shrink-0 place-items-center rounded-[10px] bg-hc-n-100 font-display text-[16px] font-bold text-hc-n-600"
        >
          {inicialesNegocio(nombre)}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <p className="text-[14px] font-medium leading-4 text-hc-n-900">{nombre}</p>
        {producto.categoria ? (
          <p className="text-[12px] leading-[14px] text-hc-n-600">{producto.categoria}</p>
        ) : null}
        <p className="font-display text-[15px] font-bold leading-[19px] text-hc-n-900">
          {fmt(producto.precio)}
        </p>
      </div>
      {elegido ? (
        <div className="flex shrink-0 items-center gap-[10px] rounded-[10px] bg-hc-blue-50 px-2 py-[6px]">
          <button
            type="button"
            aria-label={t('pos.mesa.quitarA', { nombre })}
            onClick={() => onCambiar(producto, cantidad - 1)}
            className="grid size-4 place-items-center"
          >
            <img src={ICONOS_QR.cantidadMenos} alt="" className="size-4" />
          </button>
          <span className="text-[14px] font-bold leading-4 text-hc-blue-600">{cantidad}</span>
          <button
            type="button"
            aria-label={t('pos.mesa.agregarA', { nombre })}
            onClick={() => onCambiar(producto, cantidad + 1)}
            className="grid size-4 place-items-center"
          >
            <img src={ICONOS_QR.cantidadMas} alt="" className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={t('pos.mesa.agregarA', { nombre })}
          onClick={() => onCambiar(producto, 1)}
          className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-hc-red-500"
        >
          <img src={ICONOS_QR.agregar} alt="" className="size-[18px]" />
        </button>
      )}
    </li>
  )
}
