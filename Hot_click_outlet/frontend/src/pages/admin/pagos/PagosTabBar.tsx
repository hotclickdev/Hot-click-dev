import type { TFunction } from 'i18next'
import type { Dispatch, SetStateAction } from 'react'

export default function PagosTabBar({ t, tab, setTab, setLoadingC }: {
  t: TFunction
  tab: string
  setTab: Dispatch<SetStateAction<string>>
  setLoadingC: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <div className="flex gap-2 mb-6 border-b border-hc-border">
      {[
        { key: 'pagos', label: t('admin.pagos.title') },
        { key: 'comprobantes', label: t('admin.pagos.comprobantesSinpe') },
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
              ? 'border-hc-primary text-hc-link'
              : 'border-transparent text-hc-muted hover:text-hc-text'
          }`}
        >
          {tabItem.label}
        </button>
      ))}
    </div>
  )
}
