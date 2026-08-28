import ComprobanteImageModal from './ComprobanteImageModal'
import MotivoRechazoModal from './MotivoRechazoModal'
import type { Id } from '@/types/api'
import type { Dispatch, SetStateAction } from 'react'

export default function PagosModals({
  imgModal,
  setImgModal,
  motivoModal,
  motivoTexto,
  setMotivoTexto,
  setMotivoModal,
  handleRechazarComprobante,
  compAction,
}: {
  imgModal: string | null
  setImgModal: Dispatch<SetStateAction<string | null>>
  motivoModal: Id | null
  motivoTexto: string
  setMotivoTexto: Dispatch<SetStateAction<string>>
  setMotivoModal: Dispatch<SetStateAction<Id | null>>
  handleRechazarComprobante: (id: Id) => void
  compAction: Id | null
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
