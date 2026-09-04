import { useEffect, useState, type ReactNode } from 'react'
import { Boton } from './ui'
import { billingService } from '@/services/billingService'
import OnvoSuscripcionEmbed from '@/features/billing/OnvoSuscripcionEmbed'
import { useCambiarPlan } from '@/features/billing/useCambiarPlan'
import FormularioPorPasos, { ProgresoPasos } from './FormularioPorPasos'
import type { Id } from '@/types/api'
import {
  mapApiPlanToUi,
  PASOS_CAMBIAR_PLAN,
  TOTAL_PASOS_PLAN,
  validarPasoElegirPlan,
  type PlanUi,
} from './planesPageHelpers'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'

export type CompararPlanesVariante = 'emp' | 'seller'

type Props = Readonly<{
  planActualApi: string
  rutaExito: string
  /** Shell de página (cabecera + EntradaPagina + main). */
  renderShell: (args: { children: ReactNode; error: string | null }) => ReactNode
  variante?: CompararPlanesVariante
}>

/**
 * Wizard comparar / cambiar plan — lógica única Emp + Seller.
 */
export default function CompararPlanesVista({
  planActualApi,
  rutaExito,
  renderShell,
  variante = 'seller',
}: Props) {
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
  } = useCambiarPlan({ rutaExito })

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

  const idPaso = PASOS_CAMBIAR_PLAN[paso]?.id
  const confirmando = loadingPlan !== null
  const emp = variante === 'emp'

  function validarPaso(indice: number): string | null {
    if (PASOS_CAMBIAR_PLAN[indice]?.id !== 'elegir') return null
    return validarPasoElegirPlan(planElegido, planActualApi)
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
    return renderShell({
      error,
      children: (
        <>
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
          {emp ? (
            <button
              type="button"
              onClick={volverDesdePago}
              className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border py-3.5 text-[13px] font-medium text-hc-text"
            >
              Atrás
            </button>
          ) : (
            <Boton variante="contorno" onClick={volverDesdePago}>Atrás</Boton>
          )}
        </>
      ),
    })
  }

  return renderShell({
    error,
    children: cargando ? (
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
          <ListaStagger
            className={
              emp
                ? 'flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5'
                : 'flex flex-col gap-4'
            }
          >
            {planes.map((plan) => (
              <ItemListaStagger key={String(plan.id)} className={emp ? 'flex-1' : undefined}>
                <TarjetaPlan
                  plan={plan}
                  actual={plan.nombreApi === planActualApi}
                  seleccionado={planElegido?.id === plan.id}
                  onSelect={() => setPlanElegido(plan)}
                  emp={emp}
                />
              </ItemListaStagger>
            ))}
          </ListaStagger>
        ) : null}
        {idPaso === 'confirmar' && planElegido ? (
          <ResumenPlan plan={planElegido} />
        ) : null}
      </FormularioPorPasos>
    ),
  })
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
  emp,
}: {
  plan: PlanUi
  actual: boolean
  seleccionado: boolean
  onSelect: () => void
  emp: boolean
}) {
  if (emp) {
    const borde = actual || seleccionado
      ? 'border-2 border-hc-primary bg-hc-surface'
      : 'border border-hc-border bg-hc-surface'
    return (
      <article className={`flex flex-1 flex-col gap-3 rounded-xl p-5 md:px-5 md:py-6 ${borde}`}>
        <p className="font-display text-base font-bold md:text-lg">{plan.nombre}</p>
        <p className="font-display text-lg font-bold text-hc-primary md:text-[22px]">{plan.precio}</p>
        <ul className="flex flex-col gap-2">
          {plan.beneficios.map((b) => (
            <li key={b} className="text-[11px] text-hc-muted md:text-[13px]">✓ {b}</li>
          ))}
        </ul>
        <div className="mt-auto pt-2">
          {actual ? (
            <span className="flex min-h-11 w-full items-center justify-center rounded-[10px] border border-hc-border text-[15px] font-bold text-hc-text">
              TU PLAN ACTUAL
            </span>
          ) : (
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
          )}
        </div>
      </article>
    )
  }

  const borde = actual || seleccionado
    ? 'border-2 border-hc-primary'
    : 'border border-hc-border'

  return (
    <article className={`rounded-xl p-4 ${borde}`}>
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
    </article>
  )
}
