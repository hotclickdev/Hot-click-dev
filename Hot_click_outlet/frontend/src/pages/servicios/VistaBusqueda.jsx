import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import BotonVolver from './BotonVolver'
import EstadoBadge from './EstadoBadge'
import Field from './Field'
import { MAX_FOTOS, inputStyle } from './serviciosHelpers'

function SearchIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CheckIcon({ className = 'w-14 h-14' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ClipboardIcon({ className = 'w-12 h-12' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  )
}

function ChatIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function SendIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function ClockIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </svg>
  )
}

function WarnIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function RefreshIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  )
}

function fotosDeSolicitud(fotosUrls) {
  try { return fotosUrls ? JSON.parse(fotosUrls) : [] } catch { return [] }
}

function FormularioBusqueda({
  token, success, setSuccess, setTabBusqueda, form, setForm, phone, setPhone,
  fotos, setFotos, uploading, sending, error, fileRef, handleEnviar, handleFotoChange, t,
}) {
  if (success) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-5 flex justify-center" style={{ color: 'var(--hc-accent)' }}>
          <CheckIcon />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--hc-text)' }}>
          {t('serviciosPage.successTitle')}
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--hc-muted)' }}>
          {t('serviciosPage.successSub2')}
        </p>
        <button onClick={() => { setSuccess(false); setTabBusqueda(token ? 'mis-solicitudes' : 'solicitar') }}
          className="px-8 py-3 rounded-2xl text-sm font-bold"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          {token ? t('serviciosPage.viewMine') : t('serviciosPage.newRequestBtn')}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleEnviar} className="rounded-3xl p-6 sm:p-8 space-y-6"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <Field label={t('serviciosPage.descLabelFull')} required>
        <textarea rows={4} placeholder={t('serviciosPage.descPhFull')}
          value={form.descripcion}
          onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
          style={{ ...inputStyle, resize: 'none' }} />
      </Field>

      <Field label={t('serviciosPage.photosLabelFull')} hint="Máx. 3 · hasta 5 MB c/u">
        <div className="flex flex-wrap gap-3">
          {fotos.map((f, i) => (
            <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ border: '1.5px solid var(--hc-border)' }}>
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => setFotos(p => p.filter((_, x) => x !== i))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center font-bold leading-none">×</button>
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <motion.button type="button" onClick={() => fileRef.current?.click()}
              disabled={uploading} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold flex-shrink-0"
              style={{ border: '2px dashed var(--hc-border)', color: 'var(--hc-muted)' }}>
              {uploading
                ? <div className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                : <><span className="text-3xl leading-none" style={{ color: 'var(--hc-accent)' }}>+</span><span>Foto</span></>
              }
            </motion.button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFotoChange} />
        <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--hc-muted)' }}>
          <ClockIcon /> Respuesta en menos de 24 horas
        </p>
      </Field>

      <Field label={t('serviciosPage.budgetLabelFull')} hint="Opcional">
        <input type="text" placeholder={t('serviciosPage.budgetPhFull')}
          value={form.presupuesto}
          onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))}
          style={inputStyle} />
      </Field>

      <PhoneField label="Número de teléfono" value={phone} onChange={setPhone} required hint="Te avisamos por WhatsApp" />

      {!token && (
        <Field label="Tu nombre" hint="Opcional">
          <input type="text" placeholder="Ej: María García"
            value={form.nombreContacto}
            onChange={e => setForm(f => ({ ...f, nombreContacto: e.target.value }))}
            style={inputStyle} />
        </Field>
      )}

      {error && (
        <p className="text-sm px-4 py-3 rounded-2xl bg-red-500/10 text-red-400 font-medium flex items-center gap-2">
          <WarnIcon /> {error}
        </p>
      )}

      <motion.button type="submit" disabled={sending || uploading}
        whileHover={{ scale: sending ? 1 : 1.02 }} whileTap={{ scale: 0.97 }}
        className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
        {sending
          ? <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              {t('serviciosPage.sending')}
            </span>
          : <span className="flex items-center justify-center gap-2">
              <SendIcon /> {t('serviciosPage.submit')}
            </span>
        }
      </motion.button>
    </form>
  )
}

function ListaSolicitudes({ misSolicitudes, loadingMias, refetchMias, setTabBusqueda, t }) {
  if (loadingMias) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        {t('serviciosPage.loading')}
      </div>
    )
  }

  if (!misSolicitudes?.length) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-4 flex justify-center" style={{ color: 'var(--hc-muted)' }}>
          <ClipboardIcon />
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Sin solicitudes aún</p>
        <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>Creá una solicitud y te buscamos el producto.</p>
        <button onClick={() => setTabBusqueda('solicitar')}
          className="px-6 py-3 rounded-2xl text-sm font-bold"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          Nueva solicitud
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => refetchMias()}
          className="text-xs px-3 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>
          <RefreshIcon /> Actualizar
        </button>
      </div>
      {misSolicitudes.map(s => {
        const fotosS = fotosDeSolicitud(s.fotosUrls)
        const hasNote = s.notasAdmin?.trim()
        return (
          <div key={s.id} className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--hc-surface)', border: `1px solid ${hasNote ? 'rgba(23,71,168,0.35)' : 'var(--hc-border)'}` }}>
            {hasNote && (
              <div className="px-5 py-3 flex items-start gap-2"
                style={{ backgroundColor: 'rgba(23,71,168,0.1)', borderBottom: '1px solid rgba(23,71,168,0.2)' }}>
                <span className="shrink-0 mt-0.5" style={{ color: 'var(--hc-accent)' }}><ChatIcon /></span>
                <div>
                  <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--hc-accent)' }}>Respuesta de HotClick</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)' }}>{s.notasAdmin}</p>
                </div>
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <EstadoBadge estado={s.estado} />
                <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                  {new Date(s.fechaCreacion).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="mb-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Tu solicitud</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-text)' }}>{s.descripcion}</p>
              </div>
              {s.presupuesto && (
                <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
                  {t('serviciosPage.budgetShowLabel')} {s.presupuesto}
                </p>
              )}
              {fotosS.length > 0 && (
                <div className="flex gap-2">
                  {fotosS.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover"
                      style={{ border: '1px solid var(--hc-border)' }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
            <button key={tb.key} onClick={() => setTabBusqueda(tb.key)}
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
