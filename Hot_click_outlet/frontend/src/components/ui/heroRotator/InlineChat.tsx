import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import AIChat from '@/components/ai/AIChat'
import { isBrowser } from '@/utils/browser'
import { tStringArray } from './heroRotatorHelpers'

export type InlineChatProps = {
  initialQuery?: string | null
  accent: string
  onClose: () => void
}

/** Chat inline del hero con query inicial. */
export function InlineChat({ initialQuery, accent, onClose }: InlineChatProps) {
  const { t } = useTranslation()
  const chips = tStringArray(t, 'hero.chips')

  return (
    <motion.div
      key="inline-chat"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto px-4 flex flex-col"
      style={{ minHeight: '68vh' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <button type="button"
          onClick={onClose}
          aria-label={t('hero.back')}
          className="flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-60"
          style={{ color: 'var(--hc-muted)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {t('hero.back')}
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: accent }}
          >
            <svg className="w-4 h-4" style={{ color: '#fff' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>{t('hero.assistant')}</span>
        </div>
      </div>

      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: 'var(--hc-surface)',
          border: '1px solid var(--hc-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}
      >
        <AIChat
          context="GENERAL"
          sessionKey="tienda-home"
          chips={chips}
          placeholder={t('hero.chatPlaceholder')}
          autoQuery={initialQuery ?? null}
          maxHistoryHeight={Math.max(320, (isBrowser ? globalThis.innerHeight : 800) - 280)}
        />
      </div>
    </motion.div>
  )
}
