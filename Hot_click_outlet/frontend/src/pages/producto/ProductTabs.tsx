import { motion, AnimatePresence } from 'framer-motion'
import type { Producto } from '@/types/producto'
import type { TabProducto } from './productoHelpers'

function SpecsList({ texto }: { texto: string }) {
  return (
    <ul className="space-y-3">
      {texto.split('\n').filter((l) => l.trim()).map((linea, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-start gap-3 text-sm"
        >
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--hc-accent)' }} />
          <span style={{ color: 'var(--hc-text)' }}>{linea.replace(/^[-•·]\s*/, '')}</span>
        </motion.li>
      ))}
    </ul>
  )
}

function HowToList({ texto }: { texto: string }) {
  return (
    <ol className="space-y-5">
      {texto.split('\n').filter((l) => l.trim()).map((linea, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-start gap-4"
        >
          <span
            style={{ background: 'var(--hc-accent)', color: '#fff' }}
            className="shrink-0 w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
          >
            {i + 1}
          </span>
          <span className="text-sm pt-1 leading-relaxed" style={{ color: 'var(--hc-text)' }}>
            {linea.replace(/^\d+\.\s*/, '')}
          </span>
        </motion.li>
      ))}
    </ol>
  )
}

type ProductTabsProps = {
  product: Producto
  tabs: TabProducto[]
  activeTab: string | null
  onTabChange: (id: string) => void
}

export default function ProductTabs({ product, tabs, activeTab, onTabChange }: ProductTabsProps) {
  if (tabs.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="mt-5 sm:mt-12"
    >
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--hc-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{ color: activeTab === tab.id ? 'var(--hc-text)' : 'var(--hc-muted)' }}
            className="relative px-6 py-3 text-sm font-medium transition-colors hover:[color:var(--hc-text)]"
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f7cff] rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'especificaciones' && product.especificaciones?.trim() && (
          <motion.div
            key="specs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ background: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
            className="border rounded-2xl p-6"
          >
            <SpecsList texto={product.especificaciones} />
          </motion.div>
        )}

        {activeTab === 'como-usar' && product.comoUsar?.trim() && (
          <motion.div
            key="howto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ background: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
            className="border rounded-2xl p-6"
          >
            <HowToList texto={product.comoUsar} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
