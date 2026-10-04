import { Link } from 'react-router-dom'
import { Boton } from './ui'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'
import PantallaExitoWizard from './motion/PantallaExitoWizard'
import StepperDotLine from './motion/StepperDotLine'
import { useTourSeller } from './useTourSeller'

/**
 * Guía en orden en el menú del vendedor. El progreso sale de bodegas, productos y cobro reales.
 */
export default function TourChecklist() {
  const tour = useTourSeller()
  if (!tour.listo) return null
  if (tour.error) {
    return (
      <div className="mb-4 w-full rounded-xl border border-hc-border bg-hc-surface px-4 py-3 text-left" data-testid="tour-checklist">
        <p className="text-sm font-semibold">No pudimos cargar tu guía.</p>
        <p className="mt-1 text-xs text-hc-muted">Intenta nuevamente.</p>
        <button type="button" className="mt-2 min-h-11 text-sm font-bold underline" onClick={tour.reintentar}>
          Reintentar
        </button>
      </div>
    )
  }
  if (!tour.vista || tour.vista.oculto) return null
  const { vista } = tour

  if (vista.minimizado && !vista.lista) {
    return (
      <button
        type="button"
        className="mb-4 min-h-11 w-full rounded-xl border border-hc-border bg-hc-surface px-4 text-left text-sm font-semibold"
        onClick={tour.expandir}
        data-testid="tour-checklist"
      >
        Seguir la guía · paso {vista.indice + 1} de {vista.pasos.filter((p) => !p.opcional).length}
      </button>
    )
  }

  if (vista.lista) {
    return (
      <div className="mb-4 w-full" data-testid="tour-checklist">
        <PantallaExitoWizard
          titulo="Tu negocio ya puede vender"
          mensaje="Bodega, producto, cobro y datos quedaron listos."
          accion={(
            <button type="button" className="min-h-11 text-sm font-bold underline" onClick={tour.descartar}>
              Ocultar guía
            </button>
          )}
        />
      </div>
    )
  }

  const siguiente = vista.siguiente
  return (
      <section
        className="mb-4 w-full rounded-xl border border-hc-border bg-hc-surface px-4 py-4 text-left"
        data-testid="tour-checklist"
        aria-label="Guía para arrancar"
      >
        <p className="text-sm font-semibold">Guía para arrancar</p>
        <p className="mt-1 text-xs text-hc-muted">Seguí el orden. Cada paso se marca solo cuando ya existe.</p>
        <div className="mt-3">
          <StepperDotLine total={vista.pasos.length} indice={vista.indice} />
        </div>
        <ListaStagger className="mt-3 flex flex-col gap-2">
          {vista.pasos.map((paso) => (
            <ItemListaStagger key={paso.id}>
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{
                    background: paso.completo ? 'var(--hc-success-bg)' : 'var(--hc-surface-2)',
                    color: paso.completo ? 'var(--hc-success)' : 'var(--hc-muted)',
                  }}
                  aria-hidden
                >
                  {paso.completo ? '✓' : paso.bloqueado ? '·' : ''}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {paso.titulo}
                    {paso.opcional ? <span className="ml-1 text-xs font-medium text-hc-muted">Opcional</span> : null}
                    {paso.bloqueado ? <span className="ml-1 text-xs font-medium text-hc-muted">Bloqueado</span> : null}
                  </p>
                  <p className="text-xs text-hc-muted">{paso.detalle}</p>
                </div>
              </div>
            </ItemListaStagger>
          ))}
        </ListaStagger>
        {siguiente ? (
          <div className="mt-4">
            <Boton
              to={vista.rutas[siguiente.id]}
              onClick={siguiente.id === 'tienda' ? tour.marcarTiendaVista : undefined}
              data-testid="tour-hacer-paso"
            >
              Hacer este paso
            </Boton>
          </div>
        ) : null}
        <div className="mt-2 flex gap-4">
          <button type="button" className="min-h-11 text-xs font-semibold text-hc-muted" onClick={tour.minimizar}>
            Minimizar
          </button>
          <button type="button" className="min-h-11 text-xs font-semibold text-hc-muted" onClick={tour.descartar}>
            Ocultar
          </button>
        </div>
        {siguiente?.bloqueado ? (
          <p className="mt-2 text-xs text-hc-muted">
            <Link to={vista.rutas.bodega} className="font-semibold underline">Completá el paso anterior</Link>
          </p>
        ) : null}
      </section>
  )
}
