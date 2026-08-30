import Pagination from './Pagination'
import Select from './Select'
import { BADGE_WH, type WebhookAdmin } from './pagosHelpers'
import type { TFunction } from 'i18next'

function TablaWebhooks({ webhooks, page, totalPages, onPage }: {
  webhooks: WebhookAdmin[]
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  return (
    <div className="bg-hc-surface border border-hc-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-hc-border bg-hc-surface-2">
              {['Token / ID evento', 'Tipo', 'IP origen', 'Estado', 'Error', 'Recibido', 'Procesado en'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-hc-muted font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {webhooks.map((w) => (
              <tr key={w.id} className="border-b border-white/5 hover:bg-hc-surface-2 transition-colors">
                <td className="px-4 py-3 font-mono text-hc-text text-[10px]" title={w.merchantToken}>
                  {w.merchantToken?.slice(0, 16)}…
                </td>
                <td className="px-4 py-3 text-hc-muted text-xs">{w.eventoTipo}</td>
                <td className="px-4 py-3 text-hc-muted text-xs">{w.ipOrigen}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BADGE_WH[w.procesado as unknown as string]}`}>
                    {w.procesado ? 'OK' : 'Error'}
                  </span>
                </td>
                <td className="px-4 py-3 text-red-400 text-xs" title={w.errorProcesamiento ?? ''}>
                  <span className="truncate block max-w-[280px]">{w.errorProcesamiento ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-hc-muted text-xs whitespace-nowrap">{w.fechaRecepcion}</td>
                <td className="px-4 py-3 text-hc-muted text-xs whitespace-nowrap">{w.procesadoEn ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  )
}

function ListaWebhooks({ t, loading, webhooks, page, totalPages, onPage }: {
  t: TFunction
  loading: boolean
  webhooks: WebhookAdmin[]
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (loading) {
    return (
      <div className="text-center py-16 text-hc-muted">{t('common.loading')}</div>
    )
  }
  if (webhooks.length === 0) {
    return (
      <div className="text-center py-16 text-hc-muted">{t('common.noData')}</div>
    )
  }
  return (
    <TablaWebhooks webhooks={webhooks} page={page} totalPages={totalPages} onPage={onPage} />
  )
}

export default function WebhooksTab({
  t,
  filtProc,
  onFiltProc,
  onRetry,
  loading,
  webhooks,
  page,
  totalPages,
  onPage,
}: {
  t: TFunction
  filtProc: string
  onFiltProc: (v: string) => void
  onRetry: () => void
  loading: boolean
  webhooks: WebhookAdmin[]
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filtProc} onChange={onFiltProc}
          options={[
            { value: '', label: 'Todos' },
            { value: 'true', label: 'Procesados' },
            { value: 'false', label: 'Con error' },
          ]} />
        <button type="button" onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-hc-surface-2 hover:bg-hc-surface-2 text-hc-muted hover:text-hc-text text-sm transition-colors">
          Actualizar
        </button>
      </div>

      <ListaWebhooks
        t={t}
        loading={loading}
        webhooks={webhooks}
        page={page}
        totalPages={totalPages}
        onPage={onPage}
      />
    </>
  )
}
