import ComprobantesTab from './ComprobantesTab'
import PagosTab from './PagosTab'
import WebhooksTab from './WebhooksTab'

/**
 * @param {{
 *   pagosState: object
 *   handleConfirmarSinpe: Function
 *   handleRechazarSinpe: Function
 *   handleAprobarComprobante: Function
 * }} props
 */
export default function PagosTabs({
  pagosState,
  handleConfirmarSinpe,
  handleRechazarSinpe,
  handleAprobarComprobante,
}) {
  const {
    t,
    tab,
    filtProv,
    setFiltProv,
    filtEstado,
    setFiltEstado,
    setLoadingP,
    setPagePage,
    fetchPagos,
    loadingP,
    pagos,
    actionLoading,
    pagePage,
    pageTotal,
    filtComp,
    setFiltComp,
    setLoadingC,
    setCompPage,
    fetchComprobantes,
    loadingC,
    comprobantes,
    compAction,
    setMotivoModal,
    setMotivoTexto,
    setImgModal,
    compPage,
    compTotal,
    filtProc,
    setFiltProc,
    setLoadingW,
    setWhPage,
    fetchWebhooks,
    loadingW,
    webhooks,
    whPage,
    whTotal,
  } = pagosState

  return (
    <>
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
    </>
  )
}
