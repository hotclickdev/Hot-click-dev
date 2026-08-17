import StepApertura from './StepApertura'
import StepVenta from './StepVenta'
import StepCobro from './StepCobro'
import StepQR from './StepQR'
import StepRecibo from './StepRecibo'

export default function AdminPOSSteps({ pos }) {
  return (
    <>
      {pos.step === 'apertura' && <StepApertura onAbrir={pos.handleAbrir} loading={pos.saving} />}

      {pos.step === 'venta' && (
        <StepVenta
          cartItems={pos.cartItems}
          onAdd={pos.agregarProducto}
          onSetCantidad={pos.setCantidad}
          onSetPrecio={pos.setPrecio}
          onRemove={pos.quitarItem}
          descuento={pos.descuento}
          onSetDescuento={pos.setDescuento}
          subtotal={pos.subtotal}
          total={pos.total}
          onNueva={pos.nuevaVenta}
          onCobrar={() => pos.setStep('cobro')}
          onQrCliente={pos.handleQrCliente}
          loadingQr={pos.loadingVenta}
          cliente={pos.cliente}
          onSetCliente={pos.setCliente}
        />
      )}

      {pos.step === 'cobro' && (
        <StepCobro
          total={pos.total}
          cartItems={pos.cartItems}
          descuento={pos.descuento}
          onBack={() => pos.setStep('venta')}
          onConfirmar={pos.handleConfirmarPago}
          loading={pos.loadingVenta}
        />
      )}

      {pos.step === 'qr' && pos.qrData && (
        <StepQR
          qrData={pos.qrData}
          onConfirmSinpe={pos.handleQrConfirmSinpe}
          onCancelar={pos.handleQrCancelar}
          loadingConfirm={pos.loadingConfirm}
        />
      )}

      {pos.step === 'recibo' && pos.receipt && (
        <StepRecibo venta={pos.receipt} userName={pos.userName} onNueva={pos.nuevaVenta} />
      )}
    </>
  )
}
