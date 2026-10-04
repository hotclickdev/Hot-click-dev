import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RUTA_SISTEMA_MARCA } from '@/utils/rutaTienda'
import { EmpresaIcon } from './perfilIcons'
import useRutaPanel from '@/app/useRutaPanel'

/** Tarjeta "Tu negocio" del emprendedor en Mi cuenta. Sin frame en Figma (el diseño de Mi cuenta es del comprador). */
export default function EmpresaCard({ empresaNombre, empresaSlug }: { empresaNombre: string; empresaSlug: string | null }) {
  const rutaPanel = useRutaPanel()
  const rutaMarca = rutaPanel === '/admin' ? RUTA_SISTEMA_MARCA : `${rutaPanel}/opciones`
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 flex items-center justify-between gap-4"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--hc-accent)', opacity: 0.15 }}>
          <EmpresaIcon />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>Tu negocio</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{empresaNombre}</p>
          {empresaSlug && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--hc-muted)' }}>/{empresaSlug}</p>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          to={rutaMarca}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          Configurar marca
        </Link>
        <Link
          to={rutaPanel}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        >
          Ir al panel
        </Link>
      </div>
    </motion.div>
  )
}
