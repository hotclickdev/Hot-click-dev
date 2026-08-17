import { useTranslation } from 'react-i18next'

export default function Pagination({ page, totalPages, onPage }) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 0}
        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] text-sm disabled:opacity-30 transition-colors"
      >
        ← {t('common.previous')}
      </button>
      <span className="text-[#8e8e9a] text-xs">{page + 1} / {totalPages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages - 1}
        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] text-sm disabled:opacity-30 transition-colors"
      >
        {t('common.next')} →
      </button>
    </div>
  )
}
