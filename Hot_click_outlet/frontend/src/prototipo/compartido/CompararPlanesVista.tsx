import { useEffect, useState, type ReactNode } from 'react'
import { Boton } from './ui'
import { billingService } from '@/services/billingService'
import OnvoSuscripcionEmbed from '@/features/billing/OnvoSuscripcionEmbed'
import { useCambiarPlan } from '@/features/billing/useCambiarPlan'
import AvisoBajadaBloqueada from '@/features/billing/AvisoBajadaBloqueada'
import { esBajada, type LimitesPlan, type RecursoPlan } from '@/features/billing/bajarPlanHelpers'
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
  /** Rutas del panel para «Ir a mis productos» / «Ir a mi equipo» cuando una bajada queda bloqueada. */
  rutaAjuste?: Partial<Record<RecursoPlan, string>>
}>

/**
 * Wizard comparar / cambiar plan — lógica única Emp + Seller.
 */
export default function CompararPlanesVista({
  planActualApi,
  rutaExito,
  renderShell,
  variante = 'seller',
  rutaAjuste,
}: Props) {
  const [planes, setPlanes] = useState<PlanUi[]>([])
  const [limites, setLimites] = useState<Record<string, LimitesPlan>>({})
  const [cargando, setCargando] = useState(true)
  const [paso, setPaso] = useState(0)
  const [planElegido, setPlanElegido] = useState<PlanUi | null>(null)
  const {
    loadingPlan,
    error,
    setError,
    pagoPendiente,
    bajadaBloqueada,
    seleccionarPlan,
    irAExito,
    cancelarPago,
  } = useCambiarPlan({ rutaExito })

  useEffect(() => {
    billingService.getPlanes()
      .then(({ data }) => {
        const lista = Array.isArray(data)
          ? data as Array<{ id: Id; nombre: string; precioMensual?: number } & LimitesPlan>
          : []
        setPlanes(lista.map(mapApiPlanToUi))
        setLimites(Object.fromEntries(lista.map((p) => [String(p.id), { maxProductos: p.maxProductos, maxUsuarios: p.maxUsuarios }])))
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
    await seleccionarPlan(
      planElegido.id,
      { nombre: planElegido.nombreApi, ...limites[String(planElegido.id)] },
      planElegido.nombre,
    )
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
                  cta={`${esBajada(planActualApi, plan.nombreApi) ? 'Bajar a' : 'Mejorar a'} ${plan.nombre}`}
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
        {idPaso === 'confirmar' && bajadaBloqueada ? (
          <AvisoBajadaBloqueada plan={bajadaBloqueada.plan} excesos={bajadaBloqueada.excesos} rutaAjuste={rutaAjuste} />
        ) : null}
      </FormularioPorPasos>
    ),
  })
}

function ResumenPlan({ plan }: { plan: PlanUi }) {
  return (
    <div className="space-y-4 rounded-[14px] border border-hc-border bg-hc-surface p-5">
      <div>
        <p className="font-display text-lg font-bold">{plan.nombre}</p>
        {/* El monto ya va en los beneficios como «Mensualidad y comisión: [PENDIENTE]»; no se repite en grande. */}
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
  cta,
  seleccionado,
  onSelect,
  emp,
}: {
  plan: PlanUi
  actual: boolean
  /** «Mejorar a …» o «Bajar a …» según el plan actual (antes fijo por plan). */
  cta: string
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
            <span className="flex min-h-11 w-full items-center justify-center rounded-[12px] border border-hc-border text-[15px] font-bold text-hc-text">
              Tu plan actual
            </span>
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className={`flex min-h-11 w-full items-center justify-center rounded-[12px] text-[15px] font-bold ${
                seleccionado
                  ? 'border-2 border-hc-primary bg-[var(--hc-danger-bg)] text-hc-primary'
                  : 'bg-hc-primary text-white'
              }`}
            >
              {seleccionado ? 'Seleccionado' : cta}
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
    <article className={`rounded-[14px] bg-hc-surface p-4 ${borde}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-bold">{plan.nombre}</p>
          <p className="text-sm text-hc-muted">{plan.precio}</p>
        </div>
        {actual ? (
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: 'var(--hc-info-bg)', color: 'var(--hc-info)' }}
          >
            Tu plan actual
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
            className={`flex min-h-11 w-full items-center justify-center rounded-[12px] text-[15px] font-bold ${
              seleccionado
                ? 'border-2 border-hc-primary bg-[var(--hc-danger-bg)] text-hc-primary'
                : 'bg-hc-primary text-white'
            }`}
          >
            {seleccionado ? 'Seleccionado' : cta}
          </button>
        </div>
      ) : null}
    </article>
  )
}
