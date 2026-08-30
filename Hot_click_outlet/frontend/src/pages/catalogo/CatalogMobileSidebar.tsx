import { motion, AnimatePresence } from 'framer-motion'
import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import CategorySidebar from './CategorySidebar'
import CloseIcon from '@/components/ui/CloseIcon'
import type { CatalogCategoria, CatalogCounts } from './catalogoTipos'

/**
 * Drawer móvil de categorías del catálogo.
 */
export default function CatalogMobileSidebar({
  sidebarOpen, setSidebarOpen, categories, category, setCategory, categoryTotalCount,
}: {
  sidebarOpen: boolean
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
  categories: CatalogCategoria[]
  category: string
  setCategory: Dispatch<SetStateAction<string>>
  categoryTotalCount: CatalogCounts
}) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          />
          <motion.aside
            key="sidebar-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="hc-drawer-surface fixed left-0 top-0 bottom-0 z-50 overflow-y-auto lg:hidden"
            style={{
              width: 'min(300px, 90vw)',
              background: 'var(--hc-surface)',
              borderRight: '1px solid var(--hc-border)',
              boxShadow: '8px 0 48px rgba(0,0,0,0.14)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--hc-border)' }}
            >
              <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>{t('products.filterCatalog')}</p>
              <button type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label={t('a11y.close')}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
                style={{ color: 'var(--hc-muted)' }}
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <CategorySidebar
                categories={categories}
                category={category}
                setCategory={setCategory}
                categoryTotalCount={categoryTotalCount}
                onCategorySelect={() => setSidebarOpen(false)}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
