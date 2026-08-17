import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import { formatPrice } from '@/utils/format'
import SmartField from './SmartField'
import { validateAddress, validatePhone } from './checkoutHelpers'

export default function ShippingSection({
  opciones,
  metodoEnvio,
  setMetodoEnvio,
  metodoPago,
  setMetodoPago,
  token,
  telefono,
  setTelefono,
  telefonoError,
  setTelefonoError,
  telefonoDirty,
  direccion,
  setDireccion,
  direccionError,
  setDireccionError,
  direccionDirty,
  setDireccionDirty,
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.deliveryMethod')}</h2>
      <div className="space-y-2">
        {opciones.map((op) => (
          <label
            key={op.value}
            className="flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200"
            style={metodoEnvio === op.value
              ? { borderColor: 'var(--hc-accent)', background: 'color-mix(in srgb, var(--hc-accent) 6%, transparent)' }
              : { borderColor: 'var(--hc-border)' }}
          >
            <input
              type="radio" name="envio" value={op.value}
              checked={metodoEnvio === op.value}
              onChange={() => {
                setMetodoEnvio(op.value)
                if (op.value === 'ENVIO_RAPIDO' && metodoPago === 'EFECTIVO') setMetodoPago('SINPE')
              }}
              className="accent-[#4f7cff]"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>{op.label}</p>
                {op.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${op.badgeColor}`}>
                    {op.badge}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{op.sub}</p>
            </div>
            <span className={`font-semibold text-sm shrink-0 ${op.precio === 0 ? 'text-[#4f7cff]' : ''}`}
              style={op.precio === 0 ? {} : { color: 'var(--hc-text)' }}>
              {op.precio === 0 ? 'Gratis' : formatPrice(op.precio)}
            </span>
          </label>
        ))}

        {/* Internacional — enlace a WhatsApp */}
        <a
          href="https://wa.me/50686667888?text=Hola%20HotClick%2C%20quiero%20realizar%20un%20env%C3%ADo%20internacional"
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:opacity-80"
          style={{ borderColor: 'var(--hc-border)', borderStyle: 'dashed' }}
        >
          <span className="text-lg">✈️</span>
          <div className="flex-1">
            <p className="font-medium text-sm" style={{ color: 'var(--hc-text)' }}>Envío Internacional</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>Disponible · Consultá precio por WhatsApp</p>
          </div>
          <span className="text-xs font-semibold" style={{ color: '#25D366' }}>Consultar →</span>
        </a>
      </div>

      {/* Domicilio fields — animate in */}
      <AnimatePresence>
        {opciones.find(o => o.value === metodoEnvio)?.needsAddress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4 overflow-hidden pt-2"
          >
            <div className="border-t" style={{ borderColor: 'var(--hc-border)' }} />
            <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
              {t('checkout.deliveryData')}
            </p>
            {token && (
              <PhoneField
                label={t('checkout.phoneContact')}
                value={telefono}
                onChange={(val) => {
                  setTelefono(val)
                  if (telefonoDirty) setTelefonoError(validatePhone(val, t))
                }}
                error={telefonoDirty ? telefonoError : ''}
                hint={t('checkout.phoneHelp')}
                required
              />
            )}
            <SmartField
              id="direccion"
              label={t('checkout.addressLabel')}
              multiline
              rows={3}
              value={direccion}
              placeholder={t('checkout.addressPlaceholder')}
              error={direccionDirty ? direccionError : ''}
              success={direccionDirty && !direccionError && direccion.trim().length >= 10}
              helpText={t('checkout.charCount', { count: direccion.length, max: 200 })}
              maxLength={200}
              onChange={(e) => {
                setDireccion(e.target.value)
                if (direccionDirty) setDireccionError(validateAddress(e.target.value, t))
              }}
              onBlur={() => { setDireccionDirty(true); setDireccionError(validateAddress(direccion, t)) }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
