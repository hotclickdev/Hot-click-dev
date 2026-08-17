import ComprobanteImageModal from './ComprobanteImageModal'
import MotivoRechazoModal from './MotivoRechazoModal'

/**
 * @param {{
 *   imgModal: string | null
 *   setImgModal: Function
 *   motivoModal: number | null
 *   motivoTexto: string
 *   setMotivoTexto: Function
 *   setMotivoModal: Function
 *   handleRechazarComprobante: Function
 *   compAction: number | null
 * }} props
 */
export default function PagosModals({
  imgModal,
  setImgModal,
  motivoModal,
  motivoTexto,
  setMotivoTexto,
  setMotivoModal,
  handleRechazarComprobante,
  compAction,
}) {
  return (
    <>
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
