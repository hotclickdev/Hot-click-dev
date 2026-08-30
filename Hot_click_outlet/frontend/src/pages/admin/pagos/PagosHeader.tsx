import ImportExportBar from '@/components/admin/ImportExportBar'
import {
  COLUMNAS_EXPORT_PAGOS,
  COLUMNAS_EXPORT_WEBHOOKS,
  filasExportPagos,
  filasExportWebhooks,
  type PagoAdmin,
  type WebhookAdmin,
} from './pagosHelpers'
import type { TFunction } from 'i18next'

export default function PagosHeader({ t, tab, pagos, webhooks }: {
  t: TFunction
  tab: string
  pagos: PagoAdmin[]
  webhooks: WebhookAdmin[]
}) {
  const exportPagos = tab === 'pagos'
  const exportData = exportPagos ? filasExportPagos(pagos) : filasExportWebhooks(webhooks)
  const exportCols = exportPagos ? COLUMNAS_EXPORT_PAGOS : COLUMNAS_EXPORT_WEBHOOKS

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <h1 className="text-2xl font-bold text-hc-text">{t('admin.pagos.title')} &amp; {t('admin.pagos.webhooks')}</h1>
      <ImportExportBar
        exportOnly
        data={exportData}
        columns={exportCols}
        filename={exportPagos ? 'pagos' : 'webhooks'}
        sheetName={exportPagos ? 'Pagos' : 'Webhooks'}
      />
    </div>
  )
}
