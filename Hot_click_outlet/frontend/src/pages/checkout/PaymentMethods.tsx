import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CardIcon, EfectivoIcon, SinpeIcon } from './checkoutIcons'
import { formatPrice } from '@/utils/format'
import type { Dispatch, SetStateAction } from 'react'

function metodosPago(metodoEnvio: string, descuentoSinpeMonto: number) {
  const badgeSinpe = descuentoSinpeMonto > 0
    ? `Ahorrás ${formatPrice(descuentoSinpeMonto)}`
    : 'Sin costo de pasarela'

  return [
    {
      id: 'TILOPAY',
      label: 'Visa / Mastercard',
      descripcion: 'Pago con tarjeta · Confirmación inmediata',
      badge: 'Pago inmediato',
      badgeColor: 'bg-[var(--hc-blue-500)]/20 text-[var(--hc-blue-400)] border-[var(--hc-blue-500)]/30',
      icon: CardIcon,
      disabled: false,
      disabledReason: '',
    },
    {
      id: 'SINPE',
      label: 'SINPE Móvil',
      descripcion: 'Transferencia directa · Se verifica en minutos',
      badge: badgeSinpe,
      badgeColor: 'bg-[var(--hc-success)]/15 text-[var(--hc-success)] border-[var(--hc-success)]/30',
      icon: SinpeIcon,
      disabled: false,
      disabledReason: '',
    },
    {
      id: 'EFECTIVO',
      label: 'Efectivo contra entrega',
      descripcion: 'Pagás en efectivo al recibir tu pedido',
      badge: 'Sin costo extra',
      badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      icon: EfectivoIcon,
      disabled: metodoEnvio === 'ENVIO_RAPIDO',
      disabledReason: 'El envío rápido requiere pago previo',
    },
  ]
}

type PaymentMethodsProps = {
  metodoEnvio: string
  metodoPago: string
  setMetodoPago: Dispatch<SetStateAction<string>>
  token: string | null
  sinpeNombre: string
  setSinpeNombre: Dispatch<SetStateAction<string>>
  sinpeNombreErr: string
  setSinpeNombreErr: Dispatch<SetStateAction<string>>
  sinpeCedula: string
  setSinpeCedula: Dispatch<SetStateAction<string>>
  sinpeCedulaErr: string
  setSinpeCedulaErr: Dispatch<SetStateAction<string>>
  sinpeTelefono: string
  setSinpeTelefono: Dispatch<SetStateAction<string>>
  sinpeEmail: string
  setSinpeEmail: Dispatch<SetStateAction<string>>
  /** Ahorro estimado vs pasarela; si > 0 muestra "Ahorrás ₡X". */
  descuentoSinpeMonto?: number
}

export default function PaymentMethods({
  metodoEnvio,
  metodoPago,
  setMetodoPago,
  token,
  sinpeNombre,
  setSinpeNombre,
  sinpeNombreErr,
  setSinpeNombreErr,
  sinpeCedula,
  setSinpeCedula,
  sinpeCedulaErr,
  setSinpeCedulaErr,
  sinpeTelefono,
  setSinpeTelefono,
  sinpeEmail,
  setSinpeEmail,
  descuentoSinpeMonto = 0,
}: PaymentMethodsProps) {
  const { t } = useTranslation()
  const METODOS_PAGO = metodosPago(metodoEnvio, descuentoSinpeMonto)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.paymentMethod')}</h2>
      <div className="space-y-3">
        {METODOS_PAGO.map((mp) => {
          const Icon = mp.icon
          const selected = metodoPago === mp.id
          return (
            <label
              key={mp.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${mp.disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'}`}
              style={selected && !mp.disabled
                ? { borderColor: 'var(--hc-accent)', boxShadow: 'inset 0 0 0 1px var(--hc-accent)', background: 'var(--hc-info-bg)' }
                : { borderColor: 'var(--hc-border)' }}
            >
              <input
                type="radio" name="pago" value={mp.id}
                checked={selected}
                disabled={mp.disabled}
                onChange={() => !mp.disabled && setMetodoPago(mp.id)}
                className="accent-[var(--hc-accent)] shrink-0"
              />
              <div className="w-10 h-7 flex items-center justify-center shrink-0">
                <Icon selected={selected} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>{mp.label}</p>
                  {mp.badge && !mp.disabled && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${mp.badgeColor}`}>
                      {mp.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{mp.descripcion}</p>
                {mp.disabled && mp.disabledReason && (
                  <p className="text-xs mt-1 text-amber-400/90">{mp.disabledReason}</p>
                )}
              </div>
              {selected && !mp.disabled && (
                <div className="w-4 h-4 rounded-full bg-[var(--hc-accent)] flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>
          )
        })}
      </div>

      {metodoPago === 'EFECTIVO' && (
        <div className="p-3 rounded-xl" style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
          <p className="text-xs leading-relaxed text-amber-300/90">
            Tenés que tener el monto exacto disponible al recibir el pedido. Nuestro repartidor no maneja cambio.
          </p>
        </div>
      )}

      <AnimatePresence>
        {metodoPago === 'SINPE' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-1">
              <div className="rounded-xl p-4 space-y-3" style={{ background: 'color-mix(in srgb, #10b981 5%, transparent)', border: '1px solid color-mix(in srgb, #10b981 20%, transparent)' }}>
                <p className="text-xs font-semibold text-emerald-400">DATOS DEL REMITENTE <span className="text-red-400 font-normal">(requerido)</span></p>

                <div className="space-y-1">
                  <label htmlFor="sinpe-nombre" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Nombre completo <span className="text-red-400">*</span></label>
                  <input
                    id="sinpe-nombre"
                    type="text"
                    value={sinpeNombre}
                    onChange={(e) => { setSinpeNombre(e.target.value); if (sinpeNombreErr) setSinpeNombreErr('') }}
                    placeholder="Ej: María González Solano"
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                    style={{ background: 'var(--hc-bg)', border: `1.5px solid ${sinpeNombreErr ? '#f87171' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                  />
                  {sinpeNombreErr && <p className="text-xs text-red-400">{sinpeNombreErr}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="sinpe-cedula" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Número de cédula <span className="text-red-400">*</span></label>
                  <input
                    id="sinpe-cedula"
                    type="text"
                    value={sinpeCedula}
                    onChange={(e) => { setSinpeCedula(e.target.value.replace(/\D/g, '')); if (sinpeCedulaErr) setSinpeCedulaErr('') }}
                    placeholder="Ej: 123456789"
                    maxLength={12}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                    style={{ background: 'var(--hc-bg)', border: `1.5px solid ${sinpeCedulaErr ? '#f87171' : 'var(--hc-border)'}`, color: 'var(--hc-text)' }}
                  />
                  {sinpeCedulaErr && <p className="text-xs text-red-400">{sinpeCedulaErr}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="sinpe-telefono" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Teléfono del SINPE</label>
                  <input
                    id="sinpe-telefono"
                    type="tel"
                    value={sinpeTelefono}
                    onChange={(e) => setSinpeTelefono(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Ej: 88887777"
                    maxLength={8}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                    style={{ background: 'var(--hc-bg)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
                  />
                </div>

                {!token && (
                  <div className="space-y-1">
                    <label htmlFor="sinpe-email" className="text-xs" style={{ color: 'var(--hc-muted)' }}>Correo electrónico</label>
                    <input
                      id="sinpe-email"
                      type="email"
                      value={sinpeEmail}
                      onChange={(e) => setSinpeEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                      style={{ background: 'var(--hc-bg)', border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)' }}
                    />
                  </div>
                )}
              </div>

              <p className="text-[11px]" style={{ color: 'var(--hc-muted)' }}>
                Al confirmar vas a ver el número destino y podés subir el comprobante.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
