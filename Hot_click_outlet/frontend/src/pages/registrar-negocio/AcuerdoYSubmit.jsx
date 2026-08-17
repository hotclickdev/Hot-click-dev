import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { A } from './registrarNegocioTheme'

/** Checkbox del Acuerdo de Vendedores, error y botón de envío. */
export default function AcuerdoYSubmit({ aceptaAcuerdo, onAceptaChange, error, loading }) {
  return (
    <>
      {/* Acuerdo de Vendedores */}
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '0.75rem', borderRadius: 10, border: `1px solid ${aceptaAcuerdo ? A.color : 'var(--hc-border)'}`, background: aceptaAcuerdo ? `${A.bg}` : 'transparent', transition: 'all 0.15s' }}>
        <input
          type="checkbox"
          checked={aceptaAcuerdo}
          onChange={onAceptaChange}
          style={{ marginTop: 2, accentColor: A.color, width: 15, height: 15, flexShrink: 0 }}
        />
        <span style={{ fontSize: 12, color: 'var(--hc-muted)', lineHeight: 1.6 }}>
          He leído y acepto el{' '}
          <Link to="/acuerdo-vendedores" target="_blank" rel="noopener noreferrer" style={{ color: A.color, textDecoration: 'none' }}>Acuerdo de Vendedores</Link>
          , reconozco mi rol como <strong style={{ color: 'var(--hc-text)' }}>Encargado de Tratamiento</strong> de datos de clientes conforme a la Ley N.° 8968 y acepto las obligaciones de confidencialidad e indemnidad estipuladas.
        </span>
      </label>

      {error && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="px-3 py-2.5 rounded-xl text-sm"
          style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb,var(--hc-danger) 7%,transparent)', border: '1px solid color-mix(in srgb,var(--hc-danger) 22%,transparent)' }}>
          {error}
        </motion.div>
      )}

      <button type="submit" disabled={loading || !aceptaAcuerdo}
        className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
        style={{ background: A.color, boxShadow: `0 0 32px ${A.ring}` }}>
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Registrando…
          </>
        ) : 'Registrar mi negocio →'}
      </button>
    </>
  )
}
