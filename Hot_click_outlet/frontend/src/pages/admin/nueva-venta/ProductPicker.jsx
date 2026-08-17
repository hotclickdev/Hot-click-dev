import { useTranslation } from 'react-i18next'
import Input from '@/components/ui/Input'
import { formatPrice } from '@/utils/format'

/**
 * @param {{
 *   search: string
 *   onSearch: (v: string) => void
 *   productos: object[]
 *   onAdd: (producto: object) => void
 * }} props
 */
export default function ProductPicker({ search, onSearch, productos, onAdd }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{t('admin.sales.products')}</h2>
      <Input placeholder={t('common.search')} value={search} onChange={(e) => onSearch(e.target.value)} />
      <div className="h-72 overflow-y-auto space-y-1.5 pr-1">
        {productos.length === 0 ? (
          <p className="text-sm text-[#8e8e9a] text-center py-8">{t('common.noData')}</p>
        ) : productos.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => onAdd(p)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/3 hover:bg-white/6 border border-white/8 rounded-xl text-left transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#e8e8ed] truncate">{p.nombre}</p>
              <p className="text-xs text-[#8e8e9a]">Stock: {p.stock}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className="text-sm font-semibold text-[#4f7cff]">{formatPrice(p.precio)}</span>
              <span className="w-6 h-6 rounded-lg bg-[#4f7cff]/20 text-[#4f7cff] text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">+</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
