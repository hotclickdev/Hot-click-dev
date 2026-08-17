import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import EmpresaProfileCard from '@/components/admin/EmpresaProfileCard'
import PhotoPanel from './PhotoPanel'
import WizardProgress from './WizardProgress'
import WizardStepSwitch from './WizardStepSwitch'

function EtiquetasBanner({ etiquetas, wizardStep, isLastStep, fuenteDetalles }) {
  if (etiquetas.length === 0 || wizardStep <= 0 || isLastStep) return null
  return (
    <div className="mb-5 rounded-xl px-4 py-3 flex items-center gap-3" style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
      <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
        {etiquetas.slice(0, 5).map((e, i) => (
          <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={i === 0
              ? { backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.3)' }
              : { backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}>{e}</span>
        ))}
      </div>
      {fuenteDetalles && <span className="text-[10px] shrink-0" style={{ color: 'var(--hc-muted)', opacity: 0.8 }}>via {fuenteDetalles}</span>}
    </div>
  )
}

function ValidationBanner({ validationMsg }) {
  if (!validationMsg) return null
  return (
    <div className="mb-5 flex items-center gap-2 px-4 py-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#a8291f' }}>
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {validationMsg}
    </div>
  )
}

function WizardFooter({ wizard }) {
  const {
    wizardStep, analizando, isLastStep, saving, sinBodegas, autoSaveLabel,
    canQuickPublish, onPrev, onNext, onSave, onGuardarBorrador,
  } = wizard

  return (
    <>
      {wizardStep > 0 && !analizando && (
        <div className="mt-8 flex items-center gap-3 flex-wrap">
          <button type="button" onClick={onPrev}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm transition-colors shrink-0 hover:bg-[var(--hc-surface-2)]"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Anterior
          </button>

          {isLastStep ? (
            <Button onClick={onSave} disabled={saving || sinBodegas} className="flex-1">
              {etiquetaPublicar(saving, sinBodegas)}
            </Button>
          ) : (
            <Button onClick={onNext} className="flex-1">
              Siguiente
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Button>
          )}

          {autoSaveLabel && (
            <span className="text-xs flex items-center gap-1 shrink-0" style={{ color: '#1E7F4F' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
              </svg>
              {autoSaveLabel}
            </span>
          )}
        </div>
      )}

      {canQuickPublish && (
        <div className="mt-4 flex items-center gap-4">
          <button type="button" onClick={onSave} disabled={saving}
            className="text-sm transition-colors disabled:opacity-50" style={{ color: 'var(--hc-accent)' }}>
            {saving ? 'Publicando…' : 'Publicar ahora →'}
          </button>
          <span className="text-xs" style={{ color: 'var(--hc-muted)', opacity: 0.5 }}>·</span>
          <button type="button" onClick={onGuardarBorrador}
            className="text-sm transition-colors" style={{ color: 'var(--hc-muted)' }}>
            Guardar borrador
          </button>
        </div>
      )}
    </>
  )
}

/** Layout del wizard: aside de fotos, progreso, paso actual y pie de navegación. */
export default function WizardShell({ wizard }) {
  const { previewUrls, form, STEPS, wizardStep, etiquetas, fuenteDetalles, validationMsg, isLastStep } = wizard

  return (
    <div className="flex -mx-4 -my-4 md:-mx-6 md:-mt-6 lg:-mx-8 min-h-[calc(100vh-3.5rem)] md:min-h-screen">

      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 p-6 pt-8" style={{ borderRight: '1px solid var(--hc-border)' }}>
        <div className="flex-1">
          <PhotoPanel previews={previewUrls} imagenes={form.imagenes} />
        </div>
        <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--hc-border)' }}>
          <p className="text-[10px] mb-2" style={{ color: 'var(--hc-muted)', opacity: 0.8 }}>Creando como:</p>
          <EmpresaProfileCard />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col px-4 py-6 md:px-8 md:py-8">
        <div className="w-full max-w-lg mx-auto lg:mx-0 flex-1 flex flex-col">

          <WizardProgress step={wizardStep} steps={STEPS} />

          <div className="mt-6 mb-6">
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{STEPS[wizardStep].title}</h1>
            {STEPS[wizardStep].subtitle && (
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{STEPS[wizardStep].subtitle}</p>
            )}
          </div>

          <EtiquetasBanner etiquetas={etiquetas} wizardStep={wizardStep} isLastStep={isLastStep} fuenteDetalles={fuenteDetalles} />
          <ValidationBanner validationMsg={validationMsg} />

          <AnimatePresence mode="wait">
            <motion.div key={wizardStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}>
              <WizardStepSwitch wizard={wizard} />
            </motion.div>
          </AnimatePresence>

          <WizardFooter wizard={wizard} />

        </div>
      </div>
    </div>
  )
}

function etiquetaPublicar(saving, sinBodegas) {
  if (saving) {
    return <span className="flex items-center justify-center gap-2"><Spinner size="sm" />Publicando…</span>
  }
  if (sinBodegas) return 'Creá una bodega primero'
  return 'Publicar producto'
}
