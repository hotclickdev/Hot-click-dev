import { motion } from 'framer-motion'
import Spinner from '@/components/ui/Spinner'
import ProductCard from '@/components/ui/ProductCard'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { Producto } from '@/types/producto'

// ── Ofertas HOT — usa la ProductCard compartida con tag roja (una sola tarjeta en todo el sitio)
export default function OfertasView({ products, loading }: { products: Producto[]; loading: boolean }) {
  return (
    <motion.div key="ofertas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }} className="min-h-screen"
      style={{ background: 'var(--hc-blue-900)' }}>
      <div className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg, rgba(231,59,51,0.14) 0%, transparent 60%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <span className="shrink-0" style={{ color: 'var(--hc-red-500)', filter: 'drop-shadow(0 0 16px rgba(231,59,51,0.6))' }}>
              <TrustGlyph tipo="rayo" className="w-12 h-12" />
            </span>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: '#fff' }}>Ofertas HOT</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Los mejores precios del momento — no dejes pasar ninguno</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--hc-red-500)' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>{products.length} productos disponibles ahora</span>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(231,59,51,0.15), transparent 70%)' }} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {cuerpoCatalogoOfertas(loading, products)}
      </div>
    </motion.div>
  )
}

function cuerpoCatalogoOfertas(loading: boolean, products: Producto[]) {
  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (products.length === 0) {
    return (
      <div className="text-center py-24">
        <span className="flex justify-center mb-4 opacity-40" style={{ color: 'var(--hc-red-400)' }}>
          <TrustGlyph tipo="rayo" className="w-14 h-14" />
        </span>
        <p className="text-lg font-bold" style={{ color: '#F4F6F9' }}>Las ofertas están cargando</p>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Volvé pronto para no perder ningún precio</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} hotTag="HOT" />)}
    </div>
  )
}
