import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '@/utils/format'
import { EfectivoIcon, LockIcon, SinpeIcon, CardIcon } from './checkoutIcons'
import type { ItemCheckout, PaqueteCheckout } from './checkoutHelpers'
import { CampoCodigo, LineaCodigo, TarjetaCodigos, TituloValido } from './CodigoDescuento'
import { formatoRebaja, saldoRestanteGiftCard } from './codigoDescuentoHelpers'
import type { Dispatch, SetStateAction } from 'react'

function ItemFila({ item }: { item: ItemCheckout }) {
  return (
    <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
      <span className="truncate mr-2">{item.nombre} ×{item.cantidad}</span>
      <span className="shrink-0">{formatPrice((item.precio ?? item.precioVenta ?? 0) * (item.cantidad ?? 0))}</span>
    </div>
  )
}

/**
 * Lista de productos del resumen — agrupada por paquete (uno por vendedor) cuando el
 * carrito tiene 2+ emprendimientos, para que quede claro que HotClick cobra todo junto
 * pero cada paquete se despacha por separado. Con 1 solo paquete se ve igual que siempre.
 */
function ListaItemsResumen({ items, paquetes }: { items: ItemCheckout[]; paquetes: PaqueteCheckout[] }) {
  if (paquetes.length <= 1) {
    return (
      <div className="space-y-2 text-sm">
        {items.map((item) => <ItemFila key={item.id} item={item} />)}
      </div>
    )
  }
  return (
    <div className="space-y-3 text-sm">
      {paquetes.map((p, i) => (
        <div key={p.bodegaId} className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>
            Paquete {i + 1} · {p.bodegaNombre}
          </p>
          {p.items.map((item) => <ItemFila key={item.id ?? item.cartLineId} item={item} />)}
        </div>
      ))}
    </div>
  )
}

type CheckoutSummaryProps = {
  items: ItemCheckout[]
  paquetes: PaqueteCheckout[]
  /** true si algún paquete usa un método de envío que HotClick no cobra (ej. encomienda) — el total no lo incluye. */
  envioVaria: boolean
  token: string | null
  gcInput: string
  setGcInput: Dispatch<SetStateAction<string>>
  gcEstado: string
  setGcEstado: Dispatch<SetStateAction<string>>
  setGcSaldo: Dispatch<SetStateAction<number>>
  setGcCodigo: Dispatch<SetStateAction<string | null>>
  gcSaldo: number
  gcCodigo: string | null
  validarGiftCard: () => void
  cuponInput: string
  setCuponInput: Dispatch<SetStateAction<string>>
  cuponEstado: string
  setCuponEstado: Dispatch<SetStateAction<string>>
  setCuponDescuento: Dispatch<SetStateAction<number>>
  setCuponCodigo: Dispatch<SetStateAction<string | null>>
  setCuponError: Dispatch<SetStateAction<string>>
  cuponDescuento: number
  cuponError: string
  validarCupon: () => void
  subtotalCart: number
  descuentoMonto: number
  gcAplicado: number
  costoEnvio: number
  totalFinal: number
  metodoPago: string
  aceptaDatos: boolean
  setAceptaDatos: Dispatch<SetStateAction<boolean>>
  estado: string
  intentos: number
  maxIntentos: number
  onPagar: () => void
}

export default function CheckoutSummary({
  items,
  paquetes,
  envioVaria,
  token,
  gcInput,
  setGcInput,
  gcEstado,
  setGcEstado,
  setGcSaldo,
  setGcCodigo,
  gcSaldo,
  gcCodigo,
  validarGiftCard,
  cuponInput,
  setCuponInput,
  cuponEstado,
  setCuponEstado,
  setCuponDescuento,
  setCuponCodigo,
  setCuponError,
  cuponDescuento,
  cuponError,
  validarCupon,
  subtotalCart,
  descuentoMonto,
  gcAplicado,
  costoEnvio,
  totalFinal,
  metodoPago,
  aceptaDatos,
  setAceptaDatos,
  estado,
  intentos,
  maxIntentos,
  onPagar,
}: CheckoutSummaryProps) {
  const { t } = useTranslation()
  const payMethodIconFallback = metodoPago === 'EFECTIVO' ? <EfectivoIcon selected /> : <LockIcon />
  const payMethodIconSinpe = metodoPago === 'SINPE' ? <SinpeIcon selected /> : payMethodIconFallback
  const payMethodIcon = metodoPago === 'TILOPAY' ? <CardIcon selected /> : payMethodIconSinpe
  const payEfectivoLabel = `Confirmar pedido · ${formatPrice(totalFinal)} en efectivo`
  const payLabelCard = `Pagá con tarjeta · ${formatPrice(totalFinal)}`
  const payLabelFallback = metodoPago === 'EFECTIVO' ? payEfectivoLabel : payLabelCard
  const payLabel = metodoPago === 'SINPE' ? `Pagá con SINPE · ${formatPrice(totalFinal)}` : payLabelFallback

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 }}
      className="sticky top-24 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.orderSummary')}</h2>

      <ListaItemsResumen items={items} paquetes={paquetes} />

      {/* Tarjeta de regalo (solo con sesión) y cupón — Figma 55:2220 / 55:2284 */}
      <TarjetaCodigos titulo={t(token ? 'checkout.codigo.titulo' : 'checkout.codigo.cuponTitulo')}>
        {token && (
          <CampoCodigo
            valor={gcInput}
            estado={gcEstado}
            placeholder={t('checkout.codigo.giftPlaceholder')}
            ariaLabel={t('checkout.codigo.giftAria')}
            maxLength={30}
            onCambiar={(v) => { setGcInput(v); setGcEstado('idle'); setGcSaldo(0); setGcCodigo(null) }}
            onAplicar={validarGiftCard}
            onQuitar={() => { setGcInput(''); setGcEstado('idle'); setGcSaldo(0); setGcCodigo(null) }}
            invalido={{ titulo: t('checkout.codigo.giftInvalidoTitulo'), ayuda: t('checkout.codigo.giftInvalidoAyuda') }}
            detalleValido={(
              <>
                <TituloValido texto={t('checkout.codigo.giftValidoTitulo')} />
                <LineaCodigo etiqueta={t('checkout.codigo.saldoDisponible')} valor={formatPrice(gcSaldo)} />
                <LineaCodigo etiqueta={t('checkout.codigo.seAplica')} valor={formatoRebaja(gcAplicado)} rebaja />
                <LineaCodigo etiqueta={t('checkout.codigo.saldoRestante')} valor={formatPrice(saldoRestanteGiftCard(gcSaldo, gcAplicado))} />
              </>
            )}
            t={t}
          />
        )}
        <CampoCodigo
          valor={cuponInput}
          estado={cuponEstado}
          placeholder={t('checkout.codigo.cuponPlaceholder')}
          ariaLabel={t('checkout.codigo.cuponAria')}
          maxLength={20}
          onCambiar={(v) => { setCuponInput(v); setCuponEstado('idle'); setCuponDescuento(0); setCuponCodigo(null); setCuponError('') }}
          onAplicar={validarCupon}
          onQuitar={() => { setCuponInput(''); setCuponEstado('idle'); setCuponDescuento(0); setCuponCodigo(null); setCuponError('') }}
          invalido={{ titulo: cuponError || t('checkout.codigo.cuponInvalidoTitulo') }}
          detalleValido={(
            <>
              <TituloValido texto={t('checkout.codigo.cuponValidoTitulo')} />
              <LineaCodigo
                etiqueta={t('checkout.codigo.cuponDescuento', { porcentaje: cuponDescuento })}
                valor={formatoRebaja(descuentoMonto)}
                rebaja
              />
            </>
          )}
          t={t}
        />
      </TarjetaCodigos>

      <div className="pt-3 border-t space-y-2 text-sm" style={{ borderColor: 'var(--hc-border)' }}>
        <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
          <span>{t('checkout.subtotal')}</span>
          <span>{formatPrice(subtotalCart)}</span>
        </div>
        {descuentoMonto > 0 && (
          <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
            <span>{t('checkout.codigo.lineaDescuento', { porcentaje: cuponDescuento })}</span>
            <span className="text-hc-success">{formatoRebaja(descuentoMonto)}</span>
          </div>
        )}
        {gcAplicado > 0 && (
          <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
            <span>{t('checkout.codigo.lineaGift', { codigo: gcCodigo ?? '' })}</span>
            <span className="text-hc-success">{formatoRebaja(gcAplicado)}</span>
          </div>
        )}
        <div className="flex justify-between" style={{ color: 'var(--hc-muted)' }}>
          <span>{t('checkout.shippingCost')}</span>
          {envioVaria ? (
            <span style={{ color: 'var(--hc-muted)' }}>{t('checkout.shippingVaries')}{costoEnvio > 0 ? ` + ${formatPrice(costoEnvio)}` : ''}</span>
          ) : (
            <span className={costoEnvio === 0 ? 'text-hc-success font-medium' : ''}>
              {costoEnvio === 0 ? t('checkout.free') : formatPrice(costoEnvio)}
            </span>
          )}
        </div>
        {envioVaria && (
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            {t('checkout.encomiendaNote')}
          </p>
        )}
      </div>

      <div className="pt-3 border-t flex justify-between font-bold" style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-text)' }}>
        <span>{t(gcAplicado > 0 ? 'checkout.codigo.totalRestante' : 'checkout.total')}</span>
        <span className="text-lg" style={{ color: 'var(--hc-accent)' }}>{formatPrice(totalFinal)}</span>
      </div>
      {gcAplicado > 0 && (
        <p className="text-[12px] leading-4" style={{ color: 'var(--hc-muted)' }}>
          {t('checkout.codigo.notaRestante')}
        </p>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        Precios en colones (₡). Incluyen impuestos aplicables.
      </p>
      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        Pago procesado por HotClick / el vendedor según el pedido.
      </p>

      {/* Trust mini badges */}
      <div className="flex items-center justify-center gap-4 py-2.5 px-3 rounded-xl text-[11px]"
        style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
        <span>{t('checkout.trustWarranty')}</span>
        <span>{t('checkout.trustSecure')}</span>
        <span>{t('checkout.trustReturns')}</span>
      </div>

      {/* Consentimiento de datos — Ley 8968 */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem', borderRadius: 10, border: `1px solid ${aceptaDatos ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: aceptaDatos ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'transparent', transition: 'all 0.15s' }}>
        <input
          type="checkbox"
          checked={aceptaDatos}
          onChange={e => setAceptaDatos(e.target.checked)}
          style={{ marginTop: 2, accentColor: 'var(--hc-accent)', width: 15, height: 15, flexShrink: 0 }}
        />
        <span style={{ fontSize: 11.5, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
          Autorizo el tratamiento de mis datos y su transferencia al vendedor con el único fin de coordinar la entrega del pedido, conforme a la{' '}
          <Link to="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Privacidad</Link>
          {' '}y la{' '}
          <Link to="/cookies" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hc-accent)', textDecoration: 'none' }}>Política de Cookies</Link>.
        </span>
      </label>

      {/* CTA único rojo del checkout — el botón repite el monto (§5.6 / voseo 15.3) */}
      <button type="button"
        onClick={onPagar}
        disabled={!aceptaDatos || estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos}
        className="hc-btn hc-btn-primary w-full !h-12 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {payMethodIcon}
        {payLabel}
      </button>

      <p className="text-[10px] text-center leading-relaxed flex items-center justify-center gap-1" style={{ color: 'var(--hc-muted)' }}>
        <LockIcon /> Pago cifrado · Protección al comprador incluida
      </p>
      <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        {t('checkout.terms')} <Link to="/informacion" className="hover:underline">{t('checkout.termsLink')}</Link>.
      </p>
    </motion.div>
  )
}
