import { Link } from 'react-router-dom'
import { RUTA_EMPRENDE } from '@/utils/emprendimientoRutas'

/** Hero del directorio de aliados: apunta al hub Emprender. */
export default function EmprendimientosHero() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--hc-surface) 0%, var(--hc-surface-2) 100%)',
        borderBottom: '1px solid var(--hc-border)',
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 100,
          background: 'var(--hc-surface-3)', border: '1px solid var(--hc-border)',
          fontSize: 12, fontWeight: 700, color: 'var(--hc-accent)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16,
        }}
      >
        Convenios HotClick
      </span>
      <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--hc-text)', margin: '0 0 12px' }}>
        Aliados
      </h1>
      <p style={{ fontSize: 16, color: 'var(--hc-muted)', maxWidth: 520, margin: '0 auto 20px' }}>
        Negocios ticos con convenio. Para crear el tuyo o crecer, usá Emprender.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to={RUTA_EMPRENDE}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          Emprender en HotClick
        </Link>
        <Link
          to="/registro-empresa"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
        >
          Crear mi negocio
        </Link>
      </div>
    </div>
  )
}
