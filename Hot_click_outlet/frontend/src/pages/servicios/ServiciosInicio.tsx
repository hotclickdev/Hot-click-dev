import { motion } from 'framer-motion'
import ServiceCardImage from './ServiceCardImage'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { VistaServicios } from './serviciosHelpers'

function SearchIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ShieldIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

function StarIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function TagIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function FlechaCard() {
  return (
    <div className="absolute bottom-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1"
      style={{ backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)' }}>
      <TrustGlyph tipo="adelante" className="w-4 h-4 text-white" />
    </div>
  )
}

function SparkleIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  )
}

export function ServiciosHero() {
  return (
    <section className="pt-8 sm:pt-12 pb-10 px-4 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(23,71,168,0.1) 0%, transparent 70%)' }} />
      <motion.div className="relative max-w-xl mx-auto"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold mb-5 tracking-wide uppercase"
          style={{ backgroundColor: 'rgba(23,71,168,0.15)', color: 'var(--hc-accent)', border: '1px solid rgba(23,71,168,0.3)' }}>
          <SparkleIcon /> Servicios HOT
        </span>
        <h1 className="text-3xl sm:text-5xl font-black mb-3 leading-tight" style={{ color: 'var(--hc-text)' }}>
          ¿En qué te podemos{' '}
          <span style={{ color: 'var(--hc-accent)' }}>ayudar?</span>
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
          Tocá el servicio que necesitás.
        </p>
      </motion.div>
    </section>
  )
}

export default function ServiciosInicio({ irA }: { irA: (destino: VistaServicios) => void }) {
  return (
    <motion.div key="inicio"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className="grid sm:grid-cols-2 gap-5">

      <motion.button
        whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => irA('busqueda')}
        className="text-left rounded-3xl overflow-hidden relative group cursor-pointer"
        style={{ border: '1px solid rgba(23,71,168,0.2)', backgroundColor: 'var(--hc-surface)' }}>

        <div className="relative h-44 overflow-hidden">
          <ServiceCardImage type="busqueda" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(23,71,168,0.85) 0%, rgba(23,71,168,0.2) 50%, transparent 100%)' }} />
          <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <SearchIcon className="w-6 h-6" />
          </div>
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(23,71,168,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            Gratis
          </span>
          <FlechaCard />
        </div>

        <div className="p-5">
          <h3 className="font-black text-lg mb-1.5 leading-tight" style={{ color: 'var(--hc-text)' }}>
            Buscar producto por ti
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            Describí o enviá una foto del producto que buscás y nosotros lo conseguimos.
          </p>
        </div>
      </motion.button>

      <motion.button
        whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => irA('garantia')}
        className="text-left rounded-3xl overflow-hidden relative group cursor-pointer"
        style={{ border: '1px solid rgba(23,71,168,0.2)', backgroundColor: 'var(--hc-surface)' }}>

        <div className="relative h-44 overflow-hidden">
          <ServiceCardImage type="garantia" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(23,71,168,0.88) 0%, rgba(23,71,168,0.2) 50%, transparent 100%)' }} />
          <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <ShieldIcon className="w-6 h-6" />
          </div>
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(23,71,168,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            Incluida
          </span>
          <FlechaCard />
        </div>

        <div className="p-5">
          <h3 className="font-black text-lg mb-1.5 leading-tight" style={{ color: 'var(--hc-text)' }}>
            Garantía de productos
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            Revisá la garantía activa de los productos que compraste en HotClick.
          </p>
        </div>
      </motion.button>

      <motion.button
        whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => irA('inventario')}
        className="text-left rounded-3xl overflow-hidden relative group cursor-pointer sm:col-span-2"
        style={{ border: '1px solid rgba(23,71,168,0.2)', backgroundColor: 'var(--hc-surface)' }}>

        <div className="relative h-44 overflow-hidden">
          <ServiceCardImage type="inventario" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(23,71,168,0.88) 0%, rgba(23,71,168,0.2) 50%, transparent 100%)' }} />
          <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <TagIcon className="w-6 h-6" />
          </div>
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(23,71,168,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            En tu local
          </span>
          <FlechaCard />
        </div>

        <div className="p-5">
          <h3 className="font-black text-lg mb-1.5 leading-tight" style={{ color: 'var(--hc-text)' }}>
            Digitalización y etiquetado de inventario
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            Digitalizamos tu inventario en el local, aunque no tengas códigos de barras ni catálogo digital.
          </p>
        </div>
      </motion.button>

      <motion.button
        whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        onClick={() => irA('testimonio')}
        className="text-left rounded-3xl overflow-hidden relative group cursor-pointer sm:col-span-2"
        style={{ border: '1px solid rgba(245,158,11,0.2)', backgroundColor: 'var(--hc-surface)' }}>

        <div className="relative h-44 overflow-hidden">
          <ServiceCardImage type="resena" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(180,83,9,0.88) 0%, rgba(245,158,11,0.2) 50%, transparent 100%)' }} />
          <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <StarIcon className="w-6 h-6" />
          </div>
          <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: 'rgba(180,83,9,0.9)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            Beneficio
          </span>
          <FlechaCard />
        </div>

        <div className="p-5">
          <h3 className="font-black text-lg mb-1.5 leading-tight" style={{ color: 'var(--hc-text)' }}>
            Dejá tu reseña
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
            Compartí tu experiencia con productos que compraste. Una reseña por producto, con beneficio en tu próxima compra.
          </p>
        </div>
      </motion.button>

    </motion.div>
  )
}
