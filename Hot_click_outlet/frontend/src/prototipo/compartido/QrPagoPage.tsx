import QRCode from 'react-qr-code'
import { formatoColon } from '@/theme/formatoColon'
import { Boton, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Pago con QR / tarjeta (Figma 94:411).
 */
export default function QrPagoPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px] text-center">
      <EncabezadoPagina titulo="Pagar con Tarjeta" volverA={ruta('pos/cobrar')} />
      <p className="text-sm text-hc-muted">
        Pedile al cliente que escanee el código con la app de su banco o tarjeta contactless
      </p>
      <div className="mx-auto my-8 w-[220px] bg-hc-surface p-4">
        <QRCode value="https://hotclick.lat/pos/pago/prototipo" size={188} />
      </div>
      <p className="text-xs text-hc-muted">Total a cobrar</p>
      <p className="text-2xl font-bold">{formatoColon(46900)}</p>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-hc-muted">
        <span className="size-2 rounded-full bg-hc-warning" aria-hidden />
        Esperando confirmación de pago...
      </p>
      <div className="mt-6">
        <Boton to={ruta('pos/venta')}>Pago confirmado</Boton>
      </div>
    </main>
  )
}
