import { motion } from 'framer-motion'
import { STEP_MOTION } from './registroEmpresaHelpers'

function IconoCheck() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  )
}

function IconoCruz() {
  return (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

function IconoBloqueo() {
  return (
    <svg className="w-10 h-10 mx-auto mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  )
}

function PreguntaTributacion({ onInscrito, onNoInscrito }) {
  return (
    <motion.div key="s0" {...STEP_MOTION} className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: 'rgba(63,108,222,0.06)', border: '1px solid rgba(63,108,222,0.18)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>
          ¿Por qué es necesario?
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Para vender en HotClick debés poder emitir <strong>facturas electrónicas</strong> según la normativa del Ministerio de Hacienda de Costa Rica. Esto requiere estar inscrito en <strong>Tributación Directa</strong> (ATV).
        </p>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        ¿Estás inscrito en Tributación Directa (ATV)?
      </p>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onInscrito}
          className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
          style={{ border: '2px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.06)', cursor: 'pointer', color: 'var(--hc-success, #22c55e)' }}>
          <IconoCheck />
          <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Sí, estoy inscrito</span>
          <span className="text-xs text-center leading-tight" style={{ color: 'var(--hc-muted)' }}>Tengo usuario en ATV y puedo emitir facturas</span>
        </button>
        <button type="button" onClick={onNoInscrito}
          className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]"
          style={{ border: '2px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)', cursor: 'pointer', color: 'var(--hc-danger)' }}>
          <IconoCruz />
          <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>No estoy inscrito</span>
          <span className="text-xs text-center leading-tight" style={{ color: 'var(--hc-muted)' }}>Aún no tengo usuario en ATV</span>
        </button>
      </div>
    </motion.div>
  )
}

function BloqueoTributacion({ onVolver }) {
  return (
    <motion.div key="s0-blocked"
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-4">
      <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', color: 'var(--hc-danger, #ef4444)' }}>
        <IconoBloqueo />
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--hc-danger, #ef4444)' }}>
          No podés registrarte aún
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Para vender en HotClick necesitás estar inscrito en <strong>Tributación Directa (ATV)</strong> del Ministerio de Hacienda. Esto es obligatorio para emitir facturas electrónicas a tus clientes.
        </p>
      </div>
      <div className="rounded-xl p-4" style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--hc-text)' }}>Cómo inscribirte:</p>
        <ol className="text-xs space-y-1.5" style={{ color: 'var(--hc-muted)', paddingLeft: 16, listStyleType: 'decimal' }}>
          <li>Ingresá al portal <strong>ATV de Hacienda</strong> (atv.hacienda.go.cr)</li>
          <li>Creá tu usuario con tu cédula física o jurídica</li>
          <li>Inscribite en el régimen tributario correspondiente</li>
          <li>Una vez inscrito, regresá aquí para registrar tu empresa</li>
        </ol>
      </div>
      <button type="button" onClick={onVolver} className="hc-btn hc-btn-outline w-full">
        ← Volver a la pregunta
      </button>
    </motion.div>
  )
}

export default function StepTributacion({ tributacion, onInscrito, onNoInscrito, onVolver }) {
  if (tributacion === false) {
    return <BloqueoTributacion onVolver={onVolver} />
  }
  return <PreguntaTributacion onInscrito={onInscrito} onNoInscrito={onNoInscrito} />
}
