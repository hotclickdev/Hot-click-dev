import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import EmpCard from './EmpCard'

export default function EmprendimientosView({ products, convenios, loading, onBack }) {
  return (
    <motion.div key="emprendimientos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }} className="min-h-screen"
      style={{ background: 'var(--hc-bg)' }}>
      <div className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(52,211,153,0.03) 60%, transparent 100%)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs mb-5">
            <Link to="/" className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Inicio</Link>
            <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
            <button type="button" onClick={onBack} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Productos</button>
            <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
            <span className="font-semibold" style={{ color: '#10b981' }}>Emprendimientos</span>
          </nav>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>🤝</div>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>Emprendimientos</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Apoyá negocios locales de Costa Rica — cada compra cuenta</p>
            </div>
          </div>
        </div>
      </div>
      {convenios.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--hc-muted)' }}>Aliados HotClick</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {convenios.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                className="shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl"
                style={{ background: 'var(--hc-surface)', border: '1px solid rgba(16,185,129,0.22)', minWidth: '110px', boxShadow: '0 2px 12px rgba(16,185,129,0.06)' }}>
                {c.logoUrl
                  ? <img src={c.logoUrl} alt={c.nombre} className="w-10 h-10 object-contain rounded-xl" onError={e => e.target.style.display='none'} />
                  : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{(c.nombre ?? '?')[0].toUpperCase()}</div>
                }
                <p className="text-[11px] font-bold text-center leading-tight" style={{ color: 'var(--hc-text)' }}>{c.nombre}</p>
                <div className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  Activo
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm font-bold mb-4" style={{ color: 'var(--hc-text)' }}>
          {products.length > 0 ? `${products.length} productos de emprendimientos` : 'Explorá el catálogo de negocios locales'}
        </p>
        {cuerpoCatalogoEmprendimientos(loading, products)}
      </div>
    </motion.div>
  )
}

function cuerpoCatalogoEmprendimientos(loading, products) {
  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (products.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-6xl mb-4">🌱</p>
        <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>Próximamente más productos</p>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Los emprendimientos están cargando su inventario</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((p, i) => <EmpCard key={p.id} p={p} i={i} />)}
    </div>
  )
}
