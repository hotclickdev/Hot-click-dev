import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import POSProductSearch from '@/components/pos/POSProductSearch'
import { formatoColon } from '@/theme/formatoColon'
import CartItem from './CartItem'
import ClienteSelector from './ClienteSelector'
import { formatMontoPos, type ClienteSeleccionadoPos, type ItemCarritoPos, type ProductoEntradaCarrito } from './posHelpers'
import { usePosAtajos } from './usePosAtajos'
import type { Id } from '@/types/api'

/**
 * Caja POS (Figma 71:128 móvil / catálogo + ticket).
 * Sin panel PEDIDO dual ni tabs Productos/Carrito.
 */
export default function StepVenta({
  cartItems,
  onAdd,
  onSetCantidad,
  onSetPrecio,
  onRemove,
  descuento,
  onSetDescuento,
  subtotal,
  total,
  onNueva,
  onCobrar,
  onQrCliente,
  loadingQr,
  cliente,
  onSetCliente,
}: {
  cartItems: ItemCarritoPos[]
  onAdd: (producto: ProductoEntradaCarrito) => void
  onSetCantidad: (id: Id | undefined, val: string | number) => void
  onSetPrecio: (id: Id | undefined, val: string) => void
  onRemove: (id: Id | undefined) => void
  descuento: number
  onSetDescuento: (n: number) => void
  subtotal: number
  total: number
  onNueva: () => void
  onCobrar: () => void
  onQrCliente: () => void
  loadingQr: boolean
  cliente: ClienteSeleccionadoPos
  onSetCliente: (c: ClienteSeleccionadoPos) => void
}) {
  const [ticketAbierto, setTicketAbierto] = useState(false)
  const numItems = cartItems.reduce((s, i) => s + i.cantidad, 0)
  const cantidades = Object.fromEntries(cartItems.map((item) => [String(item.id), item.cantidad]))

  usePosAtajos({
    activo: true,
    hayItems: cartItems.length > 0,
    onCobrar,
    alBuscar: () => setTicketAbierto(false),
    alCantidad: () => {
      if (window.matchMedia('(max-width: 767px)').matches) setTicketAbierto(true)
    },
  })

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden" style={{ backgroundColor: 'var(--hc-surface-2, #F8F9FB)' }}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden p-3 pb-28 md:flex-row md:gap-5 md:p-5 md:pb-5">
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-2xl border bg-hc-surface p-4 md:p-5"
          style={{ borderColor: 'var(--hc-border, #E5E7EC)' }}
        >
          <CabeceraCaja />
          <div className="min-h-0 flex-1 border-t pt-3" style={{ borderColor: 'var(--hc-border, #E5E7EC)' }}>
            <POSProductSearch onAdd={onAdd} cantidades={cantidades} />
          </div>
        </section>

        <aside className="hidden w-full shrink-0 flex-col md:flex md:w-[360px]">
          <PanelTicket
            cartItems={cartItems}
            numItems={numItems}
            descuento={descuento}
            subtotal={subtotal}
            total={total}
            cliente={cliente}
            loadingQr={loadingQr}
            onSetCantidad={onSetCantidad}
            onSetPrecio={onSetPrecio}
            onRemove={onRemove}
            onSetDescuento={onSetDescuento}
            onSetCliente={onSetCliente}
            onNueva={onNueva}
            onCobrar={onCobrar}
            onQrCliente={onQrCliente}
          />
        </aside>
      </div>

      <div className="fixed bottom-4 left-0 right-0 z-10 mx-auto max-w-md px-4 md:hidden">
        <TicketBarPos
          numItems={numItems}
          total={total}
          disabled={cartItems.length === 0}
          onCobrar={onCobrar}
          onAbrirTicket={() => setTicketAbierto(true)}
        />
      </div>

      {ticketAbierto ? (
        <TicketDrawer
          cartItems={cartItems}
          numItems={numItems}
          descuento={descuento}
          subtotal={subtotal}
          total={total}
          cliente={cliente}
          loadingQr={loadingQr}
          onClose={() => setTicketAbierto(false)}
          onSetCantidad={onSetCantidad}
          onSetPrecio={onSetPrecio}
          onRemove={onRemove}
          onSetDescuento={onSetDescuento}
          onSetCliente={onSetCliente}
          onNueva={onNueva}
          onCobrar={() => { setTicketAbierto(false); onCobrar() }}
          onQrCliente={onQrCliente}
        />
      ) : null}
    </div>
  )
}

function CabeceraCaja() {
  const { t } = useTranslation()
  return (
    <header className="shrink-0">
      <h1 className="font-display text-xl font-bold text-hc-text md:text-[28px]">{t('pos.venta.title')}</h1>
      <p className="text-xs text-hc-muted md:mt-1 md:text-sm">{t('pos.venta.subtitle')}</p>
    </header>
  )
}

function TicketBarPos({
  numItems,
  total,
  disabled,
  onCobrar,
  onAbrirTicket,
}: {
  numItems: number
  total: number
  disabled: boolean
  onCobrar: () => void
  onAbrirTicket: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[var(--hc-n-900)] p-4 text-white shadow-lg">
      <button type="button" onClick={onAbrirTicket} className="min-w-0 text-left" data-pos-ticket-open>
        <p className="text-[11px] text-white/70">{t('pos.venta.productosEnFactura', { count: numItems })}</p>
        <p className="font-display text-lg font-bold">{formatoColon(total)}</p>
      </button>
      <button
        type="button"
        onClick={() => {
          if (disabled) return
          onCobrar()
        }}
        disabled={disabled}
        aria-disabled={disabled}
        data-mm="pos-cobrar"
        className={claseBotonCobrar(disabled, 'min-h-11 shrink-0 rounded-xl px-5 text-sm font-bold')}
      >
        {t('pos.venta.cobrar')}
      </button>
    </div>
  )
}

function claseBotonCobrar(disabled: boolean, extra: string): string {
  if (disabled) {
    return `${extra} cursor-not-allowed bg-[var(--hc-n-200,#D1D5DB)] text-white/80 pointer-events-none`
  }
  return `${extra} bg-hc-primary text-white`
}

type TicketProps = {
  cartItems: ItemCarritoPos[]
  numItems: number
  descuento: number
  subtotal: number
  total: number
  cliente: ClienteSeleccionadoPos
  loadingQr: boolean
  onSetCantidad: (id: Id | undefined, val: string | number) => void
  onSetPrecio: (id: Id | undefined, val: string) => void
  onRemove: (id: Id | undefined) => void
  onSetDescuento: (n: number) => void
  onSetCliente: (c: ClienteSeleccionadoPos) => void
  onNueva: () => void
  onCobrar: () => void
  onQrCliente: () => void
}

function PanelTicket(props: TicketProps) {
  const { t } = useTranslation()
  return (
    <div
      className="flex h-full flex-col rounded-2xl border-2 bg-hc-surface p-5 md:p-6"
      style={{ borderColor: 'var(--hc-border, #E5E7EC)' }}
    >
      <div
        className="mb-4 flex items-center justify-between gap-2 border-b pb-3"
        style={{ borderColor: 'var(--hc-border, #E5E7EC)' }}
      >
        <p className="font-display text-base font-bold text-hc-text">
          {t('pos.venta.productosEnFactura', { count: props.numItems })}
        </p>
        {props.cartItems.length > 0 ? (
          <button
            type="button"
            onClick={props.onNueva}
            className="text-xs font-medium text-hc-danger"
          >
            {t('pos.venta.limpiar')}
          </button>
        ) : null}
      </div>
      <TicketLineas {...props} />
      <div
        className="mt-auto space-y-3 border-t pt-4"
        style={{ borderColor: 'var(--hc-border, #E5E7EC)' }}
      >
        <TotalesTicket {...props} />
        <BotonCobrarFactura
          disabled={props.cartItems.length === 0}
          onCobrar={props.onCobrar}
        />
      </div>
    </div>
  )
}

function TicketDrawer(props: TicketProps & { onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-20 md:hidden" role="dialog" aria-modal="true" aria-label={t('pos.venta.facturaAria')}>
      <button type="button" className="absolute inset-0 bg-[rgba(20,23,28,0.45)]" aria-label={t('pos.common.cerrar')} onClick={props.onClose} />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] space-y-3 overflow-y-auto rounded-t-2xl border bg-hc-surface p-4 shadow-xl"
        style={{ borderColor: 'var(--hc-border, #E5E7EC)' }}
      >
        <div className="flex items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--hc-border, #E5E7EC)' }}>
          <p className="font-display text-base font-bold">
            {t('pos.venta.productosEnFactura', { count: props.numItems })}
          </p>
          <button type="button" onClick={props.onClose} className="text-sm font-medium text-hc-muted">
            {t('pos.common.cerrar')}
          </button>
        </div>
        <TicketLineas {...props} />
        {props.cartItems.length > 0 ? (
          <button
            type="button"
            onClick={props.onNueva}
            className="w-full py-2 text-sm font-medium text-hc-danger"
          >
            {t('pos.venta.limpiarFactura')}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function BotonCobrarFactura({
  disabled,
  onCobrar,
}: {
  disabled: boolean
  onCobrar: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return
        onCobrar()
      }}
      disabled={disabled}
      aria-disabled={disabled}
      data-mm="pos-cobrar"
      className={claseBotonCobrar(
        disabled,
        'flex min-h-12 w-full items-center justify-center rounded-[10px] text-[15px] font-bold',
      )}
    >
      {t('pos.venta.cobrar')}
    </button>
  )
}

function TicketLineas(props: TicketProps) {
  const { t } = useTranslation()
  if (props.cartItems.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-hc-muted">
        {t('pos.venta.vacio')}
      </p>
    )
  }
  return (
    <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
      {props.cartItems.map((item) => (
        <li key={String(item.id)}>
          <CartItem
            item={item}
            onSetCantidad={props.onSetCantidad}
            onSetPrecio={props.onSetPrecio}
            onRemove={props.onRemove}
          />
        </li>
      ))}
    </ul>
  )
}

function TotalesTicket(props: TicketProps & { bloqueado?: boolean }) {
  const { t } = useTranslation()
  const bloqueado = props.bloqueado ?? props.cartItems.length === 0
  return (
    <div className={`space-y-3 ${bloqueado ? 'pointer-events-none opacity-50' : ''}`}>
      <ClienteSelector cliente={props.cliente} onChange={props.onSetCliente} />
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-xs text-hc-muted">{t('pos.venta.descuentoColon')}</span>
        <input
          type="number"
          min={0}
          value={props.descuento || ''}
          placeholder="0"
          disabled={bloqueado}
          readOnly={bloqueado}
          onChange={(e) => {
            if (bloqueado) return
            props.onSetDescuento(Math.max(0, Number.parseInt(e.target.value || '0')))
          }}
          className="flex-1 rounded-xl px-3 py-2 text-right text-sm font-bold outline-none disabled:cursor-not-allowed"
          style={{
            backgroundColor: props.descuento > 0 ? 'var(--hc-danger-bg)' : 'var(--hc-surface-2)',
            border: `1px solid ${props.descuento > 0 ? 'var(--hc-danger)' : 'var(--hc-border)'}`,
            color: props.descuento > 0 ? 'var(--hc-danger)' : 'var(--hc-text)',
          }}
        />
      </div>
      {props.descuento > 0 ? (
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between text-hc-muted">
            <span>{t('pos.common.subtotal')}</span>
            <span>₡{formatMontoPos(props.subtotal)}</span>
          </div>
          <div className="flex justify-between text-hc-danger">
            <span>{t('pos.common.descuento')}</span>
            <span>-₡{formatMontoPos(props.descuento)}</span>
          </div>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-hc-text">{t('pos.common.total')}</span>
        <span className="font-display text-lg font-bold text-hc-text">{formatoColon(props.total)}</span>
      </div>
      {props.cartItems.length > 0 ? (
        <button
          type="button"
          onClick={props.onQrCliente}
          disabled={props.loadingQr}
          className="w-full rounded-xl border border-hc-border py-2.5 text-sm font-semibold text-hc-text disabled:opacity-40"
        >
          {props.loadingQr ? t('pos.venta.generandoQr') : t('pos.venta.qrTarjetaCliente')}
        </button>
      ) : null}
    </div>
  )
}
