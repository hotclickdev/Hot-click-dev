import { Link } from 'react-router-dom'

const PASOS = [
  { label: 'Completar perfil', to: '/admin/mi-empresa', step: 1 },
  { label: 'Agregar un producto', to: '/admin/productos', step: 2 },
  { label: 'Activar visibilidad', to: '/admin/mi-empresa', step: 3 },
]

/** @param {{ onDismiss: () => void }} props */
export default function SetupBanner({ onDismiss }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(23,71,168,0.06)', border: '1px solid rgba(23,71,168,0.2)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#e8e8ed] mb-1">Empezá en 3 pasos</p>
          <p className="text-xs text-[#8e8e9a] mb-4">Tu negocio está listo. Completá esto para recibir tus primeros clientes.</p>
          <div className="flex flex-wrap gap-2">
            {PASOS.map(({ label, to, step }) => (
              <Link
                key={step}
                to={to}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(23,71,168,0.12)', border: '1px solid rgba(23,71,168,0.25)', color: '#7fa0ff' }}
              >
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0" style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>{step}</span>
                {label} →
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
          style={{ color: '#A7B0BC' }}
          title="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    </div>
  )
}
