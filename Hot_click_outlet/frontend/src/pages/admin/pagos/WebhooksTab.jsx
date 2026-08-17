import Pagination from './Pagination'
import Select from './Select'
import { BADGE_WH } from './pagosHelpers'

function TablaWebhooks({ webhooks, page, totalPages, onPage }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[860px]">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              {['Token / ID evento', 'Tipo', 'IP origen', 'Estado', 'Error', 'Recibido', 'Procesado en'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[#8e8e9a] font-medium text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {webhooks.map((w) => (
              <tr key={w.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-4 py-3 font-mono text-[#e8e8ed] text-[10px]" title={w.merchantToken}>
                  {w.merchantToken?.slice(0, 16)}…
                </td>
                <td className="px-4 py-3 text-[#8e8e9a] text-xs">{w.eventoTipo}</td>
                <td className="px-4 py-3 text-[#8e8e9a] text-xs">{w.ipOrigen}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BADGE_WH[w.procesado]}`}>
                    {w.procesado ? 'OK' : 'Error'}
                  </span>
                </td>
                <td className="px-4 py-3 text-red-400 text-xs" title={w.errorProcesamiento ?? ''}>
                  <span className="truncate block max-w-[280px]">{w.errorProcesamiento ?? '—'}</span>
                </td>
                <td className="px-4 py-3 text-[#8e8e9a] text-xs whitespace-nowrap">{w.fechaRecepcion}</td>
                <td className="px-4 py-3 text-[#8e8e9a] text-xs whitespace-nowrap">{w.procesadoEn ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  )
}

function ListaWebhooks({ t, loading, webhooks, page, totalPages, onPage }) {
  if (loading) {
    return (
      <div className="text-center py-16 text-[#8e8e9a]">{t('common.loading')}</div>
    )
  }
  if (webhooks.length === 0) {
    return (
      <div className="text-center py-16 text-[#8e8e9a]">{t('common.noData')}</div>
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
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/8 text-[#8e8e9a] hover:text-[#e8e8ed] text-sm transition-colors">
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
