import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'

const BODEGA_DEFAULT  = 1
const SINPE_NUMERO    = '8666-7888'
const SINPE_TITULAR   = 'Andrés Zúñiga (HotClick)'
const WHATSAPP        = '50686667888'

const fmt = (n) => new Intl.NumberFormat('es-CR').format(n ?? 0)

function Field({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium" style={{ color: 'var(--hc-muted)' }}>
        {label}{required && <span style={{ color: 'var(--hc-accent)' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{
          background: 'var(--hc-surface-2)',
          border: '1px solid var(--hc-border)',
          color: 'var(--hc-text)',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--hc-accent)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--hc-border)' }}
      />
    </div>
  )
}

/**
 * Mini checkout embebido en el modal de chat.
 * Solo SINPE y EFECTIVO: métodos sin redirección externa.
 */
export default function POSPaymentPanel({ onClose }) {
  const { items, total, clearCart } = useCartStore()
  const { token } = useAuthStore()
  const { estado, pagoData, error: payError, iniciarPago } = usePayment()

  const [metodo,    setMetodo]    = useState('SINPE')
  const [entrega,   setEntrega]   = useState('RETIRO_EN_TIENDA')
  const [nombre,    setNombre]    = useState('')
  const [telefono,  setTelefono]  = useState('')
  const [email,     setEmail]     = useState('')
  const [direccion, setDireccion] = useState('')
  const [error,     setError]     = useState('')

  const needsAddress = entrega !== 'RETIRO_EN_TIENDA'
  const shipping = entrega === 'RETIRO_EN_TIENDA' ? 0 : 2500
  const totalFinal = total + shipping

  const isSubmitting = ['loading', 'redirecting'].includes(estado)
  const isPending    = ['sinpe_pendiente', 'polling'].includes(estado)
  const isSuccess    = estado === 'success'
  const isFailed     = estado === 'failed'

  function validate() {
    if (!nombre.trim())    return 'El nombre es obligatorio'
    if (!telefono.trim())  return 'El teléfono es obligatorio'
    if (needsAddress && !direccion.trim()) return 'La dirección es obligatoria para el envío'
    return ''
  }

  async function handleSubmit() {
    const err = validate()
    if (err) { setError(err); return }
    setError('')

    const notas = [
      nombre    ? `Nombre: ${nombre}`       : '',
      telefono  ? `Tel: ${telefono}`        : '',
      direccion ? `Dir: ${direccion}`       : '',
      `Método: ${metodo}`,
      `Envío: ${entrega}`,
    ].filter(Boolean).join(' | ')

    iniciarPago({
      bodegaId:       BODEGA_DEFAULT,
      metodoEnvio:    entrega,
      notas:          notas || null,
      provider:       metodo,
      items:          items.map(i => ({ productoId: i.id, cantidad: i.cantidad })),
      codigoCupon:    null,
      codigoGiftCard: null,
      ...(!token ? {
        guestEmail: email.trim() || null,
        guestPhone: telefono || null,
      } : {}),
    }, !token, metodo === 'SINPE')
  }

  function handleSinpeWhatsApp() {
    const lineas = (pagoData?._itemsSnapshot || items)
      .map(i => `• ${i.nombre ?? i.name} x${i.cantidad}`)
      .join('\n')
    const msg = encodeURIComponent(
      `Hola HotClick 👋\n\n*Comprobante SINPE Móvil*\n\n` +
      `Nombre: ${nombre || '(sin nombre)'}\n` +
      `Teléfono: ${telefono}\n` +
      (pagoData?.numeroPedido ? `Pedido: ${pagoData.numeroPedido}\n` : '') +
      `Monto: ₡${fmt(totalFinal)}\n\nProductos:\n${lineas}\n\n` +
      `_Comprobante adjunto. ¡Gracias!_`
    )
    window.open(`https://wa.me/${WHATSAPP}?text=${msg}`, '_blank')
  }

  // ── Pantalla de instrucciones SINPE / confirmación EFECTIVO ──────────────
  if (isPending || isSuccess) {
    const isSinpePend = metodo === 'SINPE' && !isSuccess

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 py-2"
      >
        {isSinpePend ? (
          <>
            <div className="rounded-2xl p-4 space-y-3"
              style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-xs font-bold" style={{ color: '#22c55e' }}>
                ¡Pedido #{pagoData?.numeroPedido ?? '—'} creado!
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-text)' }}>
                Realizá la transferencia SINPE para confirmar:
              </p>
              <div className="space-y-1.5">
                <Row label="Número" value={SINPE_NUMERO} />
                <Row label="Titular" value={SINPE_TITULAR} />
                <Row label="Monto" value={`₡${fmt(totalFinal)}`} bold />
              </div>
            </div>
            <button
              onClick={handleSinpeWhatsApp}
              className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              style={{ background: '#25d366', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.526 5.845L.057 23.882a.5.5 0 00.611.611l6.037-1.469A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.961 0-3.791-.535-5.352-1.464l-.384-.228-3.981.968.987-3.882-.25-.4A9.773 9.773 0 012.182 12C2.182 6.56 6.56 2.182 12 2.182c5.44 0 9.818 4.378 9.818 9.818 0 5.44-4.378 9.818-9.818 9.818z"/>
              </svg>
              Enviar comprobante por WhatsApp
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-xl text-xs font-medium"
              style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
            >
              Cerrar — te avisamos cuando confirmemos
            </button>
          </>
        ) : (
          // EFECTIVO confirmado o SINPE success
          <div className="rounded-2xl p-5 text-center space-y-3"
            style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <div className="text-3xl">🎉</div>
            <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>
              ¡Pedido #{pagoData?.numeroPedido ?? '—'} confirmado!
            </p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {metodo === 'EFECTIVO'
                ? 'Pagás en efectivo al recibir tu pedido.'
                : 'Pago recibido. Coordinamos la entrega pronto.'}
            </p>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-bold mt-2"
              style={{ background: 'var(--hc-accent)', color: '#fff' }}>
              Seguir viendo productos
            </button>
          </div>
        )}
      </motion.div>
    )
  }

  // ── Formulario principal ─────────────────────────────────────────────────
  return (
    <div className="space-y-4 py-1">
      {/* Resumen del carrito */}
      <div className="rounded-xl p-3 space-y-1.5"
        style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>
          Tu pedido
        </p>
        {items.slice(0, 3).map(i => (
          <div key={i.id} className="flex justify-between text-xs" style={{ color: 'var(--hc-text)' }}>
            <span className="truncate mr-2">{i.nombre ?? i.name} ×{i.cantidad}</span>
            <span className="shrink-0 font-semibold">₡{fmt((i.precioVenta ?? i.precio) * i.cantidad)}</span>
          </div>
        ))}
        {items.length > 3 && (
          <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
            +{items.length - 3} producto(s) más
          </p>
        )}
        <div className="flex justify-between pt-1 text-xs font-bold" style={{ borderTop: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
          <span>Total</span>
          <span style={{ color: 'var(--hc-accent)' }}>₡{fmt(totalFinal)}</span>
        </div>
      </div>

      {/* Método de entrega */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>
          Entrega
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'RETIRO_EN_TIENDA',  label: 'Retiro gratis',    sub: 'Coordinamos punto' },
            { value: 'ENCOMIENDA_PROPIA', label: 'Encomienda',       sub: '+₡2,500' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setEntrega(opt.value)}
              className="p-2.5 rounded-xl text-left text-xs transition-all"
              style={entrega === opt.value
                ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1.5px solid var(--hc-accent)', color: 'var(--hc-text)' }
                : { background: 'var(--hc-surface-2)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-muted)' }
              }
            >
              <p className="font-semibold">{opt.label}</p>
              <p className="text-[10px] mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Método de pago */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>
          Pago
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'SINPE',    label: 'SINPE Móvil', sub: 'Sin comisión' },
            { value: 'EFECTIVO', label: 'Efectivo',    sub: 'Contra entrega' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setMetodo(opt.value)}
              className="p-2.5 rounded-xl text-left text-xs transition-all"
              style={metodo === opt.value
                ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', border: '1.5px solid var(--hc-accent)', color: 'var(--hc-text)' }
                : { background: 'var(--hc-surface-2)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-muted)' }
              }
            >
              <p className="font-semibold">{opt.label}</p>
              <p className="text-[10px] mt-0.5">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Datos de contacto */}
      <div className="space-y-2">
        <Field label="Tu nombre" value={nombre} onChange={setNombre} placeholder="Nombre completo" required />
        <Field label="Teléfono" value={telefono} onChange={setTelefono} placeholder="8888-7777" type="tel" required />
        <Field label="Email (opcional)" value={email} onChange={setEmail} placeholder="para confirmación" type="email" />
        <AnimatePresence>
          {needsAddress && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <Field label="Dirección de entrega" value={direccion} onChange={setDireccion}
                placeholder="Provincia, cantón, señas exactas" required />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error */}
      <AnimatePresence>
        {(error || (isFailed && payError)) && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-xs px-3 py-2 rounded-lg"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error || payError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || items.length === 0}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
        style={{ background: 'var(--hc-accent)', color: '#fff' }}
      >
        {isSubmitting ? 'Procesando...' : `Confirmar pedido · ₡${fmt(totalFinal)}`}
      </button>

      <p className="text-center text-[10px]" style={{ color: 'var(--hc-muted)' }}>
        Al confirmar aceptás los términos de compra de HotClick.
      </p>
    </div>
  )
}

function Row({ label, value, bold }) {
  return (
    <div className="flex justify-between text-xs">
      <span style={{ color: 'var(--hc-muted)' }}>{label}</span>
      <span style={{ color: 'var(--hc-text)', fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  )
}
