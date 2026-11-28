import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { facturaNegocioService, datosDe, type FacturaNegocio, type ResumenFacturaHotclick } from '@/services/facturaNegocioService'
import { sePuedeSubir, textoAvisoPanel } from '@/utils/facturaNegocio'

/** Aviso del panel mientras el negocio debe la factura de la quincena a HotClick. */
export default function AvisoFacturaHotclick({ to, className = '' }: Readonly<{ to: string; className?: string }>) {
  const [pendiente, setPendiente] = useState<FacturaNegocio | null>(null)

  useEffect(() => {
    let vivo = true
    facturaNegocioService.resumen()
      .then((r) => {
        const d = datosDe<ResumenFacturaHotclick>(r)
        const p = d?.leCorrespondeFacturar ? d.pendiente : null
        if (vivo) setPendiente(p && sePuedeSubir(p.estado) ? p : null)
      })
      .catch(() => { if (vivo) setPendiente(null) })
    return () => { vivo = false }
  }, [])

  if (!pendiente) return null
  return (
    <section aria-label="Factura a HotClick"
      className={`flex w-full flex-wrap items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-surface p-4 ${className}`}>
      <p className="min-w-0 flex-1 text-sm font-bold text-hc-n-900">{textoAvisoPanel(pendiente.diasRestantes)}</p>
      <Link to={to}
        className="inline-flex h-12 items-center justify-center rounded-xl bg-hc-primary px-4 text-[15px] font-semibold text-white">
        Subir factura
      </Link>
    </section>
  )
}
