import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { EncabezadoPagina, Boton } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import { billingService } from '@/services/billingService'
import OnvoSuscripcionEmbed from '@/features/billing/OnvoSuscripcionEmbed'
import { useCambiarPlan } from '@/features/billing/useCambiarPlan'
import FormularioPorPasos, { ProgresoPasos } from '@/prototipo/compartido/FormularioPorPasos'
import type { Id } from '@/types/api'
import {
  mapApiPlanToUi,
  mapSellerPlanIdToApi,
  PASOS_CAMBIAR_PLAN,
  TOTAL_PASOS_PLAN,
  validarPasoElegirPlan,
  type PlanUi,
} from './planesPageHelpers'

/**
 * Comparar planes — wizard: elegir → confirmar → pago ONVO.
 */
export default function CompararPlanesPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const [planes, setPlanes] = useState<PlanUi[]>([])
  const [cargando, setCargando] = useState(true)
  const [paso, setPaso] = useState(0)
  const [planElegido, setPlanElegido] = useState<PlanUi | null>(null)
  const {
    loadingPlan,
    error,
    setError,
    pagoPendiente,
    seleccionarPlan,
    irAExito,
    cancelarPago,
  } = useCambiarPlan({ rutaExito: ruta('plan/actualizado') })

  useEffect(() => {
    billingService.getPlanes()
      .then(({ data }) => {
        const lista = Array.isArray(data)
          ? data as Array<{ id: Id; nombre: string; precioMensual?: number }>
          : []
        setPlanes(lista.map(mapApiPlanToUi))
      })
      .catch(() => setError('No se pudieron cargar los planes'))
      .finally(() => setCargando(false))
  }, [setError])

  useEffect(() => {
    if (pagoPendiente) setPaso(2)
  }, [pagoPendiente])

  const actual = useMemo(() => mapSellerPlanIdToApi(plan.id), [plan.id])
  const idPaso = PASOS_CAMBIAR_PLAN[paso]?.id
  const confirmando = loadingPlan !== null

  function validarPaso(indice: number): string | null {
    if (PASOS_CAMBIAR_PLAN[indice]?.id !== 'elegir') return null
    return validarPasoElegirPlan(planElegido, actual)
  }

  async function confirmarCambio() {
    if (!planElegido) return
    await seleccionarPlan(planElegido.id)
  }

  function volverDesdePago() {
    cancelarPago()
    setPaso(1)
  }

  if (paso === 2 && pagoPendiente) {
    return (
      <ShellPlanes ruta={ruta} error={error}>
        <ProgresoPasos indice={2} total={TOTAL_PASOS_PLAN} titulo="Pago" />
        <div className="space-y-3 rounded-xl border border-hc-border p-4">
          <p className="text-sm font-semibold">
            Pagar {pagoPendiente.planNombre ?? planElegido?.nombre}
          </p>
          <OnvoSuscripcionEmbed
            subscriptionId={pagoPendiente.subscriptionId}
            customerId={pagoPendiente.customerId}
            publishableKey={pagoPendiente.publishableKey}
            onSuccess={() => { void irAExito() }}
            onError={(msg) => setError(msg)}
          />
        </div>
        <Boton variante="contorno" onClick={volverDesdePago}>Atrás</Boton>
      </ShellPlanes>
    )
  }

  return (
    <ShellPlanes ruta={ruta} error={error}>
      {cargando ? (
        <p className="text-sm text-hc-muted">Cargando planes…</p>
      ) : (
        <FormularioPorPasos
          pasos={PASOS_CAMBIAR_PLAN}
          pasoActual={paso}
          onPasoChange={setPaso}
          validarPaso={validarPaso}
          onFinalizar={confirmarCambio}
          etiquetaFinal="Confirmar cambio"
          enviando={confirmando}
          totalProgreso={TOTAL_PASOS_PLAN}
        >
          {idPaso === 'elegir' ? (
            <ul className="space-y-4">
              {planes.map((item) => (
                <TarjetaPlan
                  key={String(item.id)}
                  plan={item}
                  actual={item.nombreApi === actual}
                  seleccionado={planElegido?.id === item.id}
                  onSelect={() => setPlanElegido(item)}
                />
              ))}
            </ul>
          ) : null}
          {idPaso === 'confirmar' && planElegido ? (
            <ResumenPlan plan={planElegido} />
          ) : null}
        </FormularioPorPasos>
      )}
    </ShellPlanes>
  )
}

function ShellPlanes({
  children,
  error,
  ruta,
}: {
  children: ReactNode
  error: string | null
  ruta: (segmento?: string) => string
}) {
  return (
    <main className="px-5 pb-8 pt-[60px] md:px-12 md:py-12 md:pt-12">
      <div className="md:hidden">
        <EncabezadoPagina
          titulo="Tu Plan"
          subtitulo="Elegí el plan que mejor se ajuste a tu negocio"
          volverA={ruta('opciones')}
        />
      </div>
      <header className="mb-5 hidden md:block">
        <h1 className="font-display text-[28px] font-bold">Tu Plan</h1>
        <p className="mt-1 text-sm text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
      </header>
      {error ? <p className="mb-4 text-sm text-red-500">{error}</p> : null}
      {children}
    </main>
  )
}

function ResumenPlan({ plan }: { plan: PlanUi }) {
  return (
    <div className="space-y-4 rounded-xl border border-hc-border bg-hc-surface p-5">
      <div>
        <p className="font-display text-lg font-bold">{plan.nombre}</p>
        <p className="font-display text-[22px] font-bold text-hc-primary">{plan.precio}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {plan.beneficios.map((b) => (
          <li key={b} className="text-[13px] text-hc-muted">✓ {b}</li>
        ))}
      </ul>
      <p className="text-xs text-hc-muted">
        Al confirmar, aplicamos el cambio de plan. Si el plan es de pago, completás el cobro en el siguiente paso.
      </p>
    </div>
  )
}

function TarjetaPlan({
  plan,
  actual,
  seleccionado,
  onSelect,
}: {
  plan: PlanUi
  actual: boolean
  seleccionado: boolean
  onSelect: () => void
}) {
  const borde = actual || seleccionado
    ? 'border-2 border-hc-primary'
    : 'border border-hc-border'

  return (
    <li className={`rounded-xl p-4 ${borde}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold">{plan.nombre}</p>
          <p className="text-sm text-hc-muted">{plan.precio}</p>
        </div>
        {actual ? (
          <span
            className="rounded-full px-2.5 py-1 text-[10px] font-bold"
            style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-blue-700)' }}
          >
            TU PLAN ACTUAL
          </span>
        ) : null}
      </div>
      <ul className="space-y-2 text-sm">
        {plan.beneficios.map((punto) => (
          <li key={punto} className="flex gap-2">
            <span className="text-hc-success" aria-hidden>✓</span>
            {punto}
          </li>
        ))}
      </ul>
      {!actual ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={onSelect}
            className={`flex min-h-11 w-full items-center justify-center rounded-[10px] text-[15px] font-bold ${
              seleccionado
                ? 'border-2 border-hc-primary bg-[var(--hc-red-50)] text-hc-primary'
                : 'bg-hc-primary text-white'
            }`}
          >
            {seleccionado ? 'Seleccionado' : plan.cta}
          </button>
        </div>
      ) : null}
    </li>
  )
}
