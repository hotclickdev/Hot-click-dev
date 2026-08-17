import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import BotonVolver from './BotonVolver'
import TestimonioCard from './TestimonioCard'

function StarIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function GiftIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M3 12v8a2 2 0 002 2h14a2 2 0 002-2v-8" />
      <path d="M7.5 8a2.5 2.5 0 010-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 010 5" />
    </svg>
  )
}

function LockIcon({ className = 'w-12 h-12' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}

function PackageIcon({ className = 'w-12 h-12' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function ContenidoTestimonio({ token, loadingResenar, productosResenar, refetchResenar }) {
  const navigate = useNavigate()

  if (!token) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-4 flex justify-center" style={{ color: 'var(--hc-muted)' }}>
          <LockIcon />
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Iniciá sesión para dejar una reseña</p>
        <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>Solo se pueden reseñar productos que hayas comprado.</p>
        <button type="button" onClick={() => navigate('/login')}
          className="px-6 py-3 rounded-2xl text-sm font-bold"
          style={{ backgroundColor: '#f59e0b', color: '#fff' }}>
          Iniciar sesión
        </button>
      </div>
    )
  }

  if (loadingResenar) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--hc-border)', borderTopColor: '#f59e0b' }} />
        Cargando tus productos…
      </div>
    )
  }

  if (!productosResenar?.length) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-4 flex justify-center" style={{ color: 'var(--hc-muted)' }}>
          <PackageIcon />
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Sin compras registradas</p>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Los productos de pedidos entregados aparecerán aquí para que puedas reseñarlos.
        </p>
      </div>
    )
  }

  const pendientes = productosResenar.filter(p => !p.yaReseno).length
  return (
    <div className="space-y-3">
      {pendientes > 0 && (
        <p className="text-sm font-semibold px-1 mb-1" style={{ color: 'var(--hc-muted)' }}>
          {pendientes} producto{pendientes === 1 ? '' : 's'} pendiente{pendientes === 1 ? '' : 's'} de reseña
        </p>
      )}
      {productosResenar.map((p, i) => (
        <TestimonioCard key={`${p.productoId}-${i}`} p={p} onEnviado={() => refetchResenar()} />
      ))}
    </div>
  )
}

export default function VistaTestimonio({ token, volver, productosResenar, loadingResenar, refetchResenar }) {
  return (
    <motion.div key="testimonio"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}>

      <BotonVolver onClick={volver} />

      <div className="flex items-center gap-3 mb-4 p-4 rounded-2xl"
        style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
        <span style={{ color: '#f59e0b' }}><StarIcon /></span>
        <div>
          <h2 className="font-black text-lg" style={{ color: 'var(--hc-text)' }}>Dejá tu reseña</h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Una reseña por producto. Tus comentarios ayudan a otros compradores.</p>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-2xl flex items-start gap-3"
        style={{ backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <span className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }}><GiftIcon /></span>
        <div>
          <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>Beneficio por reseñar</p>
          <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Al dejar tu reseña, HotClick te contactará con un beneficio especial para tu próxima compra.
          </p>
        </div>
      </div>

      <ContenidoTestimonio
        token={token}
        loadingResenar={loadingResenar}
        productosResenar={productosResenar}
        refetchResenar={refetchResenar}
      />
    </motion.div>
  )
}
