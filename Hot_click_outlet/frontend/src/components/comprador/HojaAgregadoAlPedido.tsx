import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HojaInferior from './HojaInferior'
import IconoFigma from './IconoFigma'
import { ICONOS_COMPRADOR } from './iconosComprador'
import { fotoProducto } from './productCardHelpers'
import useCartStore from '@/store/cartStore'
import { formatPrice } from '@/utils/format'
import type { Producto } from '@/types/producto'

type HojaAgregadoAlPedidoProps = {
  abierta: boolean
  onCerrar: () => void
  producto: Producto
  cantidad: number
}

/**
 * Hoja “Agregado a tu pedido” (Figma `45:1607`, solo móvil: quien la abre decide el ancho): confirma el producto
 * agregado, avisa si comparte paquete con otro producto del mismo negocio y ofrece
 * “Seguir comprando” (cierra) o “Ver pedido” (carrito).
 */
export default function HojaAgregadoAlPedido({ abierta, onCerrar, producto, cantidad }: HojaAgregadoAlPedidoProps) {
  const { t } = useTranslation()
  const items = useCartStore((s) => s.items)
  if (!abierta) return null

  const negocio = producto.empresaNombre?.trim() || ''
  const mismoPaquete = items.filter((i) => (
    producto.empresaId != null ? i.empresaId === producto.empresaId : Boolean(negocio) && i.empresaNombre === negocio
  ))
  const comparteEnvio = Boolean(negocio) && mismoPaquete.length > 1
  const totalPedido = items.reduce((suma, i) => suma + (i.precio ?? i.precioVenta ?? 0) * i.cantidad, 0)
  const foto = fotoProducto(producto)

  return (
    <HojaInferior
      abierta
      onCerrar={onCerrar}
      titulo={(
        <div className="flex items-center gap-2">
          <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-hc-success">
            <IconoFigma src={ICONOS_COMPRADOR.agregadoCheck} size={16} className="text-hc-n-0" />
          </span>
          <h2 className="font-display text-[17px] tracking-normal font-bold leading-[normal] text-hc-n-900">{t('comprador.hoja.titulo')}</h2>
        </div>
      )}
    >
      <div className="flex items-center gap-3 rounded-[14px] bg-hc-n-50 p-[10px]">
        {foto ? (
          <img src={foto} alt="" className="size-14 shrink-0 rounded-[10px] object-cover" />
        ) : (
          <span aria-hidden="true" className="size-14 shrink-0 rounded-[10px] bg-hc-n-200" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[normal]">
          <p className="truncate text-[14px] font-medium text-hc-n-900">{producto.nombre}</p>
          <p className="truncate text-[12px] text-hc-n-600">
            {negocio
              ? t('comprador.hoja.detalleNegocio', { negocio, count: cantidad })
              : t('comprador.hoja.detalle', { count: cantidad })}
          </p>
        </div>
        <p className="shrink-0 font-display text-[15px] font-bold leading-[19px] text-hc-n-900">{formatPrice((producto.precio ?? producto.precioVenta ?? 0) * cantidad)}</p>
      </div>

      {comparteEnvio && (
        <div className="flex items-start gap-2 rounded-[10px] bg-hc-success-bg px-3 py-[10px]">
          <IconoFigma src={ICONOS_COMPRADOR.agregadoEnvio} size={16} />
          <p className="min-w-0 flex-1 text-[12px] leading-4 text-hc-success">{t('comprador.hoja.envioPagado', { negocio })}</p>
        </div>
      )}

      <div className="flex items-start justify-between leading-[normal]">
        <p className="text-[13px] text-hc-n-600">{t('comprador.hoja.totalPedido', { count: items.length })}</p>
        <p className="font-display text-[14px] font-semibold leading-[18px] text-hc-n-900">{formatPrice(totalPedido)}</p>
      </div>

      <div className="flex items-start gap-[10px]">
        <button
          type="button"
          onClick={onCerrar}
          className="flex min-w-0 flex-1 items-center justify-center rounded-xl border border-hc-n-200 bg-hc-n-0 px-4 py-[13px] text-[14px] font-semibold leading-[normal] text-hc-n-900"
        >
          {t('comprador.hoja.seguirComprando')}
        </button>
        <Link
          to="/carrito"
          onClick={onCerrar}
          className="flex min-w-0 flex-1 items-center justify-center rounded-xl bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold leading-[normal] text-hc-n-0"
        >
          {t('comprador.hoja.verPedido')}
        </Link>
      </div>
    </HojaInferior>
  )
}
