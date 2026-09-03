import { useEffect, useMemo, useState, type ReactNode } from 'react'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import OnvoSuscripcionEmbed from '@/features/billing/OnvoSuscripcionEmbed'
import { useCambiarPlan } from '@/features/billing/useCambiarPlan'
import FormularioPorPasos, { ProgresoPasos } from '@/prototipo/compartido/FormularioPorPasos'
import type { Id } from '@/types/api'
import {
  mapApiPlanToUi,
  PASOS_CAMBIAR_PLAN,
  TOTAL_PASOS_PLAN,
  validarPasoElegirPlan,
  type PlanUi,
} from '@/prototipo/compartido/planesPageHelpers'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import { ItemListaStagger, ListaStagger } from '@/prototipo/compartido/motion/ListaStagger'

/**
 * Comparar planes — wizard conversacional: elegir → confirmar → pago ONVO.
 */
export default function PlanesPage() {
  const planNombre = useTenantStore((s) => s.planNombre)
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
  } = useCambiarPlan({ rutaExito: `${RUTA_EMPRENDEDOR}/opciones/plan/actualizado` })

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

  const actual = useMemo(
    () => (planNombre || 'EMPRENDEDOR').toUpperCase(),
    [planNombre],
  )

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
      <ShellPlanes error={error}>
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
        <button
          type="button"
          onClick={volverDesdePago}
          className="flex min-h-11 w-full items-center justify-center rounded-[14px] border border-hc-border py-3.5 text-[13px] font-medium text-hc-text"
        >
          Atrás
        </button>
      </ShellPlanes>
    )
  }

  return (
    <ShellPlanes error={error}>
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
            <ListaStagger className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-5">
              {planes.map((plan) => (
                <ItemListaStagger key={String(plan.id)} className="flex-1">
                  <TarjetaPlan
                    plan={plan}
                    actual={plan.nombreApi === actual}
                    seleccionado={planElegido?.id === plan.id}
                    onSelect={() => setPlanElegido(plan)}
                  />
                </ItemListaStagger>
              ))}
            </ListaStagger>
          ) : null}
          {idPaso === 'confirmar' && planElegido ? (
            <ResumenPlan plan={planElegido} />
          ) : null}
        </FormularioPorPasos>
      )}
    </ShellPlanes>
  )
}

function ShellPlanes({ children, error }: { children: ReactNode; error: string | null }) {
  return (
    <main className="px-5 pb-10 pt-8 md:px-16 md:py-12">
      <EntradaPagina className="flex flex-col gap-[18px] md:gap-6">
        <div className="md:hidden">
          <CabeceraAtras titulo="Tu Plan" to={`${RUTA_EMPRENDEDOR}/opciones`} />
          <p className="text-xs text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
        </div>
        <header className="hidden md:block">
          <h1 className="font-display text-[28px] font-bold">Tu Plan</h1>
          <p className="mt-1 text-sm text-hc-muted">Elegí el plan que mejor se ajuste a tu negocio</p>
        </header>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {children}
      </EntradaPagina>
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

function TarjetaPlan({ plan, actual, seleccionado, onSelect }: {
  plan: PlanUi
  actual: boolean
  seleccionado: boolean
  onSelect: () => void
}) {
  const borde = actual || seleccionado
    ? 'border-2 border-hc-primary bg-hc-surface'
    : 'border border-hc-border bg-hc-surface'

  return (
    <article className={`flex flex-1 flex-col gap-3 rounded-xl p-5 md:px-5 md:py-6 ${borde}`}>
      <p className="font-display text-base font-bold md:text-lg">{plan.nombre}</p>
      <p className="font-display text-lg font-bold text-hc-primary md:text-[22px]">{plan.precio}</p>
      <ul className="flex flex-col gap-2">
        {plan.beneficios.map((b) => (
          <li key={b} className="text-[11px] text-hc-muted md:text-[13px]">
            ✓ {b}
          </li>
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
