import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { adminBillingService } from '@/services/adminBillingService'
import { formatoColon } from '@/theme/formatoColon'
import {
  etiquetaComision,
  etiquetaProveedor,
  filtrarFilas,
  parsearConsola,
  type BillingFila,
  type BillingKpis,
  type FiltroBilling,
} from './billingPlataformaHelpers'

const FILTROS: { id: FiltroBilling; label: string }[] = [
  { id: 'TODAS', label: 'Todas' },
  { id: 'ALERTA', label: 'Alerta cobro' },
  { id: 'PAST_DUE', label: 'Past due' },
  { id: 'ONVO', label: 'Onvo' },
]

const KPIS_VACIOS: BillingKpis = {
  total: 0, pastDue: 0, conAlertaCobro: 0, conOnvo: 0, conStripe: 0,
}

const TAMANO_PAGINA = 100

export default function AdminBillingPlataforma() {
  const [filas, setFilas] = useState<BillingFila[]>([])
  const [kpis, setKpis] = useState<BillingKpis>(KPIS_VACIOS)
  const [totalPlataforma, setTotalPlataforma] = useState(0)
  const [filtro, setFiltro] = useState<FiltroBilling>('TODAS')
  const [loading, setLoading] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cargar() {
    setLoading(true)
    setError(null)
    adminBillingService.listar(0, TAMANO_PAGINA)
      .then(({ data }) => {
        const parsed = parsearConsola(data)
        setFilas(parsed.empresas)
        setKpis(parsed.kpis)
        setTotalPlataforma(parsed.total)
      })
      .catch(() => {
        setError('No se pudo cargar el billing de los negocios.')
        setFilas([])
      })
      .finally(() => setLoading(false))
  }

  function cargarMas() {
    setCargandoMas(true)
    const siguientePagina = Math.floor(filas.length / TAMANO_PAGINA)
    adminBillingService.listar(siguientePagina, TAMANO_PAGINA)
      .then(({ data }) => {
        const parsed = parsearConsola(data)
        setFilas((prev) => [...prev, ...parsed.empresas])
      })
      .catch(() => setError('No se pudieron cargar más negocios.'))
      .finally(() => setCargandoMas(false))
  }

  useEffect(() => { cargar() }, [])

  const visibles = filtrarFilas(filas, filtro)

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <AdminPageHeader
        titulo="Billing de plataforma"
        subtitulo="Plan, Onvo, fallos de cobro y comisión por negocio"
      />
      <KpiRow kpis={kpis} />
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFiltro(f.id)}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold"
            style={{
              border: '1px solid var(--hc-border)',
              background: filtro === f.id ? 'var(--hc-accent)' : 'transparent',
              color: filtro === f.id ? 'white' : 'var(--hc-text)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {loading && <p className="py-10 text-center text-sm text-hc-muted">Cargando negocios…</p>}
      {!loading && error && (
        <div className="mt-6 space-y-3 text-center">
          <p className="text-sm text-hc-muted">{error}</p>
          <button type="button" onClick={cargar} className="min-h-11 rounded-xl border border-hc-border px-4 text-sm font-semibold">
            Reintentar
          </button>
        </div>
      )}
      {!loading && !error && visibles.length === 0 && (
        <p className="py-10 text-center text-sm text-hc-muted">No hay negocios en este filtro.</p>
      )}
      {!loading && !error && visibles.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {visibles.map((fila) => (
            <li key={fila.empresaId}>
              <Link
                to={`/admin/saas-billing/${fila.empresaId}`}
                className="block rounded-[14px] border border-hc-border p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-hc-text">{fila.nombre}</p>
                    <p className="text-[11px] text-hc-muted">{fila.slug} · {fila.plan} · {etiquetaProveedor(fila.proveedor)}</p>
                  </div>
                  {fila.alertaCobro && (
                    <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                      Alerta cobro
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <Dato label="Estado" valor={fila.estadoSuscripcion} />
                  <Dato label="Comisión" valor={etiquetaComision(fila.comisionPorcentaje)} />
                  <Dato label="Mensual" valor={formatoColon(fila.precioMensual)} />
                  <Dato label="Fallos" valor={String(fila.fallosCobro)} />
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!loading && !error && filas.length < totalPlataforma && (
        <div className="mt-4 flex justify-center">
          <button type="button" onClick={cargarMas} disabled={cargandoMas}
            className="min-h-11 rounded-xl border border-hc-border px-4 text-sm font-semibold disabled:opacity-60"
          >
            {cargandoMas ? 'Cargando…' : `Cargar más (${filas.length} de ${totalPlataforma})`}
          </button>
        </div>
      )}
    </div>
  )
}

function KpiRow({ kpis }: { kpis: BillingKpis }) {
  const items = [
    { label: 'Negocios', valor: kpis.total },
    { label: 'Past due', valor: kpis.pastDue },
    { label: 'Alerta cobro', valor: kpis.conAlertaCobro },
    { label: 'Onvo', valor: kpis.conOnvo },
    { label: 'Stripe', valor: kpis.conStripe },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map((k) => (
        <div key={k.label} className="rounded-2xl border border-hc-border p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-hc-muted">{k.label}</p>
          <p className="mt-1 text-xl font-bold text-hc-text">{k.valor}</p>
        </div>
      ))}
    </div>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-hc-muted">{label}</dt>
      <dd className="font-semibold text-hc-text">{valor}</dd>
    </div>
  )
}
