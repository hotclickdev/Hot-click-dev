import CheckoutLoading from './CheckoutLoading'
import CheckoutSinpePending from './CheckoutSinpePending'
import PagoRevisado from './PagoRevisado'
import type { useComprobanteSinpe } from './useComprobanteSinpe'
import { numeroCompraVisible, type DatosCompra } from './validacionCompra'

type ResultadoSinpeProps = {
  pagoData: { numeroPedido?: string; proveedor?: string; total?: number } | null
  comprobante: ReturnType<typeof useComprobanteSinpe>
  datos: DatosCompra
  total: number
  cantidadPaquetes: number
  esInvitado: boolean
  /** El cliente eligió el comprobante en el paso de pago; se está subiendo solo. */
  subidaAutomatica: boolean
}

/**
 * Tras crear un pedido SINPE o en efectivo: «pago revisado» si el comprobante ya subió;
 * si no, la pantalla pendiente para subirlo o coordinar el efectivo.
 */
export default function ResultadoSinpe({
  pagoData, comprobante, datos, total, cantidadPaquetes, esInvitado, subidaAutomatica,
}: ResultadoSinpeProps) {
  const esEfectivo = pagoData?.proveedor === 'EFECTIVO'
  if (!esEfectivo && comprobante.subida === 'done') {
    return (
      <PagoRevisado
        numeroPedido={numeroCompraVisible(pagoData?.numeroPedido, cantidadPaquetes)}
        cantidadPaquetes={cantidadPaquetes}
        esInvitado={esInvitado}
      />
    )
  }
  const subiendo = comprobante.subida === 'idle' || comprobante.subida === 'uploading'
  if (!esEfectivo && subidaAutomatica && subiendo) return <CheckoutLoading estado="loading" />

  return (
    <CheckoutSinpePending
      pagoData={pagoData}
      totalFinal={total}
      sinpeNombre={datos.nombre}
      sinpeCedula=""
      sinpeTelefono={datos.telefono}
      sinpeImagen={comprobante.archivo}
      setSinpeImagen={comprobante.setOtroArchivo}
      sinpeImagenErr={comprobante.imagenErr}
      setSinpeImagenErr={comprobante.setImagenErr}
      sinpeUploadEstado={comprobante.subida}
      setSinpeUploadEstado={comprobante.setSubida}
      sinpeUploadError={comprobante.errorSubida}
      setSinpeUploadError={comprobante.setErrorSubida}
      sinpeInputRef={comprobante.inputRef}
      onSubirComprobante={comprobante.subir}
      onSinpeWhatsApp={comprobante.whatsapp}
    />
  )
}
