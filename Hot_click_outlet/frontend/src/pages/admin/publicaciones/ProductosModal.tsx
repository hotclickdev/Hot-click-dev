import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { formatPrice } from '@/utils/format'
import type { Id } from '@/types/api'
import type { ProductoPublicacion } from './publicacionesHelpers'

function ProductoThumb({ producto }: { producto: ProductoPublicacion }) {
  if (producto.imagenUrl) {
    return (
      <img src={producto.imagenUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 bg-hc-surface-2" />
    )
  }
  return (
    <div className="w-9 h-9 rounded-lg bg-hc-surface-2 shrink-0 flex items-center justify-center text-hc-muted">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  )
}

type ProductosModalProps = {
  open: boolean
  searchProd: string
  onSearchProd: (value: string) => void
  productos: ProductoPublicacion[]
  seleccionados: Set<Id>
  onToggle: (id: Id) => void
  onClose: () => void
  onGenerar: () => void
  generando: boolean
}

export default function ProductosModal({
  open,
  searchProd,
  onSearchProd,
  productos,
  seleccionados,
  onToggle,
  onClose,
  onGenerar,
  generando,
}: ProductosModalProps) {
  const { t } = useTranslation()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg bg-hc-surface border border-hc-border rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-hc-border shrink-0">
              <div>
                <h3 className="text-base font-semibold text-hc-text">Seleccionar productos</h3>
                <p className="text-xs text-hc-muted mt-0.5">
                  Elige los productos para generar texto de Facebook Marketplace
                </p>
              </div>
              <button type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-hc-muted hover:text-hc-text hover:bg-hc-surface-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="px-5 py-3 border-b border-hc-border shrink-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-hc-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={searchProd}
                  onChange={(e) => onSearchProd(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full h-9 pl-9 pr-4 rounded-xl bg-hc-surface-2 border border-hc-border text-hc-text text-sm placeholder:text-hc-muted focus:outline-none focus:border-hc-primary/60"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2">
              {productos.length === 0 ? (
                <p className="text-center text-sm text-hc-muted py-8">{t('common.noData')}</p>
              ) : (
                productos.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={seleccionados.has(p.id)}
                      onChange={() => onToggle(p.id)}
                      className="w-4 h-4 rounded border-white/20 accent-[#4f7cff]"
                    />
                    <ProductoThumb producto={p} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-hc-text truncate">{p.nombre}</p>
                      <p className="text-xs text-hc-muted">
                        {(p.precioVenta ?? 0) > 0 ? formatPrice(p.precioVenta) : '—'}
                        {p.stock !== undefined && ` · ${p.stock} en stock`}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>

            <div className="px-5 py-4 border-t border-hc-border shrink-0 flex items-center justify-between gap-3">
              <span className="text-sm text-hc-muted">
                {textoSeleccionadosPublicacion(seleccionados.size)}
              </span>
              <div className="flex gap-2">
                <button type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-hc-border text-sm text-hc-muted hover:text-hc-text hover:bg-hc-surface-2 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <Button onClick={onGenerar} disabled={generando || seleccionados.size === 0}>
                  {textoBotonGenerar(generando, seleccionados.size)}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function textoSeleccionadosPublicacion(size: number) {
  if (size <= 0) return 'Ninguno seleccionado'
  const s = size === 1 ? '' : 's'
  return `${size} seleccionado${s}`
}

function textoBotonGenerar(generando: boolean, size: number): ReactNode {
  if (generando) {
    return <><Spinner size="sm" /><span className="ml-1.5">Generando...</span></>
  }
  if (size > 0) return `Generar (${size})`
  return 'Generar'
}
