import { useEffect, useState, type FormEvent } from 'react'
import {
  cargarComisionPorPlan,
  colonesComision,
  errorRango,
  etiquetaSemana,
  filasPorSemana,
  mensajeErrorComision,
  nombrePlanComision,
  totalGeneral,
  totalesPorPlan,
  type ComisionPorPlan as Datos,
  type RangoComision,
} from './comisionPorPlan'
import { Aviso, BOTON_SECUNDARIO, Carga, Marco, Metrica, TARJETA, TITULO } from './piezas'

const INPUT = 'h-12 rounded-xl border border-hc-n-200 bg-hc-surface px-3 text-sm text-hc-n-900 focus:border-hc-blue-600 focus:outline-none focus:ring-[3px] focus:ring-hc-blue-100'

/**
 * S6-18 · Tablero de comisión cobrada por plan (solo ADMIN, contrato de #193).
 * Derivado de la vista Quincena de `DineroPlataforma` (Marco + Metrica + tarjetas). Solo datos del ledger.
 */
export default function ComisionPorPlan() {
  const [rango, setRango] = useState<RangoComision>({})
  const [borrador, setBorrador] = useState<RangoComision>({})
  const [datos, setDatos] = useState<Datos | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [error, setError] = useState('')
  const [errorForm, setErrorForm] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    setEstado('carga')
    cargarComisionPorPlan(rango)
      .then((d) => { if (vivo) { setDatos(d); setEstado('listo') } })
      .catch((err: unknown) => {
        console.error(err)
        if (vivo) { setError(mensajeErrorComision(err)); setEstado('error') }
      })
    return () => { vivo = false }
  }, [rango])

  const aplicar = (e: FormEvent) => {
    e.preventDefault()
    const motivo = errorRango(borrador)
    setErrorForm(motivo)
    if (!motivo) setRango({ ...borrador })
  }

  const filtro = (
    <form className={`${TARJETA} flex flex-wrap items-end gap-3`} onSubmit={aplicar} noValidate>
      <label className="flex flex-col gap-1 text-xs font-semibold text-hc-n-600">
        Desde
        <input className={INPUT} type="date" value={borrador.desde ?? ''} onChange={(e) => setBorrador((b) => ({ ...b, desde: e.target.value || undefined }))} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold text-hc-n-600">
        Hasta
        <input className={INPUT} type="date" value={borrador.hasta ?? ''} onChange={(e) => setBorrador((b) => ({ ...b, hasta: e.target.value || undefined }))} />
      </label>
      <button type="submit" className={BOTON_SECUNDARIO}>Ver rango</button>
      {errorForm && <p role="alert" className="w-full text-sm text-hc-primary">{errorForm}</p>}
    </form>
  )

  return (
    <Marco
      principal={
        <>
          {filtro}
          {estado === 'carga' && <Carga />}
          {estado === 'error' && <Aviso>{error}</Aviso>}
          {estado === 'listo' && datos && <Tablero datos={datos} />}
        </>
      }
      lado={
        <section className={TARJETA}>
          <h2 className={TITULO}>De dónde sale</h2>
          <p className="mt-2 text-sm text-hc-n-600">
            Solo ventas reales acreditadas en el wallet. No estima ni proyecta. La semana va de lunes a domingo, hora de Costa Rica.
            El plan es el que la tienda tiene hoy. Sin fechas se muestran las últimas 8 semanas; el rango máximo es de 366 días.
          </p>
        </section>
      }
    />
  )
}

function Tablero({ datos }: { datos: Datos }) {
  const { filas, moneda } = datos
  const total = totalGeneral(filas)
  const porPlan = totalesPorPlan(filas)
  const semanas = filasPorSemana(filas)
  const plata = (n: number) => colonesComision(n, moneda)

  return (
    <>
      <p className="text-sm text-hc-n-600">Del {datos.desde} al {datos.hasta}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Metrica icono="dinero" etiqueta="Comisión HotClick" valor={plata(total.comisionSaas)} />
        <Metrica icono="dinero" etiqueta="Pasarela" valor={plata(total.comisionPasarela)} />
        <Metrica icono="dinero" etiqueta="Ventas" valor={String(total.ventas)} />
      </div>
      {filas.length === 0 ? (
        <Aviso>No hubo ventas acreditadas en este rango. Cuando una venta se acredita, su comisión aparece acá en su semana y plan.</Aviso>
      ) : (
        <>
          <section className={TARJETA}>
            <h2 className={TITULO}>Por plan</h2>
            <ul className="mt-2 flex flex-col divide-y divide-hc-n-200">
              {porPlan.map((p) => (
                <li key={p.plan} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-semibold">{nombrePlanComision(p.plan)}</span>
                  <span className="text-hc-n-600">{p.ventas} {p.ventas === 1 ? 'venta' : 'ventas'} · bruto {plata(p.totalBruto)} · comisión {plata(p.comisionSaas)} · pasarela {plata(p.comisionPasarela)}</span>
                </li>
              ))}
            </ul>
          </section>
          <ul className="flex flex-col gap-2">
            {semanas.map((grupo) => (
              <li key={grupo.semana} className={TARJETA}>
                <h3 className="font-display text-[15px] font-bold">{etiquetaSemana(grupo.semana)}</h3>
                <div className="mt-2 hidden grid-cols-[1fr_4rem_7rem_7rem_7rem] gap-2 text-xs font-semibold text-hc-n-600 md:grid">
                  <span>Plan</span><span className="text-right">Ventas</span><span className="text-right">Bruto</span><span className="text-right">Comisión</span><span className="text-right">Pasarela</span>
                </div>
                {grupo.filas.map((f) => (
                  <div key={`${grupo.semana}-${f.plan}`} className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 border-t border-hc-n-200 pt-1 text-sm md:grid-cols-[1fr_4rem_7rem_7rem_7rem]">
                    <span className="col-span-2 font-semibold md:col-span-1">{nombrePlanComision(f.plan)}</span>
                    <span className="md:text-right"><span className="text-hc-n-600 md:hidden">Ventas </span>{f.ventas}</span>
                    <span className="text-right"><span className="text-hc-n-600 md:hidden">Bruto </span>{plata(f.totalBruto)}</span>
                    <span className="md:text-right"><span className="text-hc-n-600 md:hidden">Comisión </span>{plata(f.comisionSaas)}</span>
                    <span className="text-right"><span className="text-hc-n-600 md:hidden">Pasarela </span>{plata(f.comisionPasarela)}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
