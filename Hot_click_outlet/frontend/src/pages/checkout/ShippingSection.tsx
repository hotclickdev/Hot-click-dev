import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import { formatPrice } from '@/utils/format'
import AvisoVariosEmprendimientos from '@/components/comprador/AvisoVariosEmprendimientos'
import SmartField from './SmartField'
import { GlobeIcon } from './checkoutIcons'
import { WHATSAPP, bodegaRetiroDePaquete, opcionesEnvio, validateAddress, validatePhone } from './checkoutHelpers'
import type { OpcionEnvio, PaqueteCheckout } from './checkoutHelpers'
import type { Dispatch, SetStateAction } from 'react'

const TEXTO_WA_INTERNACIONAL = encodeURIComponent('Hola HotClick, consulto un envío internacional.')

function EnvioInternacionalAtajo() {
  const { t } = useTranslation()
  return (
    <a
      href={`https://wa.me/${WHATSAPP}?text=${TEXTO_WA_INTERNACIONAL}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('checkout.envioInternacionalAria')}
      className="flex items-center gap-2 min-h-11 px-1 text-sm"
      style={{ color: 'var(--hc-muted)' }}
    >
      <GlobeIcon />
      <span>
        {t('checkout.envioInternacional')}
        {' — '}
        {t('checkout.envioInternacionalHint')}
      </span>
    </a>
  )
}

function PrecioOpcion({ op }: { op: OpcionEnvio }) {
  if (op.varia) {
    return <span className="font-semibold text-sm shrink-0" style={{ color: 'var(--hc-muted)' }}>Varía</span>
  }
  return (
    <span
      className="font-semibold text-sm shrink-0"
      style={{ color: op.precio === 0 ? 'var(--hc-accent)' : 'var(--hc-text)' }}
    >
      {op.precio === 0 ? 'Gratis' : formatPrice(op.precio)}
    </span>
  )
}

function OpcionesEnvioLista({
  opciones,
  metodoEnvio,
  onElegir,
}: {
  opciones: OpcionEnvio[]
  metodoEnvio: string
  onElegir: (value: string) => void
}) {
  return (
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
            onChange={() => onElegir(op.value)}
            style={{ accentColor: 'var(--hc-accent)' }}
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
          <PrecioOpcion op={op} />
        </label>
      ))}
    </div>
  )
}

function DomicilioFields({
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
}: Pick<ShippingSectionProps,
  'token' | 'telefono' | 'setTelefono' | 'telefonoError' | 'setTelefonoError' | 'telefonoDirty'
  | 'direccion' | 'setDireccion' | 'direccionError' | 'setDireccionError' | 'direccionDirty' | 'setDireccionDirty'>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
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
    </div>
  )
}

type ShippingSectionProps = {
  opciones: OpcionEnvio[]
  metodoEnvio: string
  setMetodoEnvio: Dispatch<SetStateAction<string>>
  paquetes: PaqueteCheckout[]
  metodoEnvioPorPaquete: Record<string, string>
  setMetodoEnvioPaquete: (bodegaId: string, value: string) => void
  necesitaDireccion: boolean
  metodoPago: string
  setMetodoPago: Dispatch<SetStateAction<string>>
  token: string | null
  telefono: string
  setTelefono: Dispatch<SetStateAction<string>>
  telefonoError: string
  setTelefonoError: Dispatch<SetStateAction<string>>
  telefonoDirty: boolean
  direccion: string
  setDireccion: Dispatch<SetStateAction<string>>
  direccionError: string
  setDireccionError: Dispatch<SetStateAction<string>>
  direccionDirty: boolean
  setDireccionDirty: Dispatch<SetStateAction<boolean>>
}

export default function ShippingSection({
  opciones,
  metodoEnvio,
  setMetodoEnvio,
  paquetes,
  metodoEnvioPorPaquete,
  setMetodoEnvioPaquete,
  necesitaDireccion,
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
}: ShippingSectionProps) {
  const { t } = useTranslation()
  const esMultiPaquete = paquetes.length > 1

  function elegirEnvio(value: string, bodegaId?: string) {
    if (bodegaId) setMetodoEnvioPaquete(bodegaId, value)
    else setMetodoEnvio(value)
    if (value === 'ENVIO_RAPIDO' && metodoPago === 'EFECTIVO') setMetodoPago('TILOPAY')
  }

  const domicilioFields = (
    <DomicilioFields
      token={token}
      telefono={telefono} setTelefono={setTelefono}
      telefonoError={telefonoError} setTelefonoError={setTelefonoError} telefonoDirty={telefonoDirty}
      direccion={direccion} setDireccion={setDireccion}
      direccionError={direccionError} setDireccionError={setDireccionError} direccionDirty={direccionDirty}
      setDireccionDirty={setDireccionDirty}
    />
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold" style={{ color: 'var(--hc-text)' }}>{t('checkout.deliveryMethod')}</h2>

      {esMultiPaquete ? (
        <>
          <AvisoVariosEmprendimientos cantidadNegocios={paquetes.length} />
          <div className="space-y-4">
            {paquetes.map((p, i) => {
              const opcionesPaquete = opcionesEnvio(bodegaRetiroDePaquete(p))
              return (
                <div key={p.bodegaId} className="rounded-xl p-3 space-y-2" style={{ border: '1px solid var(--hc-border)' }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                      Paquete {i + 1} · {p.bodegaNombre}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {p.items.length} {p.items.length === 1 ? 'producto' : 'productos'}
                    </p>
                  </div>
                  <OpcionesEnvioLista
                    opciones={opcionesPaquete}
                    metodoEnvio={metodoEnvioPorPaquete[p.bodegaId] ?? ''}
                    onElegir={(value) => elegirEnvio(value, p.bodegaId)}
                  />
                </div>
              )
            })}
            <EnvioInternacionalAtajo />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <OpcionesEnvioLista opciones={opciones} metodoEnvio={metodoEnvio} onElegir={(value) => elegirEnvio(value)} />
          <EnvioInternacionalAtajo />
        </div>
      )}

      {/* Domicilio fields — animate in */}
      <AnimatePresence>
        {necesitaDireccion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden pt-2"
          >
            {domicilioFields}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
