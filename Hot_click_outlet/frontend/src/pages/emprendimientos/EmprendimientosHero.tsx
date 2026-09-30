import { Link } from 'react-router-dom'
import { RUTA_EMPRENDE } from '@/utils/emprendimientoRutas'

/** Encabezado del directorio de aliados, fiel al Figma "Directorio de emprendimientos". */
export default function EmprendimientosHero() {
  return (
    <div
      style={{
        background: 'var(--hc-surface)',
        borderBottom: '1px solid var(--hc-border)',
        padding: '32px 20px 28px',
      }}
    >
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--hc-text)' }}>
          Emprendimientos
        </h1>
        <p className="text-sm sm:text-base mt-2 max-w-xl" style={{ color: 'var(--hc-muted)' }}>
          Conocé a los negocios de Costa Rica que venden en HotClick.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-5">
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
    </div>
  )
}
