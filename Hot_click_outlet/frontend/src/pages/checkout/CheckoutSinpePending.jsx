import { motion } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import { formatPrice } from '@/utils/format'
import { WhatsAppIcon } from './checkoutIcons'
import { SINPE_NUMERO, SINPE_TITULAR } from './checkoutHelpers'

export default function CheckoutSinpePending({
  pagoData,
  totalFinal,
  sinpeNombre,
  sinpeCedula,
  sinpeTelefono,
  sinpeImagen,
  setSinpeImagen,
  sinpeImagenErr,
  setSinpeImagenErr,
  sinpeUploadEstado,
  setSinpeUploadEstado,
  sinpeUploadError,
  setSinpeUploadError,
  sinpeInputRef,
  onSubirComprobante,
  onSinpeWhatsApp,
}) {
  const esEfectivo = pagoData?.proveedor === 'EFECTIVO'
  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 py-14">
        <CheckoutStepper activeStep="checkout" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-7 space-y-6 mt-8"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>
                {esEfectivo ? '¡Pedido registrado!' : 'Pedido registrado — realizá tu SINPE'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                {esEfectivo
                  ? 'Pagás en efectivo cuando recibas tu pedido — monto exacto'
                  : 'Transferí el monto exacto y subí la foto del comprobante'}
              </p>
            </div>
          </div>

          {/* Efectivo contra entrega — pantalla simplificada */}
          {esEfectivo && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="rounded-xl p-5 space-y-3" style={{ background: 'color-mix(in srgb, #f59e0b 6%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
                <p className="text-xs font-semibold text-amber-400">DETALLES DEL PAGO</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--hc-muted)' }}>💵 Método</span>
                  <span className="font-semibold text-amber-300">Efectivo contra entrega</span>
                </div>
                {pagoData?.numeroPedido && (
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: 'var(--hc-muted)' }}>🔖 Pedido</span>
                    <span className="font-mono font-semibold text-[#4f7cff]">{pagoData.numeroPedido}</span>
                  </div>
                )}
                <div className="border-t pt-3" style={{ borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold" style={{ color: 'var(--hc-muted)' }}>💰 Monto EXACTO a pagar</span>
                    <span className="font-bold text-2xl text-amber-300">{formatPrice(totalFinal)}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2.5 p-3.5 rounded-xl" style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}>
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs leading-relaxed text-emerald-300/90">
                  Nuestro repartidor llevará tu pedido y cobrará el monto exacto en efectivo. Te avisamos por WhatsApp antes de salir.
                </p>
              </div>
              <button
                onClick={onSinpeWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/18"
              >
                <WhatsAppIcon />
                Notificar también por WhatsApp
              </button>
              <a href="/mis-pedidos" className="block text-xs text-center text-[#4f7cff] hover:underline mt-1">
                Ver mis pedidos →
              </a>
            </motion.div>
          )}

          {/* SINPE flow — solo si no es efectivo */}
          {!esEfectivo && <>

          {/* Datos del remitente */}
          <div className="rounded-xl p-4 space-y-1.5 text-sm" style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-muted)' }}>TUS DATOS DE TRANSFERENCIA</p>
            {sinpeNombre   && <div className="flex justify-between"><span style={{ color: 'var(--hc-muted)' }}>👤 Nombre</span><span style={{ color: 'var(--hc-text)' }}>{sinpeNombre}</span></div>}
            {sinpeCedula   && <div className="flex justify-between"><span style={{ color: 'var(--hc-muted)' }}>🪪 Cédula</span><span style={{ color: 'var(--hc-text)' }}>{sinpeCedula}</span></div>}
            {sinpeTelefono && <div className="flex justify-between"><span style={{ color: 'var(--hc-muted)' }}>📞 Teléfono</span><span style={{ color: 'var(--hc-text)' }}>{sinpeTelefono}</span></div>}
          </div>

          {/* SINPE Info card */}
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'color-mix(in srgb, #10b981 6%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}>
            <p className="text-xs font-semibold text-emerald-400">REALIZÁ LA TRANSFERENCIA A:</p>
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--hc-muted)' }}>📱 Número SINPE</span>
              <span className="font-bold text-xl tracking-widest text-emerald-300">{SINPE_NUMERO}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--hc-muted)' }}>👤 Titular</span>
              <span className="font-medium" style={{ color: 'var(--hc-text)' }}>{SINPE_TITULAR}</span>
            </div>
            {pagoData?.numeroPedido && (
              <div className="flex justify-between items-center text-sm">
                <span style={{ color: 'var(--hc-muted)' }}>🔖 Referencia</span>
                <span className="font-mono font-semibold text-[#4f7cff]">{pagoData.numeroPedido}</span>
              </div>
            )}
            <div className="border-t pt-3" style={{ borderColor: 'color-mix(in srgb, #10b981 20%, transparent)' }}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ color: 'var(--hc-muted)' }}>💰 Monto EXACTO</span>
                <span className="font-bold text-2xl text-emerald-300">{formatPrice(totalFinal)}</span>
              </div>
            </div>
          </div>

          {/* Subir comprobante obligatorio */}
          {sinpeUploadEstado !== 'done' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">!</span>
                <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                  Subir comprobante <span className="text-red-400">*</span>
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                Adjuntá una foto o captura del comprobante SINPE. Solo imágenes (JPG, PNG, WebP).
              </p>

              <input
                ref={sinpeInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                onChange={(e) => {
                  setSinpeImagen(e.target.files?.[0] ?? null)
                  setSinpeImagenErr('')
                  setSinpeUploadEstado('idle')
                  setSinpeUploadError('')
                }}
              />
              <button
                onClick={() => sinpeInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-medium transition-all border-dashed border-2"
                style={sinpeImagen
                  ? { borderColor: '#10b981', background: 'rgba(16,185,129,0.08)', color: '#10b981' }
                  : { borderColor: sinpeImagenErr ? '#f87171' : 'var(--hc-border)', color: sinpeImagenErr ? '#f87171' : 'var(--hc-muted)' }}
              >
                {sinpeImagen ? (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {sinpeImagen.name}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Seleccionar imagen del comprobante
                  </>
                )}
              </button>
              {sinpeImagenErr && <p className="text-xs text-red-400">{sinpeImagenErr}</p>}

              {/* Preview de imagen seleccionada */}
              {sinpeImagen && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--hc-border)' }}>
                  <img
                    src={URL.createObjectURL(sinpeImagen)}
                    alt="Vista previa del comprobante"
                    className="w-full max-h-48 object-contain bg-black/20"
                  />
                </div>
              )}

              {sinpeUploadError && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {sinpeUploadError}
                </p>
              )}

              <button
                onClick={onSubirComprobante}
                disabled={sinpeUploadEstado === 'uploading'}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: 'var(--hc-accent)', color: '#fff' }}
              >
                {sinpeUploadEstado === 'uploading' ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Subiendo comprobante…</>
                ) : (
                  <><svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Enviar comprobante</>
                )}
              </button>
            </div>
          ) : (
            /* Estado: comprobante subido con éxito */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-5 space-y-3 text-center"
              style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-bold text-emerald-400">¡Comprobante recibido!</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                Un administrador verificará tu pago y activará tu pedido. Te avisamos por correo.
              </p>
              <button
                onClick={onSinpeWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/18"
              >
                <WhatsAppIcon />
                Notificar también por WhatsApp
              </button>
              <a href="/mis-pedidos" className="block text-xs text-[#4f7cff] hover:underline mt-1">
                Ver mis pedidos →
              </a>
            </motion.div>
          )}

          {/* Nota — solo para SINPE */}
          {!esEfectivo && (
            <div className="flex gap-2.5 p-3.5 rounded-xl" style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
              <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs leading-relaxed text-amber-300/90">
                Tu pago será <strong>verificado por un administrador</strong>. El pedido expira en 72 horas si no se confirma.
              </p>
            </div>
          )}
          </>}
        </motion.div>
      </div>
    </MainLayout>
  )
}
