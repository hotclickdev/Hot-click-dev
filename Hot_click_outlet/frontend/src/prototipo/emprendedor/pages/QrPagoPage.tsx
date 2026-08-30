import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { formatoColon } from '@/theme/formatoColon'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import { totalTicket } from '../ticketPos'

/**
 * Pagar con QR (Figma 94:128). QR real via react-qr-code, no recuadros falsos.
 */
export default function QrPagoPage() {
  const navigate = useNavigate()
  const total = totalTicket() || 46900
  const payload = `hotclick://pos/pago?total=${total}`

  return (
    <main className="flex flex-col items-center gap-5 px-5 pb-10 pt-8">
      <div className="w-full">
        <CabeceraAtras titulo="Pagar con Tarjeta" to={`${RUTA_EMPRENDEDOR}/pos/cobrar`} />
      </div>
      <p className="text-center text-xs text-hc-muted">
        Pedile al cliente que escanee el código con la app de su banco o tarjeta contactless
      </p>
      <div className="rounded-2xl border border-hc-border p-4">
        <QRCode value={payload} size={188} />
      </div>
      <div className="w-full rounded-[14px] bg-[var(--hc-n-50)] px-5 py-3 text-center">
        <p className="text-[11px] font-medium text-hc-muted">Total a cobrar</p>
        <p className="text-[22px] font-bold text-hc-primary">{formatoColon(total)}</p>
      </div>
      <p className="rounded-full bg-[var(--hc-warning-bg)] px-3.5 py-2 text-[11px] font-medium text-hc-warning">
        Esperando confirmación de pago...
      </p>
      <BotonPrimario onClick={() => navigate(`${RUTA_EMPRENDEDOR}/pos/venta`)}>Pago confirmado</BotonPrimario>
      <button
        type="button"
        onClick={() => navigate(`${RUTA_EMPRENDEDOR}/pos/cobrar`)}
        className="min-h-11 text-[13px] font-bold text-hc-muted"
      >
        Cancelar y volver
      </button>
    </main>
  )
}
