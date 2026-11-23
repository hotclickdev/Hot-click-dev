import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import PosQrImagen from '@/pages/admin/pos/PosQrImagen'
import QrPagina from '@/features/qr-negocio/QrPagina'

type Info = { estado: 'PENDIENTE' | 'PRESENTADO' | 'VENCIDO' | 'INVALIDO'; tienda?: string | null }

/**
 * Página mínima del QR de retiro (`/r/:token`) que abre el comprador desde Telegram. Solo dice que es un pedido
 * de retiro de esa tienda y su estado: NO lista productos, precios ni datos personales. El QR es esta misma URL.
 */
export default function RetiroPedidoPage() {
  const { token = '' } = useParams()
  const { t } = useTranslation()
  const [info, setInfo] = useState<Info | null>(null)

  useEffect(() => {
    let vivo = true
    api.get(`/public/retiro/${encodeURIComponent(token)}`)
      .then((r) => { if (vivo) setInfo(r.data as Info) })
      .catch(() => { if (vivo) setInfo({ estado: 'INVALIDO' }) })
    return () => { vivo = false }
  }, [token])

  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/r/${token}`

  return (
    <QrPagina>
      <div className="flex flex-1 flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-lg font-bold">{t('pos.retiroPagina.titulo')}</h1>
        {!info ? (
          <p className="text-sm">{t('pos.retiroPagina.cargando')}</p>
        ) : (
          <>
            {info.tienda ? <p className="text-sm">{t('pos.retiroPagina.tienda', { tienda: info.tienda })}</p> : null}
            <p className="text-base font-semibold">{t(`pos.retiroPagina.${info.estado}`)}</p>
            {info.estado === 'PENDIENTE' ? (
              <>
                <PosQrImagen value={url} size={260} alt={t('pos.retiroPagina.qrAlt')} />
                <p className="text-xs">{t('pos.retiroPagina.ayuda')}</p>
              </>
            ) : null}
          </>
        )}
      </div>
    </QrPagina>
  )
}
