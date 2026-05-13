import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import useCartStore from '@/store/cartStore'
import useAuthStore from '@/store/authStore'
import { usePayment } from '@/hooks/usePayment'
import { formatPrice } from '@/utils/format'

const BODEGA_DEFAULT = 1

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const { token }                   = useAuthStore()
  const navigate                    = useNavigate()
  const { estado, error, intentos, maxIntentos, iniciarPago, reintentar } = usePayment()

  const [metodoEnvio, setMetodoEnvio] = useState('RETIRO_EN_TIENDA')
  const [notas, setNotas]             = useState('')

  const costoEnvio   = metodoEnvio === 'ENVIO_A_DOMICILIO' ? 2000 : 0
  const totalFinal   = total() + costoEnvio

  if (!token) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-[#e8e8ed] text-lg mb-4">Debes iniciar sesión para pagar.</p>
          <Link to="/login" className="px-6 py-2.5 rounded-xl bg-[#4f7cff] text-white font-medium">
            Iniciar sesión
          </Link>
        </div>
      </MainLayout>
    )
  }

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-[#e8e8ed] text-lg mb-4">Tu carrito está vacío.</p>
          <Link to="/productos" className="px-6 py-2.5 rounded-xl bg-[#4f7cff] text-white font-medium">
            Ver productos
          </Link>
        </div>
      </MainLayout>
    )
  }

  const handlePagar = () => {
    const payload = {
      bodegaId:    BODEGA_DEFAULT,
      metodoEnvio,
      notas:       notas.trim() || null,
      items: items.map((i) => ({
        productoId: i.id,
        cantidad:   i.cantidad,
      })),
    }
    iniciarPago(payload)
  }

  // Estado: redirigiendo a PayXpert
  if (estado === 'redirecting') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
          <p className="text-[#e8e8ed] text-lg font-medium">Redirigiendo a la pasarela de pago segura…</p>
          <p className="text-[#8e8e9a] text-sm">No cierres esta ventana</p>
        </div>
      </MainLayout>
    )
  }

  // Estado: loading (creando sesión)
  if (estado === 'loading') {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
          <p className="text-[#e8e8ed] text-lg font-medium">Preparando tu pago…</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link to="/carrito" className="text-sm text-[#8e8e9a] hover:text-[#4f7cff] transition-colors">
            ← Volver al carrito
          </Link>
          <h1 className="text-3xl font-bold text-[#e8e8ed] mt-3">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario izquierda */}
          <div className="lg:col-span-2 space-y-6">

            {/* Método de envío */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111114] border border-white/8 rounded-2xl p-6"
            >
              <h2 className="font-semibold text-[#e8e8ed] mb-4">Método de entrega</h2>
              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
                  ${metodoEnvio === 'RETIRO_EN_TIENDA'
                    ? 'border-[#4f7cff] bg-[#4f7cff]/8'
                    : 'border-white/10 hover:border-white/20'}`}
                >
                  <input
                    type="radio"
                    name="envio"
                    value="RETIRO_EN_TIENDA"
                    checked={metodoEnvio === 'RETIRO_EN_TIENDA'}
                    onChange={() => setMetodoEnvio('RETIRO_EN_TIENDA')}
                    className="accent-[#4f7cff]"
                  />
                  <div className="flex-1">
                    <p className="text-[#e8e8ed] font-medium text-sm">Retiro en tienda</p>
                    <p className="text-[#8e8e9a] text-xs mt-0.5">Gratis · Coordinar vía WhatsApp</p>
                  </div>
                  <span className="text-[#4f7cff] font-semibold text-sm">₡0</span>
                </label>

                <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors
                  ${metodoEnvio === 'ENVIO_A_DOMICILIO'
                    ? 'border-[#4f7cff] bg-[#4f7cff]/8'
                    : 'border-white/10 hover:border-white/20'}`}
                >
                  <input
                    type="radio"
                    name="envio"
                    value="ENVIO_A_DOMICILIO"
                    checked={metodoEnvio === 'ENVIO_A_DOMICILIO'}
                    onChange={() => setMetodoEnvio('ENVIO_A_DOMICILIO')}
                    className="accent-[#4f7cff]"
                  />
                  <div className="flex-1">
                    <p className="text-[#e8e8ed] font-medium text-sm">Envío a domicilio</p>
                    <p className="text-[#8e8e9a] text-xs mt-0.5">Correos de Costa Rica · 2-3 días hábiles</p>
                  </div>
                  <span className="text-[#e8e8ed] font-semibold text-sm">{formatPrice(2000)}</span>
                </label>
              </div>
            </motion.div>

            {/* Notas opcionales */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-[#111114] border border-white/8 rounded-2xl p-6"
            >
              <h2 className="font-semibold text-[#e8e8ed] mb-4">Notas del pedido <span className="text-[#8e8e9a] font-normal text-sm">(opcional)</span></h2>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones especiales, dirección de entrega, etc."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-[#e8e8ed] placeholder-[#8e8e9a] resize-none focus:outline-none focus:border-[#4f7cff] transition-colors"
              />
            </motion.div>

            {/* Pago seguro info */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#111114] border border-white/8 rounded-2xl p-6"
            >
              <h2 className="font-semibold text-[#e8e8ed] mb-4">Pago con tarjeta</h2>
              <div className="flex flex-wrap gap-3 mb-4">
                <span className="flex items-center gap-1.5 text-xs text-[#8e8e9a] bg-white/5 px-3 py-1.5 rounded-lg">
                  <LockIcon /> Encriptación SSL
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#8e8e9a] bg-white/5 px-3 py-1.5 rounded-lg">
                  <ShieldIcon /> 3D Secure
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[#8e8e9a] bg-white/5 px-3 py-1.5 rounded-lg">
                  Visa / Mastercard / Amex
                </span>
              </div>
              <p className="text-xs text-[#8e8e9a] leading-relaxed">
                Serás redirigido a la página de pago segura de <strong className="text-[#e8e8ed]">PayXpert</strong>.
                Tus datos bancarios nunca pasan por nuestros servidores.
              </p>
            </motion.div>

            {/* Error */}
            {estado === 'failed' && error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400"
              >
                <p className="font-medium mb-1">Error al procesar el pago</p>
                <p>{error}</p>
                {intentos < maxIntentos && (
                  <button
                    onClick={handlePagar}
                    className="mt-3 text-[#4f7cff] hover:underline text-xs"
                  >
                    Intentar de nuevo ({maxIntentos - intentos} intentos restantes)
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* Resumen derecha */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky top-24 bg-[#111114] border border-white/8 rounded-2xl p-6 space-y-4"
            >
              <h2 className="font-semibold text-[#e8e8ed]">Resumen del pedido</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-[#8e8e9a]">
                    <span className="truncate mr-2">{item.nombre} ×{item.cantidad}</span>
                    <span className="shrink-0">{formatPrice((item.precio ?? item.precioVenta ?? 0) * item.cantidad)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-white/8 space-y-2 text-sm">
                <div className="flex justify-between text-[#8e8e9a]">
                  <span>Subtotal</span>
                  <span>{formatPrice(total())}</span>
                </div>
                <div className="flex justify-between text-[#8e8e9a]">
                  <span>Envío</span>
                  <span>{costoEnvio === 0 ? 'Gratis' : formatPrice(costoEnvio)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/8 flex justify-between font-bold text-[#e8e8ed]">
                <span>Total</span>
                <span className="text-lg text-[#4f7cff]">{formatPrice(totalFinal)}</span>
              </div>

              <button
                onClick={handlePagar}
                disabled={estado === 'loading' || estado === 'redirecting' || intentos >= maxIntentos}
                className="w-full py-3.5 rounded-xl bg-[#4f7cff] hover:bg-[#3d6ee0] text-white font-semibold text-sm
                           transition-all shadow-[0_0_20px_rgba(79,124,255,0.3)]
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <LockIcon />
                Pagar {formatPrice(totalFinal)}
              </button>

              <p className="text-[10px] text-[#8e8e9a] text-center leading-relaxed">
                Al hacer clic en "Pagar" aceptas nuestros términos y condiciones de compra.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

function LockIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}
