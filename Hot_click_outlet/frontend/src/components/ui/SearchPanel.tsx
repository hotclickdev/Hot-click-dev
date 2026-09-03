import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSearchPanel } from './searchPanel/useSearchPanel'
import { SearchPanelBody } from './searchPanel/SearchPanelBody'
import CloseIcon from '@/components/ui/CloseIcon'

export default function SearchPanel() {
  const { t } = useTranslation()
  const panel = useSearchPanel()

  return (
    <AnimatePresence>
      {panel.searchOpen && (
        <>
          <motion.div
            key="search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={panel.close}
          />

          <div className="fixed inset-0 z-[51] flex flex-col md:block pointer-events-none">
            <motion.div
              key="search-panel"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="pointer-events-auto flex flex-col w-full md:max-w-2xl md:mx-auto md:mt-[72px] rounded-b-3xl md:rounded-3xl overflow-hidden"
              style={{
                background: 'var(--hc-surface)',
                border: '1px solid var(--hc-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
                maxHeight: '82vh',
              }}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--hc-border)' }}>
                {panel.loading ? (
                  <div className="w-5 h-5 shrink-0 rounded-full border-2 border-[#4f7cff] border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" style={{ color: 'var(--hc-muted)' }}>
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                )}
                <input
                  ref={panel.inputRef}
                  type="text"
                  value={panel.query}
                  onChange={(e) => panel.setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') panel.viewAll() }}
                  placeholder={t('search.placeholder')}
                  aria-label="Buscar productos"
                  className="flex-1 bg-transparent text-base outline-none placeholder:opacity-40"
                  style={{ color: 'var(--hc-text)' }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {panel.query && (
                  <button
                    type="button"
                    onClick={() => panel.setQuery('')}
                    className="p-1 rounded-lg transition-colors hover:bg-white/8"
                    style={{ color: 'var(--hc-muted)' }}
                    aria-label={t('search.clearSearch')}
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={panel.close}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-sm transition-colors hover:bg-white/8"
                  style={{ color: 'var(--hc-muted)' }}
                >
                  {t('search.cancel')}
                </button>
              </div>

              <SearchPanelBody {...panel} />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
