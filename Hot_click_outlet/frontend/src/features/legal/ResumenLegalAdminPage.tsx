import { useEffect, useState } from 'react'
import { resumenLegalApi, type DocumentoLegal, type ResumenLegal } from './resumenLegalApi'

const DOCS: { id: DocumentoLegal; nombre: string }[] = [
  { id: 'terminos', nombre: 'Términos' }, { id: 'privacidad', nombre: 'Privacidad' }, { id: 'devoluciones', nombre: 'Devoluciones' },
]

/** S5-24 · Admin → Legal: estado del resumen por documento (solo lectura; lo aprueba Legal). */
export default function ResumenLegalAdminPage() {
  const [estado, setEstado] = useState<Record<string, ResumenLegal | 'error'>>({})
  useEffect(() => {
    let vivo = true
    for (const d of DOCS) {
      resumenLegalApi.admin(d.id).then((r) => { if (vivo) setEstado((e) => ({ ...e, [d.id]: r })) }).catch(() => { if (vivo) setEstado((e) => ({ ...e, [d.id]: 'error' })) })
    }
    return () => { vivo = false }
  }, [])
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-[22px] font-bold">Legal · resúmenes</h1>
      {DOCS.map((d) => {
        const r = estado[d.id]
        return (
          <section key={d.id} className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-white p-4 text-[13px]">
            <h2 className="font-display text-[17px] font-bold">Resumen · {d.nombre}</h2>
            {r === 'error' && <p className="text-hc-primary-text">No se pudo cargar el estado.</p>}
            {r && r !== 'error' && (<>
              <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.aprobado ? 'bg-hc-success-bg text-hc-success-text' : 'bg-hc-n-100 text-hc-n-600'}`}>
                {r.aprobado ? 'Publicado · aprobado por Legal' : 'Oculto · falta aprobación de Legal'}
              </span>
              <p>{r.puntos.length} puntos</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-hc-n-600">Aprobado por</dt><dd>{r.aprobadoPor ?? '—'}</dd>
                <dt className="text-hc-n-600">Versión</dt><dd className="font-semibold">{r.version ?? '—'}</dd>
              </dl>
              <p className="text-xs text-hc-n-600">Se publica solo cuando Legal marca «Aprobado» para esta versión. Si cambia el texto completo, el resumen vuelve a quedar oculto.</p>
            </>)}
          </section>
        )
      })}
    </main>
  )
}
