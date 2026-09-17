import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import BotonVolver from './BotonVolver'
import FormularioBusqueda from './FormularioBusqueda'
import type { FormularioBusquedaProps } from './FormularioBusqueda'

function TagIcon({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

const OBJETIVO =
  'Digitalizar el inventario en tu local para que puedas vender en HOTCLICK, aunque no tengas códigos de barras ni catálogo digital.'

const BENEFICIOS = [
  'Escaneo de productos que ya tienen código de barras.',
  'SKU interno y etiqueta para productos sin código.',
  'Carga del inventario a tu catálogo HOTCLICK.',
  'Quedás listo para vender desde el local y en línea.',
]

type VistaDigitalizacionProps = Omit<FormularioBusquedaProps, 't'> & {
  volver: () => void
}

/** Vista de solicitud: digitalización y etiquetado de inventario en el local. */
export default function VistaDigitalizacion({
  volver,
  token,
  success,
  setSuccess,
  setTabBusqueda,
  form,
  setForm,
  phone,
  setPhone,
  fotos,
  setFotos,
  uploading,
  sending,
  error,
  fileRef,
  handleEnviar,
  handleFotoChange,
}: VistaDigitalizacionProps) {
  const { t } = useTranslation()

  return (
    <motion.div key="inventario"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}>

      <BotonVolver onClick={volver} />

      <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
        <span style={{ color: 'var(--hc-accent)' }}><TagIcon /></span>
        <div>
          <h2 className="font-black text-lg" style={{ color: 'var(--hc-text)' }}>
            Digitalización y etiquetado de inventario
          </h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            En tu local, con tu inventario real.
          </p>
        </div>
      </div>

      <div className="rounded-3xl p-6 sm:p-8 mb-6 space-y-5"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--hc-accent)' }}>
            Objetivo
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)' }}>
            {OBJETIVO}
          </p>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--hc-accent)' }}>
            Beneficios
          </p>
          <ul className="space-y-1.5">
            {BENEFICIOS.map(item => (
              <li key={item} className="text-sm flex gap-2 leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                <span className="shrink-0 font-bold" style={{ color: 'var(--hc-accent)' }}>·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          No modificamos códigos de fabricante. Si un producto no tiene código, usamos un SKU interno HOTCLICK.
        </p>
      </div>

      <FormularioBusqueda
        token={token}
        success={success}
        setSuccess={setSuccess}
        setTabBusqueda={setTabBusqueda}
        form={form}
        setForm={setForm}
        phone={phone}
        setPhone={setPhone}
        fotos={fotos}
        setFotos={setFotos}
        uploading={uploading}
        sending={sending}
        error={error}
        fileRef={fileRef}
        handleEnviar={handleEnviar}
        handleFotoChange={handleFotoChange}
        t={t}
        etiquetaEnviar="Solicitar servicio"
        descLabel="Contanos sobre tu negocio e inventario"
        descPh="Ej: Tienda de abarrotes en San José, ~200 productos, la mitad sin código de barras. Queremos vender en HOTCLICK."
        ocultarPresupuesto
      />
    </motion.div>
  )
}
