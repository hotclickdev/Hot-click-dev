import { Link } from 'react-router-dom'
import { RUTA_EMPRENDE } from '@/utils/emprendimientoRutas'

/** Empty state del directorio de aliados. */
export default function EmprendimientosVacio() {
  return (
    <div style={{ textAlign: 'center', padding: 80 }}>
      <svg
        className="w-12 h-12 mx-auto mb-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        viewBox="0 0 24 24"
        style={{ color: 'var(--hc-muted)' }}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>Próximamente</p>
      <p style={{ fontSize: 14, color: 'var(--hc-muted)', marginTop: 8 }}>
        Estamos cerrando convenios con emprendimientos de Costa Rica.
      </p>
      <Link
        to={RUTA_EMPRENDE}
        className="inline-flex items-center justify-center mt-6 px-5 py-3 rounded-xl text-sm font-semibold min-h-[44px]"
        style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
      >
        Emprender en HotClick
      </Link>
    </div>
  )
}
