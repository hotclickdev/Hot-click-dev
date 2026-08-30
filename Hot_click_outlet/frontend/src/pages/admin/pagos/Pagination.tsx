import { useTranslation } from 'react-i18next'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function Pagination({ page, totalPages, onPage }: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-hc-border">
      <button type="button"
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="px-3 py-1.5 rounded-lg bg-hc-surface-2 hover:bg-hc-surface-2 text-hc-muted text-sm disabled:opacity-30 transition-colors"
      >
        <TextoFlecha dir="atras">{t('common.previous')}</TextoFlecha>
      </button>
      <span className="text-hc-muted text-xs">{page + 1} / {totalPages}</span>
      <button type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages - 1}
        className="px-3 py-1.5 rounded-lg bg-hc-surface-2 hover:bg-hc-surface-2 text-hc-muted text-sm disabled:opacity-30 transition-colors"
      >
        <TextoFlecha>{t('common.next')}</TextoFlecha>
      </button>
    </div>
  )
}
