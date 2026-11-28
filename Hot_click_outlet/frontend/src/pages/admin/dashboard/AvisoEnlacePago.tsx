import { useEffect, useState } from 'react'
import { onvoCobroService, type AvisoEnlace } from '@/services/onvoCobroService'
import { formatPrice } from '@/utils/format'
import { esUrlHttps } from '@/pages/plataforma/enlacePago'

/** Aviso al negocio: HotClick le abrió un enlace de pago (factura tardía). Solo ve los de su empresa. */
export default function AvisoEnlacePago() {
  const [avisos, setAvisos] = useState<AvisoEnlace[]>([])

  useEffect(() => {
    onvoCobroService.abiertos()
      .then(({ data }) => {
        const cuerpo = data as { data?: AvisoEnlace[] }
        setAvisos(Array.isArray(cuerpo?.data) ? cuerpo.data.filter((a) => esUrlHttps(a.url)) : [])
      })
      .catch(() => setAvisos([]))
  }, [])

  if (avisos.length === 0) return null
  return (
    <div className="space-y-3" role="region" aria-label="Pagos pendientes con HotClick">
      {avisos.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-surface p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-hc-n-900">Tenés un pago pendiente de {formatPrice(a.montoCrc)}</p>
            <p className="break-words text-sm text-hc-n-600">{a.motivo}</p>
          </div>
          <a href={a.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-hc-primary px-4 text-[15px] font-semibold text-white">
            Pagar ahora
          </a>
        </div>
      ))}
    </div>
  )
}
