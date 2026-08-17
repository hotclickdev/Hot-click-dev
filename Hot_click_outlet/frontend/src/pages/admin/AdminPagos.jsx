import PagosHeader from './pagos/PagosHeader'
import PagosKpis from './pagos/PagosKpis'
import PagosModals from './pagos/PagosModals'
import PagosTabBar from './pagos/PagosTabBar'
import PagosTabs from './pagos/PagosTabs'
import { useAdminPagosActions } from './pagos/useAdminPagosActions'
import { useAdminPagosData } from './pagos/useAdminPagosData'

export default function AdminPagos() {
  const pagosState = useAdminPagosData()
  const {
    handleConfirmarSinpe,
    handleRechazarSinpe,
    handleAprobarComprobante,
    handleRechazarComprobante,
  } = useAdminPagosActions({
    motivoTexto: pagosState.motivoTexto,
    fetchPagos: pagosState.fetchPagos,
    fetchKpis: pagosState.fetchKpis,
    fetchComprobantes: pagosState.fetchComprobantes,
    setActionLoading: pagosState.setActionLoading,
    setCompAction: pagosState.setCompAction,
    setMotivoModal: pagosState.setMotivoModal,
    setMotivoTexto: pagosState.setMotivoTexto,
  })

  return (
    <>
      <div className="space-y-6">
        <PagosHeader
          t={pagosState.t}
          tab={pagosState.tab}
          pagos={pagosState.pagos}
          webhooks={pagosState.webhooks}
        />
        <PagosKpis kpis={pagosState.kpis} />
        <PagosTabBar
          t={pagosState.t}
          tab={pagosState.tab}
          setTab={pagosState.setTab}
          setLoadingC={pagosState.setLoadingC}
        />
        <PagosTabs
          pagosState={pagosState}
          handleConfirmarSinpe={handleConfirmarSinpe}
          handleRechazarSinpe={handleRechazarSinpe}
          handleAprobarComprobante={handleAprobarComprobante}
        />
      </div>

      <PagosModals
        imgModal={pagosState.imgModal}
        setImgModal={pagosState.setImgModal}
        motivoModal={pagosState.motivoModal}
        motivoTexto={pagosState.motivoTexto}
        setMotivoTexto={pagosState.setMotivoTexto}
        setMotivoModal={pagosState.setMotivoModal}
        handleRechazarComprobante={handleRechazarComprobante}
        compAction={pagosState.compAction}
      />
    </>
  )
}
