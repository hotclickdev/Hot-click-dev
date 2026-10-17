import { useEffect, useState } from 'react'
import { resumenLegalApi, resumenVisible, type DocumentoLegal, type ResumenLegal as Resumen } from './resumenLegalApi'

/** «Lo importante, en corto»: oculto hasta que Legal lo aprueba (S5-24). Ante error, no se muestra nada. */
export default function ResumenLegal({ documento, textoCompleto, ancla }: { documento: DocumentoLegal; textoCompleto: string; ancla: string }) {
  const [r, setR] = useState<Resumen | null>(null)
  useEffect(() => {
    let vivo = true
    resumenLegalApi.publico(documento).then((x) => { if (vivo) setR(x) }).catch(() => { /* sin resumen */ })
    return () => { vivo = false }
  }, [documento])
  if (!resumenVisible(r)) return null
  return (
    <section aria-labelledby="resumen-legal" className="rounded-2xl border border-hc-n-200 bg-hc-n-0 p-4">
      <h2 id="resumen-legal" className="font-display text-[18px] font-bold text-hc-n-900">Lo importante, en corto</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-[21px] text-hc-n-900">
        {r!.puntos.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <p className="mt-2 text-[12px] text-hc-n-600">Este resumen no reemplaza el texto completo.</p>
      <a href={ancla} className="mt-2 inline-flex min-h-11 items-center text-[14px] font-semibold text-hc-blue-600 underline">Leer {textoCompleto} completos</a>
    </section>
  )
}
