import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminOnvoApi, type ListaNegociosOnvo } from './adminOnvoApi'
import { CONCILIACION, ESTADOS_ONVO, FILTRO_CON_DIFERENCIA, porcentajeNoCoincide, vistaEstado } from './adminOnvoHelpers'
import { errorOnvo } from './erroresOnvo'

const CHIP = 'inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold'

/** S2-29 · Lista «Negocios ONVO» con filtro por estado y conciliación diaria (lámina admin-onvo-1440). */
export default function NegociosOnvoPage() {
  const [filtro, setFiltro] = useState<string>('')
  const [lista, setLista] = useState<ListaNegociosOnvo | null>(null)
  const [error, setError] = useState<{ titulo: string; texto: string } | null>(null)

  useEffect(() => {
    let vivo = true
    adminOnvoApi.listar(filtro || undefined)
      .then((l) => { if (vivo) { setLista(l); setError(null) } })
      .catch((e) => { if (vivo) setError(errorOnvo(e)) })
    return () => { vivo = false }
  }, [filtro])

  const filtros = [{ valor: '', etiqueta: 'Todos' }, ...ESTADOS_ONVO, { valor: FILTRO_CON_DIFERENCIA, etiqueta: 'Con diferencia' }]
  return (
    <main className="mx-auto flex max-w-[1232px] flex-col gap-4 px-4 py-6 lg:px-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-[24px] font-bold">Negocios ONVO</h1>
        {lista?.conciliadoEl && <p className="text-[12px] text-hc-muted">Última conciliación diaria: {lista.conciliadoEl}</p>}
      </div>
      <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button key={f.valor} type="button" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}
            className={`min-h-9 rounded-full border px-3 text-[13px] ${filtro === f.valor ? 'border-hc-n-900 bg-hc-n-900 text-white' : 'border-hc-border bg-hc-surface'}`}>
            {f.etiqueta}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-[12px] bg-hc-danger-bg px-3.5 py-3 text-[13px] text-hc-danger"><b>{error.titulo}.</b> {error.texto}</p>}
      {lista && (
        <div className="overflow-x-auto rounded-[12px] border border-hc-border bg-hc-surface">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="text-[12px] text-hc-muted">
              <tr><th className="p-3">Negocio</th><th className="p-3">Plan</th><th className="p-3">% en ONVO</th><th className="p-3">Estado ONVO</th><th className="p-3">Conciliación diaria</th><th className="p-3"><span className="sr-only">Acciones</span></th></tr>
            </thead>
            <tbody>
              {lista.negocios.length === 0 && <tr><td colSpan={6} className="p-4 text-hc-muted">No hay negocios con este filtro.</td></tr>}
              {lista.negocios.map((n) => {
                const e = vistaEstado(n.estado)
                const c = CONCILIACION[n.conciliacion] ?? CONCILIACION.SIN_DATOS
                return (
                  <tr key={n.id} className="border-t border-hc-border">
                    <td className="p-3 font-semibold">{n.nombre}</td>
                    <td className="p-3">{n.plan}</td>
                    <td className="p-3">
                      {n.porcentajeOnvo != null ? `${n.porcentajeOnvo} %` : '—'}
                      {porcentajeNoCoincide(n.porcentajeOnvo, n.porcentajePlan) && <span className={`${CHIP} ml-2 bg-hc-warning-bg text-hc-warning`}>% ≠ plan</span>}
                    </td>
                    <td className="p-3"><span className={`${CHIP} ${e.clase}`}>{e.etiqueta}</span></td>
                    <td className="p-3"><span className={`${CHIP} ${c.clase}`}>{c.etiqueta}</span></td>
                    <td className="p-3"><Link to={`/plataforma/onvo/${n.id}`} className="font-semibold text-hc-blue-600">Abrir</Link></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
