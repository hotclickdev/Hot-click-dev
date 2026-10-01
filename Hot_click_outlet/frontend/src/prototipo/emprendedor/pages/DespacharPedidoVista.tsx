import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { PackagePlaceholder } from '@/pages/carrito/cartIcons'
import { formatPrice } from '@/utils/format'
import despachoCheck from '@/assets/figma/pago/despacho-check.svg'
import despachoEscanear from '@/assets/figma/pago/despacho-escanear.svg'
import despachoUbicacion from '@/assets/figma/pago/despacho-ubicacion.svg'
import type { PedidoEmprendedor } from '../types'

type DespacharPedidoVistaProps = {
  pedido: PedidoEmprendedor
  guia: string
  onGuia: (valor: string) => void
  marcando: boolean
  error: string | null
  onMarcar: () => void
}

const MAX_GUIA = 100

/**
 * Despachar un pedido: Figma `37:1780` (móvil). Muestra los productos, la dirección de envío y el número de
 * guía de Correos; con guía, el backend notifica al cliente con el seguimiento. Sin datos de paquetes del pedido
 * ni de liquidación al vendedor, los bloques "Paquete 1 de N" y "Tu pago por este paquete" quedan pendientes.
 */
export default function DespacharPedidoVista({ pedido, guia, onGuia, marcando, error, onMarcar }: DespacharPedidoVistaProps) {
  const { t } = useTranslation()
  const pendiente = pedido.estado === 'Pendiente'
  return (
    <div className="flex flex-col gap-[14px] leading-[normal]">
      <section className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] font-medium text-hc-n-500">{t('despacho.pedido', { id: pedido.id })}</p>
          <span className={`rounded-full px-2 py-[3px] text-[11px] font-semibold ${pendiente ? 'bg-hc-warning-bg text-hc-warning' : 'bg-[var(--hc-success-bg)] text-hc-success'}`}>
            {pendiente ? t('despacho.porDespachar') : pedido.estado}
          </span>
        </div>
        <h2 className="font-sans text-[15px] font-semibold tracking-normal text-hc-n-900">{t('despacho.tusProductos')}</h2>
        {pedido.productos.map((producto) => (
          <div key={producto.id} className="flex items-center gap-[10px]">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[8px] bg-hc-n-100"><PackagePlaceholder /></span>
            <p className="min-w-0 flex-1 truncate text-[13px] text-hc-n-900">{`${producto.nombre} · ${t('despacho.unidades', { count: producto.cantidad })}`}</p>
            <p className="shrink-0 font-display text-[13px] font-semibold text-hc-n-900">{formatPrice(producto.precio * producto.cantidad)}</p>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-hc-n-200 pt-[10px] text-hc-n-900">
          <p className="text-[13px] font-semibold">{t('despacho.total')}</p>
          <p className="font-display text-[15px] font-bold">{formatPrice(pedido.total)}</p>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
        <h2 className="font-sans text-[14px] font-semibold tracking-normal text-hc-n-900">{t('despacho.enviarA')}</h2>
        <div className="flex items-start gap-2">
          <IconoFigma src={despachoUbicacion} size={16} className="text-hc-n-600" />
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <p className="text-[13px] font-medium text-hc-n-900">{pedido.cliente}</p>
            <p className="text-[12px] leading-4 text-hc-n-600">{pedido.direccion || '—'}</p>
          </div>
        </div>
      </section>

      {pendiente && (
        <section className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
          <label htmlFor="guia-correos" className="text-[14px] font-semibold text-hc-n-900">{t('despacho.guiaTitulo')}</label>
          <div className="flex items-center gap-2 rounded-[10px] border-[1.5px] border-hc-blue-600 bg-hc-n-0 py-[10px] pl-3 pr-2">
            <input
              id="guia-correos"
              value={guia}
              onChange={(e) => onGuia(e.target.value.toUpperCase().replace(/\s/g, ''))}
              maxLength={MAX_GUIA}
              placeholder="RR123456789CR"
              autoComplete="off"
              className="hc-input-libre min-w-0 flex-1 bg-transparent font-mono text-[15px] font-medium text-hc-n-900 outline-none placeholder:text-hc-n-500"
            />
            <IconoFigma src={despachoEscanear} size={20} className="text-hc-blue-600" />
          </div>
          <p className="text-[12px] leading-4 text-hc-n-500">{t('despacho.guiaAyuda')}</p>
          {error && <p role="alert" className="text-[12px] leading-4 text-hc-danger">{error}</p>}
          <button
            type="button"
            onClick={onMarcar}
            disabled={marcando}
            className="flex items-center justify-center gap-2 rounded-[12px] bg-hc-red-500 py-[14px] text-[15px] font-semibold leading-[18px] text-hc-n-0 disabled:opacity-60"
          >
            <IconoFigma src={despachoCheck} size={18} />
            {marcando ? t('despacho.guardando') : t('despacho.marcar')}
          </button>
        </section>
      )}
    </div>
  )
}
