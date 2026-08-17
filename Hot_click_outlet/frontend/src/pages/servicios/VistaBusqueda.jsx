import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import BotonVolver from './BotonVolver'
import FormularioBusqueda from './FormularioBusqueda'
import ListaSolicitudes from './ListaSolicitudes'

function SearchIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

/** Vista de búsqueda de producto: encabezado, tabs, formulario y solicitudes. */
export default function VistaBusqueda({
  token, tabBusqueda, setTabBusqueda, success, setSuccess,
  form, setForm, phone, setPhone, fotos, setFotos,
  uploading, sending, error, fileRef,
  handleEnviar, handleFotoChange, volver,
  misSolicitudes, loadingMias, refetchMias,
}) {
  const { t } = useTranslation()

  return (
    <motion.div key="busqueda"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}>

      <BotonVolver onClick={volver} />

      <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
        <span style={{ color: 'var(--hc-accent)' }}><SearchIcon className="w-8 h-8" /></span>
        <div>
          <h2 className="font-black text-lg" style={{ color: 'var(--hc-text)' }}>Buscar producto por ti</h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Describí o enviá fotos y te lo conseguimos.</p>
        </div>
      </div>

      {token && (
        <div className="flex gap-1 mb-6 p-1 rounded-2xl" style={{ backgroundColor: 'var(--hc-surface)' }}>
          {[{ key: 'solicitar', label: '+ Nueva solicitud' }, { key: 'mis-solicitudes', label: 'Mis solicitudes' }].map(tb => (
            <button type="button" key={tb.key} onClick={() => setTabBusqueda(tb.key)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200"
              style={{
                backgroundColor: tabBusqueda === tb.key ? 'var(--hc-accent)' : 'transparent',
                color: tabBusqueda === tb.key ? '#fff' : 'var(--hc-muted)',
              }}>
              {tb.label}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {tabBusqueda === 'solicitar' && (
          <motion.div key="form-b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FormularioBusqueda
              token={token} success={success} setSuccess={setSuccess} setTabBusqueda={setTabBusqueda}
              form={form} setForm={setForm} phone={phone} setPhone={setPhone}
              fotos={fotos} setFotos={setFotos} uploading={uploading} sending={sending} error={error}
              fileRef={fileRef} handleEnviar={handleEnviar} handleFotoChange={handleFotoChange} t={t}
            />
          </motion.div>
        )}

        {tabBusqueda === 'mis-solicitudes' && token && (
          <motion.div key="mis-b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ListaSolicitudes
              misSolicitudes={misSolicitudes} loadingMias={loadingMias}
              refetchMias={refetchMias} setTabBusqueda={setTabBusqueda} t={t}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
