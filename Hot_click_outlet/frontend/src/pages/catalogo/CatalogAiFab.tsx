import { useTranslation } from 'react-i18next'
import IconoAsistente from '@/components/ai/IconoAsistente'
import useChatStore from '@/store/chatStore'

/**
 * Botón lateral: abre el mismo ChatModal del marketplace (sessionKey catálogo).
 */
export default function CatalogAiFab() {
  const { t } = useTranslation()
  const isOpen = useChatStore(s => s.isOpen)
  const open = useChatStore(s => s.open)
  const close = useChatStore(s => s.close)

  return (
    <button type="button"
      onClick={() => (isOpen ? close() : open())}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-4 px-1.5 rounded-r-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
      style={{
        background: isOpen ? 'rgba(255,255,255,0.12)' : 'var(--hc-accent)',
        color: '#fff',
        border: isOpen ? '1px solid rgba(255,255,255,0.2)' : 'none',
        backdropFilter: isOpen ? 'blur(8px)' : 'none',
      }}
      aria-label={isOpen ? t('chat.close') : t('chat.open')}
    >
      <span
        className="inline-flex"
        style={{ animation: isOpen ? 'none' : 'hc-fab-pulse 2s ease-in-out infinite' }}
        aria-hidden="true"
      >
        <IconoAsistente className="w-3.5 h-3.5" />
      </span>
      <span style={{
        writingMode: 'vertical-lr',
        transform: 'rotate(180deg)',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}>{t('chat.fabLabel')}</span>
      <style>{`@keyframes hc-fab-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.15)}}`}</style>
    </button>
  )
}
