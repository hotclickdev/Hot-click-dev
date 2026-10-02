import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSearchPanel } from './searchPanel/useSearchPanel'
import { SearchPanelBody } from './searchPanel/SearchPanelBody'
import CloseIcon from '@/components/ui/CloseIcon'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import useUiStore from '@/store/uiStore'

function IconoAtras() {
  return (
    <svg className="size-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

/** Búsqueda activa (Figma `8:163`): pantalla completa en móvil y panel desplegable en desktop. */
export default function SearchPanel() {
  const { t } = useTranslation()
  const dialogoRef = useRef<HTMLDivElement>(null)
  // El campo recibe el foco desde `useSearchPanel`; aquí Tab no sale del panel y al cerrar vuelve al disparador.
  const abierto = useUiStore((s) => s.searchOpen)
  useFocusTrap(dialogoRef, abierto, 'ninguno')
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
            className="fixed inset-0 z-50 hidden bg-hc-n-900/50 md:block"
            onClick={panel.close}
          />
          <div className="pointer-events-none fixed inset-0 z-[51] flex flex-col md:block">
            <motion.div
              key="search-panel"
              ref={dialogoRef}
              role="dialog"
              aria-modal="true"
              aria-label={t('search.dialogLabel')}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="pointer-events-auto flex h-full w-full flex-col bg-hc-n-0 md:mx-auto md:mt-[72px] md:h-auto md:max-h-[82vh] md:max-w-2xl md:rounded-[16px] md:border md:border-hc-n-200 md:shadow-[0_24px_60px_rgba(20,23,28,0.18)]"
            >
              <div className="flex items-center gap-[10px] py-3 pl-3 pr-4">
                <button type="button" onClick={panel.close} aria-label={t('search.back')} className="-m-1 p-1 text-hc-n-900">
                  <IconoAtras />
                </button>
                <div className="flex flex-1 items-center gap-2 rounded-[12px] border-2 border-hc-blue-600 bg-hc-n-0 py-[10px] pl-3 pr-2">
                  <input
                    ref={panel.inputRef}
                    type="search"
                    value={panel.query}
                    onChange={(e) => panel.setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') panel.viewAll() }}
                    placeholder={t('search.placeholder')}
                    aria-label={t('search.inputLabel')}
                    className="hc-input-libre min-w-0 flex-1 bg-transparent text-[15px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {panel.loading && <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-hc-blue-600 border-t-transparent" aria-hidden="true" />}
                  {panel.query && (
                    <button type="button" onClick={() => panel.setQuery('')} aria-label={t('search.clearSearch')} className="shrink-0 text-hc-n-600">
                      <CloseIcon className="size-[18px]" />
                    </button>
                  )}
                </div>
              </div>
              <SearchPanelBody {...panel} />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
