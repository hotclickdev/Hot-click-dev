import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { adminBillingService } from '@/services/adminBillingService'
import { formatoColon } from '@/theme/formatoColon'
import {
  etiquetaComision,
  etiquetaProveedor,
  parsearDetalle,
  type BillingFactura,
  type BillingFila,
  type BillingLedgerEvento,
  type BillingSuscripcion,
} from './billingPlataformaHelpers'

export default function AdminBillingEmpresa() {
  const { id } = useParams()
  const empresaId = Number(id)
  const [empresa, setEmpresa] = useState<BillingFila | null>(null)
  const [suscripcion, setSuscripcion] = useState<BillingSuscripcion | null>(null)
  const [facturas, setFacturas] = useState<BillingFactura[]>([])
  const [ledger, setLedger] = useState<BillingLedgerEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(empresaId) || empresaId <= 0) {
      setError('Negocio inválido')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    adminBillingService.detalle(empresaId)
      .then(({ data }) => {
        const parsed = parsearDetalle(data)
        setEmpresa(parsed.empresa)
        setSuscripcion(parsed.suscripcion)
        setFacturas(parsed.facturas)
        setLedger(parsed.ledger)
        if (!parsed.empresa) setError('No encontramos billing para este negocio.')
      })
      .catch(() => setError('No se pudo cargar el detalle de billing.'))
      .finally(() => setLoading(false))
  }, [empresaId])

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-10">
      <AdminPageHeader
        titulo={empresa?.nombre ?? 'Billing del negocio'}
        subtitulo="Plan, pasarela, facturas SaaS y ledger"
        atras="/admin/saas-billing"
      />
      {loading && <p className="py-10 text-center text-sm text-hc-muted">Cargando detalle…</p>}
      {!loading && error && (
        <p className="py-6 text-center text-sm text-hc-muted">{error}</p>
      )}
      {!loading && !error && empresa && suscripcion && (
        <>
          <Resumen empresa={empresa} suscripcion={suscripcion} />
          <ListaEventos
            titulo="Facturas SaaS"
            vacio="Sin facturas registradas."
            items={facturas.map((f) => (
              <li key={f.id} className="rounded-[14px] border border-hc-border p-3.5 text-sm">
                <p className="font-semibold text-hc-text">{f.estado ?? 'SIN_ESTADO'} · {formatoMonto(f.montoCentavos, f.moneda)}</p>
                <p className="text-[11px] text-hc-muted">{f.stripeInvoiceId ?? 'sin id'} · {f.periodoInicio ?? '—'} → {f.periodoFin ?? '—'}</p>
              </li>
            ))}
          />
          <ListaEventos
            titulo="Ledger"
            vacio="Sin eventos de cobro todavía."
            items={ledger.map((ev) => (
              <li key={ev.id} className="rounded-[14px] border border-hc-border p-3.5 text-sm">
                <p className="font-semibold text-hc-text">{ev.tipo} · {etiquetaProveedor(ev.proveedor ?? 'NINGUNO')}</p>
                <p className="text-[11px] text-hc-muted">{ev.detalle ?? ev.referenciaExterna ?? ev.fechaEvento}</p>
              </li>
            ))}
          />
        </>
      )}
    </div>
  )
}

function Resumen({ empresa, suscripcion }: { empresa: BillingFila; suscripcion: BillingSuscripcion }) {
  return (
    <section className="rounded-[14px] border border-hc-border p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-hc-muted">Suscripción</h2>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <Dato label="Plan" valor={suscripcion.planNombre ?? empresa.plan} />
        <Dato label="Estado" valor={suscripcion.estado} />
        <Dato label="Pasarela" valor={etiquetaProveedor(suscripcion.proveedor)} />
        <Dato label="Comisión" valor={etiquetaComision(empresa.comisionPorcentaje)} />
        <Dato label="Mensualidad" valor={formatoColon(empresa.precioMensual)} />
        <Dato label="Fallos de cobro" valor={String(empresa.fallosCobro)} />
        <Dato label="Onvo sub" valor={suscripcion.onvoSubscriptionId ?? '—'} />
        <Dato label="Stripe sub" valor={suscripcion.stripeSubscriptionId ?? '—'} />
        <Dato label="Vence" valor={empresa.fechaVencPlan ?? suscripcion.fechaFin ?? '—'} />
      </dl>
    </section>
  )
}

function ListaEventos({ titulo, vacio, items }: { titulo: string; vacio: string; items: ReactNode[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-hc-muted">{titulo}</h2>
      {items.length === 0
        ? <p className="text-sm text-hc-muted">{vacio}</p>
        : <ul className="flex flex-col gap-2">{items}</ul>}
    </section>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-[11px] text-hc-muted">{label}</dt>
      <dd className="break-all font-semibold text-hc-text">{valor}</dd>
    </div>
  )
}

function formatoMonto(centavos: number | null | undefined, moneda?: string): string {
  if (centavos == null) return '—'
  if ((moneda ?? 'crc').toLowerCase() === 'usd') {
    return `USD ${(centavos / 100).toLocaleString('es-CR', { minimumFractionDigits: 2 })}`
  }
  return formatoColon(centavos)
}
