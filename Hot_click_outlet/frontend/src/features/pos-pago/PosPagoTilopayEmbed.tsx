import { useEffect, useState } from 'react'
import { posService } from '@/services/posService'
import TilopayCardForm from '@/pages/checkout/TilopayCardForm'

type Props = {
  token: string
  onFallback: () => void
}

type DatosTilopay = { orderNumber: string; montoCrc: number; sdkToken: string }

/** Cobro con tarjeta del QR de caja por Tilopay (reemplaza ONVO). Al volver, POSPagoPage confirma. */
export default function PosPagoTilopayEmbed({ token, onFallback }: Props) {
  const [datos, setDatos] = useState<DatosTilopay | null>(null)

  useEffect(() => {
    let activo = true
    posService.iniciarTilopayQr(token)
      .then((d: DatosTilopay) => {
        if (!activo) return
        if (!d?.orderNumber || !d?.sdkToken || !d?.montoCrc) onFallback()
        else setDatos(d)
      })
      .catch(() => { if (activo) onFallback() })
    return () => { activo = false }
  }, [token, onFallback])

  if (!datos) return null
  return (
    <TilopayCardForm
      sdkToken={datos.sdkToken}
      monto={datos.montoCrc}
      moneda="CRC"
      orderNumber={datos.orderNumber}
      redirectUrl={`${globalThis.location.origin}/pos/pago/${encodeURIComponent(token)}?tilopay=1`}
    />
  )
}
