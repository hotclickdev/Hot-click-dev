import { motion, AnimatePresence } from 'framer-motion'
import { A, ESTADO_COLOR } from './registrarNegocioTheme'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { CSSProperties, Dispatch, SetStateAction } from 'react'
import type { ContribuyenteHacienda } from './registrarNegocioTypes'

/** Bloque opcional de verificación de inscripción en Hacienda CR. */
export default function HaciendaVerificacion({
  cedula, setCedula, setHaciendaResult, setHaciendaError, setDeclaraInscrito,
  verificando, haciendaResult, haciendaError, declaraInscrito, onVerificar,
}: {
  cedula: string
  setCedula: Dispatch<SetStateAction<string>>
  setHaciendaResult: Dispatch<SetStateAction<ContribuyenteHacienda | null>>
  setHaciendaError: Dispatch<SetStateAction<string>>
  setDeclaraInscrito: Dispatch<SetStateAction<boolean>>
  verificando: boolean
  haciendaResult: ContribuyenteHacienda | null
  haciendaError: string
  declaraInscrito: boolean
  onVerificar: () => void
}) {
  const estadoInfo = haciendaResult ? (ESTADO_COLOR[haciendaResult.estadoInscripcion as string] ?? ESTADO_COLOR.NO_ENCONTRADO) : null

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>
        Inscripción en Hacienda CR (opcional)
      </p>
      <p className="text-xs" style={{ color: 'var(--hc-muted)', lineHeight: 1.6 }}>
        Si tu negocio está inscrito en Tributación Directa, verificalo acá para habilitar facturación electrónica en el futuro.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Cédula / RUC (sin guiones)"
          value={cedula}
          onChange={e => { setCedula(e.target.value); setHaciendaResult(null); setHaciendaError(''); setDeclaraInscrito(false) }}
          className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none focus:ring-2"
          style={{
            background: 'var(--hc-surface)',
            border: '1px solid var(--hc-border)',
            color: 'var(--hc-text)',
            '--tw-ring-color': A.ring,
          } as CSSProperties}
        />
        <button
          type="button"
          onClick={onVerificar}
          disabled={verificando || !cedula.trim()}
          className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
          style={{ background: '#1e40af', minWidth: 80 }}
        >
          {verificando ? (
            <svg className="w-4 h-4 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : 'Verificar'}
        </button>
      </div>

      {haciendaError && (
        <p className="text-xs" style={{ color: 'var(--hc-danger)' }}>{haciendaError}</p>
      )}

      <AnimatePresence>
        {haciendaResult && estadoInfo && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-lg p-3 flex flex-col gap-1.5"
            style={{ background: estadoInfo.bg, border: `1px solid ${estadoInfo.border}` }}>
            <div className="flex items-center gap-2" style={{ color: estadoInfo.text }}>
              <TrustGlyph
                tipo={haciendaResult.inscrito ? 'check' : 'error'}
                className="w-4 h-4 flex-shrink-0"
              />
              <span className="text-xs font-bold" style={{ color: estadoInfo.text }}>
                {estadoInfo.label}
              </span>
            </div>
            {haciendaResult.nombre && (
              <p className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>{haciendaResult.nombre}</p>
            )}
            {haciendaResult.regimen && (
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Régimen: {haciendaResult.regimen}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {haciendaResult?.inscrito && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={declaraInscrito}
            onChange={e => setDeclaraInscrito(e.target.checked)}
            style={{ marginTop: 2, accentColor: '#1e40af', width: 14, height: 14, flexShrink: 0 }}
          />
          <span style={{ fontSize: 11, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
            Declaro que estoy inscrito en Tributación Directa y que el número de identificación corresponde a mi negocio.
          </span>
        </label>
      )}
    </div>
  )
}
