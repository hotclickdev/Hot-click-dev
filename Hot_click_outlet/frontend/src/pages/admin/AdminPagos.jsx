import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { useToast } from '@/components/ui/Toast'
import { paymentService } from '@/services/paymentService'
import ComprobanteImageModal from './pagos/ComprobanteImageModal'
import ComprobantesTab from './pagos/ComprobantesTab'
import KpiCard from './pagos/KpiCard'
import MotivoRechazoModal from './pagos/MotivoRechazoModal'
import PagosTab from './pagos/PagosTab'
import WebhooksTab from './pagos/WebhooksTab'
import {
  COLUMNAS_EXPORT_PAGOS,
  COLUMNAS_EXPORT_WEBHOOKS,
  filasExportPagos,
  filasExportWebhooks,
  queryPagos,
  queryWebhooks,
} from './pagos/pagosHelpers'
import { useAdminPagosActions } from './pagos/useAdminPagosActions'

export default function AdminPagos() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [tab, setTab] = useState('pagos')

  const [pagos, setPagos] = useState([])
  const [kpis, setKpis] = useState(null)
  const [filtProv, setFiltProv] = useState('')
  const [filtEstado, setFiltEstado] = useState('')
  const [pagePage, setPagePage] = useState(0)
  const [pageTotal, setPageTotal] = useState(0)
  const [loadingP, setLoadingP] = useState(true)

  const [webhooks, setWebhooks] = useState([])
  const [filtProc, setFiltProc] = useState('')
  const [whPage, setWhPage] = useState(0)
  const [whTotal, setWhTotal] = useState(0)
  const [loadingW, setLoadingW] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const [comprobantes, setComprobantes] = useState([])
  const [filtComp, setFiltComp] = useState('PENDIENTE')
  const [compPage, setCompPage] = useState(0)
  const [compTotal, setCompTotal] = useState(0)
  const [loadingC, setLoadingC] = useState(false)
  const [compAction, setCompAction] = useState(null)
  const [motivoModal, setMotivoModal] = useState(null)
  const [motivoTexto, setMotivoTexto] = useState('')
  const [imgModal, setImgModal] = useState(null)

  const fetchKpis = useCallback(async () => {
    try {
      const { data } = await paymentService.kpisAdmin()
      setKpis(data)
    } catch {
      showToast(t('common.error'), 'error')
    }
  }, [showToast, t])

  const fetchPagos = useCallback(async () => {
    setLoadingP(true)
    try {
      const { data } = await paymentService.listarAdmin(queryPagos({
        page: pagePage,
        proveedor: filtProv,
        estadoPago: filtEstado,
      }))
      setPagos(data.content ?? [])
      setPageTotal(data.totalPages ?? 0)
    } catch {
      showToast(t('common.error'), 'error')
      setPagos([])
    } finally {
      setLoadingP(false)
    }
  }, [pagePage, filtProv, filtEstado, showToast, t])

  const fetchWebhooks = useCallback(async () => {
    setLoadingW(true)
    try {
      const { data } = await paymentService.listarWebhooks(queryWebhooks({
        page: whPage,
        procesado: filtProc,
      }))
      setWebhooks(data.content ?? [])
      setWhTotal(data.totalPages ?? 0)
    } catch {
      showToast(t('common.error'), 'error')
      setWebhooks([])
    } finally {
      setLoadingW(false)
    }
  }, [whPage, filtProc, showToast, t])

  const fetchComprobantes = useCallback(async () => {
    setLoadingC(true)
    try {
      const { data } = await paymentService.listarComprobantes(filtComp, compPage)
      setComprobantes(data.content ?? [])
      setCompTotal(data.totalPages ?? 0)
    } catch {
      showToast(t('common.error'), 'error')
      setComprobantes([])
    } finally {
      setLoadingC(false)
    }
  }, [filtComp, compPage, showToast, t])

  useEffect(() => {
    let cancelado = false
    paymentService.kpisAdmin()
      .then(({ data }) => { if (!cancelado) setKpis(data) })
      .catch(() => { if (!cancelado) showToast(t('common.error'), 'error') })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  useEffect(() => {
    let cancelado = false
    paymentService.listarAdmin(queryPagos({
      page: pagePage,
      proveedor: filtProv,
      estadoPago: filtEstado,
    }))
      .then(({ data }) => {
        if (cancelado) return
        setPagos(data.content ?? [])
        setPageTotal(data.totalPages ?? 0)
      })
      .catch(() => {
        if (cancelado) return
        showToast(t('common.error'), 'error')
        setPagos([])
      })
      .finally(() => { if (!cancelado) setLoadingP(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros de página
  }, [pagePage, filtProv, filtEstado])

  useEffect(() => {
    let cancelado = false
    paymentService.listarWebhooks(queryWebhooks({
      page: whPage,
      procesado: filtProc,
    }))
      .then(({ data }) => {
        if (cancelado) return
        setWebhooks(data.content ?? [])
        setWhTotal(data.totalPages ?? 0)
      })
      .catch(() => {
        if (cancelado) return
        showToast(t('common.error'), 'error')
        setWebhooks([])
      })
      .finally(() => { if (!cancelado) setLoadingW(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros de webhooks
  }, [whPage, filtProc])

  useEffect(() => {
    if (tab !== 'comprobantes') return
    let cancelado = false
    paymentService.listarComprobantes(filtComp, compPage)
      .then(({ data }) => {
        if (cancelado) return
        setComprobantes(data.content ?? [])
        setCompTotal(data.totalPages ?? 0)
      })
      .catch(() => {
        if (cancelado) return
        showToast(t('common.error'), 'error')
        setComprobantes([])
      })
      .finally(() => { if (!cancelado) setLoadingC(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab comprobantes
  }, [tab, filtComp, compPage])

  const {
    handleConfirmarSinpe,
    handleRechazarSinpe,
    handleAprobarComprobante,
    handleRechazarComprobante,
  } = useAdminPagosActions({
    motivoTexto,
    fetchPagos,
    fetchKpis,
    fetchComprobantes,
    setActionLoading,
    setCompAction,
    setMotivoModal,
    setMotivoTexto,
  })

  const exportPagos = tab === 'pagos'
  const exportData = exportPagos ? filasExportPagos(pagos) : filasExportWebhooks(webhooks)
  const exportCols = exportPagos ? COLUMNAS_EXPORT_PAGOS : COLUMNAS_EXPORT_WEBHOOKS

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-[#e8e8ed]">{t('admin.pagos.title')} &amp; {t('admin.pagos.webhooks')}</h1>
          <ImportExportBar
            exportOnly
            data={exportData}
            columns={exportCols}
            filename={exportPagos ? 'pagos' : 'webhooks'}
            sheetName={exportPagos ? 'Pagos' : 'Webhooks'}
          />
        </div>

        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total pagos" value={kpis.total} />
            <KpiCard label="Tasa de éxito" value={`${kpis.tasaExito}%`} color="text-green-400" />
            <KpiCard label="Pendientes" value={kpis.pendientes} color="text-yellow-400" />
            <KpiCard label="Webhooks con error" value={kpis.webhooksErr} color={kpis.webhooksErr > 0 ? 'text-red-400' : 'text-green-400'} />
          </div>
        )}

        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Capturados" value={kpis.capturados} color="text-green-400" />
            <KpiCard label="Fallidos" value={kpis.fallidos} color="text-red-400" />
            <KpiCard label="SINPE" value={kpis.sinpe} color="text-emerald-400" />
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-white/8">
          {[
            { key: 'pagos', label: t('admin.pagos.title') },
            { key: 'comprobantes', label: 'Comprobantes SINPE' },
            { key: 'webhooks', label: t('admin.pagos.webhooks') },
          ].map((tabItem) => (
            <button
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

        {tab === 'pagos' && (
          <PagosTab
            t={t}
            filtProv={filtProv}
            filtEstado={filtEstado}
            onFiltProv={(v) => { setLoadingP(true); setFiltProv(v); setPagePage(0) }}
            onFiltEstado={(v) => { setLoadingP(true); setFiltEstado(v); setPagePage(0) }}
            onRetry={fetchPagos}
            loading={loadingP}
            pagos={pagos}
            actionLoading={actionLoading}
            onConfirmar={handleConfirmarSinpe}
            onRechazar={handleRechazarSinpe}
            page={pagePage}
            totalPages={pageTotal}
            onPage={(p) => { setLoadingP(true); setPagePage(p) }}
          />
        )}

        {tab === 'comprobantes' && (
          <ComprobantesTab
            t={t}
            filtComp={filtComp}
            onFiltComp={(v) => { setLoadingC(true); setFiltComp(v); setCompPage(0) }}
            onRetry={fetchComprobantes}
            loading={loadingC}
            comprobantes={comprobantes}
            compAction={compAction}
            onAprobar={handleAprobarComprobante}
            onAbrirRechazo={(id) => { setMotivoModal(id); setMotivoTexto('') }}
            onAmpliar={setImgModal}
            page={compPage}
            totalPages={compTotal}
            onPage={(p) => { setLoadingC(true); setCompPage(p) }}
          />
        )}

        {tab === 'webhooks' && (
          <WebhooksTab
            t={t}
            filtProc={filtProc}
            onFiltProc={(v) => { setLoadingW(true); setFiltProc(v); setWhPage(0) }}
            onRetry={fetchWebhooks}
            loading={loadingW}
            webhooks={webhooks}
            page={whPage}
            totalPages={whTotal}
            onPage={(p) => { setLoadingW(true); setWhPage(p) }}
          />
        )}
      </div>

      {imgModal && (
        <ComprobanteImageModal src={imgModal} onClose={() => setImgModal(null)} />
      )}

      {motivoModal !== null && (
        <MotivoRechazoModal
          motivoTexto={motivoTexto}
          onMotivoChange={setMotivoTexto}
          onCancel={() => { setMotivoModal(null); setMotivoTexto('') }}
          onConfirm={() => handleRechazarComprobante(motivoModal)}
          loading={compAction === motivoModal}
        />
      )}
    </>
  )
}
