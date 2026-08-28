import type { TFunction } from 'i18next'
import type { Dispatch, SetStateAction } from 'react'

export default function PagosTabBar({ t, tab, setTab, setLoadingC }: {
  t: TFunction
  tab: string
  setTab: Dispatch<SetStateAction<string>>
  setLoadingC: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <div className="flex gap-2 mb-6 border-b border-white/8">
      {[
        { key: 'pagos', label: t('admin.pagos.title') },
        { key: 'comprobantes', label: 'Comprobantes SINPE' },
        { key: 'webhooks', label: t('admin.pagos.webhooks') },
      ].map((tabItem) => (
        <button type="button"
          key={tabItem.key}
          onClick={() => {
            setTab(tabItem.key)
            if (tabItem.key === 'comprobantes') setLoadingC(true)
          }}
          className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
            tab === tabItem.key
              ? 'border-[#4f7cff] text-[#4f7cff]'
              : 'border-transparent text-[#8e8e9a] hover:text-[#e8e8ed]'
          }`}
        >
          {tabItem.label}
        </button>
      ))}
    </div>
  )
}
