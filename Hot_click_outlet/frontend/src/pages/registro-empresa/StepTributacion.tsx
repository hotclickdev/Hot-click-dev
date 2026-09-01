import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { STEP_MOTION } from './registroEmpresaHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'
import TrustGlyph from '@/components/ui/TrustGlyph'
import { WHATSAPP_HOTCLICK, urlWhatsApp } from '@/pages/carrito/cartHelpers'

const MENSAJE_WA_TRIBUTACION =
  'Hola HotClick, quiero vender pero aún no estoy inscrito en Tributación Directa. ¿Me ayudan con el proceso de inscripción?'

const HREF_WA_TRIBUTACION = urlWhatsApp(encodeURIComponent(MENSAJE_WA_TRIBUTACION), WHATSAPP_HOTCLICK)

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

function IconoAyuda() {
  return (
    <svg className="w-10 h-10 mx-auto mb-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  )
}

function IconoWhatsApp() {
  return (
    <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function PreguntaTributacion({ onInscrito, onNoInscrito }: { onInscrito: () => void; onNoInscrito: () => void }) {
  return (
    <motion.div key="s0" {...STEP_MOTION} className="space-y-4">
      <div className="rounded-xl p-4" style={{ background: 'rgba(63,108,222,0.06)', border: '1px solid rgba(63,108,222,0.18)' }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>
          ¿Por qué es necesario?
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Para vender en HotClick debés estar inscrito en <strong>Tributación Directa (ATV)</strong> y poder emitir <strong>facturas electrónicas</strong> según la normativa del Ministerio de Hacienda de Costa Rica.
        </p>
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        ¿Estás inscrito en Tributación Directa (ATV)?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" onClick={onInscrito}
          className="flex flex-col items-center gap-2 rounded-xl p-4 min-h-[44px] transition-all duration-200 hover:scale-[1.02]"
          style={{ border: '2px solid rgba(34,197,94,0.35)', background: 'rgba(34,197,94,0.06)', cursor: 'pointer', color: 'var(--hc-success, #22c55e)' }}>
          <IconoCheck />
          <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Sí, estoy inscrito</span>
          <span className="text-xs text-center leading-tight" style={{ color: 'var(--hc-muted)' }}>
            Hacé clic para continuar con el pre-registro de tu negocio
          </span>
        </button>
        <button type="button" onClick={onNoInscrito}
          className="flex flex-col items-center gap-2 rounded-xl p-4 min-h-[44px] transition-all duration-200 hover:scale-[1.02]"
          style={{ border: '2px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)', cursor: 'pointer', color: 'var(--hc-danger)' }}>
          <IconoCruz />
          <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>No estoy inscrito</span>
          <span className="text-xs text-center leading-tight" style={{ color: 'var(--hc-muted)' }}>
            Contactanos y te ayudamos con el proceso de inscripción
          </span>
        </button>
      </div>
    </motion.div>
  )
}

function AyudaTributacion({ onVolver }: { onVolver: () => void }) {
  return (
    <motion.div key="s0-ayuda"
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="space-y-4">
      <div className="rounded-xl p-5 text-center" style={{ background: 'rgba(63,108,222,0.06)', border: '1px solid rgba(63,108,222,0.18)', color: 'var(--hc-accent, #3f6cde)' }}>
        <IconoAyuda />
        <p className="text-sm font-bold mb-2" style={{ color: 'var(--hc-text)' }}>
          Te ayudamos a inscribirte
        </p>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Todavía no podés completar el registro: para vender en HotClick necesitás estar inscrito en <strong>Tributación Directa (ATV)</strong> y poder emitir facturas electrónicas. Nuestro equipo te acompaña en el proceso de inscripción.
        </p>
      </div>

      <a
        href={HREF_WA_TRIBUTACION}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] transition-opacity hover:opacity-90"
        style={{ background: '#22c55e', color: '#fff', textDecoration: 'none' }}
      >
        <IconoWhatsApp />
        Escribinos por WhatsApp
      </a>

      <Link
        to="/contacto"
        className="flex items-center justify-center gap-1.5 w-full rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] transition-colors"
        style={{ border: '1px solid var(--hc-border)', background: 'var(--hc-surface-2)', color: 'var(--hc-text)', textDecoration: 'none' }}
      >
        Ir a contacto
        <TrustGlyph tipo="adelante" className="w-3.5 h-3.5" />
      </Link>

      <button type="button" onClick={onVolver} className="hc-btn hc-btn-outline w-full">
        <TextoFlecha dir="atras">Volver a la pregunta</TextoFlecha>
      </button>
    </motion.div>
  )
}

export default function StepTributacion({
  tributacion, onInscrito, onNoInscrito, onVolver,
}: {
  tributacion: boolean | null
  onInscrito: () => void
  onNoInscrito: () => void
  onVolver: () => void
}) {
  if (tributacion === false) {
    return <AyudaTributacion onVolver={onVolver} />
  }
  return <PreguntaTributacion onInscrito={onInscrito} onNoInscrito={onNoInscrito} />
}
