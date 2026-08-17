import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import BotonVolver from './BotonVolver'
import GarantiaCard from './GarantiaCard'

function ShieldIcon({ className = 'w-8 h-8' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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

function ResumenGarantias({ misGarantias }) {
  const activas = misGarantias.filter(g => g.activa).length
  const vencidas = misGarantias.length - activas
  return (
    <div className="flex gap-3 mb-2">
      <div className="flex-1 text-center p-3 rounded-2xl"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
        <p className="text-2xl font-black" style={{ color: 'var(--hc-accent)' }}>{activas}</p>
        <p className="text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>Activa{activas === 1 ? '' : 's'}</p>
      </div>
      {vencidas > 0 && (
        <div className="flex-1 text-center p-3 rounded-2xl"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="text-2xl font-black" style={{ color: 'var(--hc-muted)' }}>{vencidas}</p>
          <p className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Vencida{vencidas === 1 ? '' : 's'}</p>
        </div>
      )}
    </div>
  )
}

function ContenidoGarantia({ token, loadingGarantias, misGarantias, onReportado }) {
  const navigate = useNavigate()

  if (!token) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-4 flex justify-center" style={{ color: 'var(--hc-muted)' }}>
          <LockIcon />
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Iniciá sesión para ver tus garantías</p>
        <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>Tus garantías activas aparecen vinculadas a tu cuenta.</p>
        <button onClick={() => navigate('/login')}
          className="px-6 py-3 rounded-2xl text-sm font-bold"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          Iniciar sesión
        </button>
      </div>
    )
  }

  if (loadingGarantias) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--hc-muted)' }}>
        <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-4"
          style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        Cargando garantías…
      </div>
    )
  }

  if (!misGarantias?.length) {
    return (
      <div className="text-center py-16 rounded-3xl"
        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="mb-4 flex justify-center" style={{ color: 'var(--hc-muted)' }}>
          <ShieldIcon className="w-12 h-12" />
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: 'var(--hc-text)' }}>Sin garantías registradas</p>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Los productos comprados con garantía aparecerán aquí una vez entregados.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResumenGarantias misGarantias={misGarantias} />
      {misGarantias.map((g, i) => (
        <GarantiaCard
          key={`${g.productoId}-${i}`}
          g={g}
          onReportado={onReportado}
        />
      ))}
      <p className="text-xs text-center pt-2" style={{ color: 'var(--hc-muted)' }}>
        ¿Problema con un producto?{' '}
        <a href="https://wa.me/50686667888" target="_blank" rel="noopener noreferrer"
          className="font-semibold" style={{ color: 'var(--hc-accent)' }}>
          Contactanos por WhatsApp
        </a>
      </p>
    </div>
  )
}

export default function VistaGarantia({ token, volver, misGarantias, loadingGarantias, onReportado }) {
  return (
    <motion.div key="garantia"
      initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.3 }}>

      <BotonVolver onClick={volver} />

      <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
        <span style={{ color: 'var(--hc-accent)' }}><ShieldIcon /></span>
        <div>
          <h2 className="font-black text-lg" style={{ color: 'var(--hc-text)' }}>Garantía de productos</h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Estado de garantía de tus productos HotClick.
          </p>
        </div>
      </div>

      <ContenidoGarantia
        token={token}
        loadingGarantias={loadingGarantias}
        misGarantias={misGarantias}
        onReportado={onReportado}
      />
    </motion.div>
  )
}
