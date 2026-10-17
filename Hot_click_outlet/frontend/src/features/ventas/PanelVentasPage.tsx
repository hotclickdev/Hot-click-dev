import { useEffect, useState } from 'react'
import { formatPrice } from '@/utils/format'
import { EncabezadoPagina } from '@/prototipo/compartido/ui'
import { explicacionMinimo, lunesDe, ventasSemanaApi, type SemanaVentas } from './ventasSemanaApi'

const fmt = (v: number) => formatPrice(v)

/** S4-23 · Panel de ventas de la semana (móvil primero: el neto arriba; la lista en una segunda vista). */
export default function PanelVentasPage() {
  const [offset, setOffset] = useState(0)
  const [semana, setSemana] = useState<SemanaVentas | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let vivo = true
    ventasSemanaApi.semana(lunesDe(new Date(), offset))
      .then((s) => { if (vivo) { setSemana(s); setError(false) } })
      .catch(() => { if (vivo) setError(true) })
    return () => { vivo = false }
  }, [offset])

  const explicacion = semana ? explicacionMinimo(semana.porcentaje, semana.minimoComision, fmt) : null
  return (
    <div className="mx-auto flex max-w-[1232px] flex-col gap-4 px-4 pb-10">
      <EncabezadoPagina titulo="Mis ventas" />
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Semana anterior" onClick={() => setOffset((o) => o - 1)} className="flex size-11 items-center justify-center rounded-xl border border-hc-border">‹</button>
        <p className="text-[13px] text-hc-muted">{semana?.desde && semana?.hasta ? `Semana del ${semana.desde} al ${semana.hasta}` : 'Semana'}</p>
        <button type="button" aria-label="Semana siguiente" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))} className="flex size-11 items-center justify-center rounded-xl border border-hc-border disabled:opacity-40">›</button>
      </div>
      {error && <p role="alert" className="rounded-[12px] bg-hc-danger-bg px-3.5 py-3 text-[13px] text-hc-danger">No pudimos cargar tus ventas. Probá de nuevo en unos minutos.</p>}
      {semana && (
        <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex flex-col gap-3">
            <section className="rounded-[16px] border border-hc-border bg-hc-surface p-4">
              <p className="text-[12px] text-hc-muted">Neto de la semana</p>
              <p className="font-display text-[32px] font-bold">{fmt(semana.totales.neto)}</p>
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-[13px]">
                <dt>Ventas (bruto)</dt><dd className="font-semibold">{fmt(semana.totales.bruto)}</dd>
                <dt>Comisión HotClick</dt><dd className="font-semibold">−{fmt(semana.totales.comision)}</dd>
                <dt className="text-hc-muted">Ventas con mínimo{semana.minimoComision != null ? ` de ${fmt(semana.minimoComision)}` : ''}</dt><dd className="font-semibold">{semana.totales.conMinimo} de {semana.totales.cantidad}</dd>
              </dl>
            </section>
            {explicacion && <p className="rounded-[12px] border border-hc-blue-600/20 bg-hc-blue-50 px-3.5 py-3 text-[12px]">{explicacion}</p>}
          </div>
          <section aria-label="Ventas de la semana" className="overflow-x-auto rounded-[16px] border border-hc-border bg-hc-surface">
            {semana.ventas.length === 0
              ? <p className="p-4 text-[13px] text-hc-muted">No hubo ventas esta semana.</p>
              : (
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="text-[12px] text-hc-muted"><tr>
                    <th className="p-3">Día</th><th className="p-3">Venta</th><th className="p-3">Bruto</th>
                    <th className="p-3">{semana.porcentaje != null ? `${semana.porcentaje} %` : '%'}</th><th className="p-3">Mínimo aplicado</th><th className="p-3">Comisión</th><th className="p-3">Neto</th>
                  </tr></thead>
                  <tbody>
                    {semana.ventas.map((v) => (
                      <tr key={v.id} className="border-t border-hc-border">
                        <td className="p-3">{v.fecha}</td><td className="p-3">{v.producto}</td><td className="p-3">{fmt(v.bruto)}</td>
                        <td className="p-3">{fmt(v.comisionPorcentaje)}</td>
                        <td className="p-3">{v.minimoAplicado && semana.minimoComision != null ? `Sí · ${fmt(semana.minimoComision)}` : '—'}</td>
                        <td className="p-3">{fmt(v.comision)}</td><td className="p-3 font-semibold">{fmt(v.neto)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-hc-border font-bold">
                      <td className="p-3" colSpan={2}>Total semana</td><td className="p-3">{fmt(semana.totales.bruto)}</td><td /><td />
                      <td className="p-3">{fmt(semana.totales.comision)}</td><td className="p-3">{fmt(semana.totales.neto)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
          </section>
        </div>
      )}
    </div>
  )
}
