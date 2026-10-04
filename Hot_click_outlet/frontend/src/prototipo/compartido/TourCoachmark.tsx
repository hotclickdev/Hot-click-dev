import { useEffect } from 'react'
import { Boton } from './ui'
import { marcarTourPantallaActiva } from './tourSellerSenal'
import { useTourSeller } from './useTourSeller'

/**
 * Franja de la guía dentro de bodegas, productos, cobro y datos del negocio.
 */
export default function TourCoachmark() {
  const tour = useTourSeller()
  const pasoId = tour.pasoRuta
  const vista = tour.vista
  const paso = vista?.pasos.find((item) => item.id === pasoId) ?? null
  const visible = Boolean(tour.listo && vista && !vista.oculto && paso && !vista.lista)

  useEffect(() => {
    marcarTourPantallaActiva(visible)
    return () => marcarTourPantallaActiva(false)
  }, [visible])

  if (!visible || !paso || !vista) return null

  if (paso.bloqueado) {
    const anterior = vista.pasos.find((item) => item.id === 'bodega')
    return (
      <div
        className="mx-5 mt-4 rounded-xl px-4 py-3 text-left md:mx-12"
        style={{ background: 'var(--hc-warning-bg, var(--hc-info-bg))', color: 'var(--hc-text)' }}
        data-testid="tour-bloqueo-producto"
      >
        <p className="text-sm font-semibold">Primero creá una bodega</p>
        <p className="mt-1 text-xs text-hc-muted">
          Sin bodega no podés publicar un producto. Ahí queda el inventario y quién está a cargo.
        </p>
        <div className="mt-3 max-w-xs">
          <Boton to={vista.rutas[anterior?.id ?? 'bodega']}>Crear mi bodega primero</Boton>
        </div>
      </div>
    )
  }

  const siguiente = vista.siguiente
  return (
    <div
      className="mx-5 mt-4 rounded-xl border border-hc-border bg-hc-surface px-4 py-3 text-left md:mx-12"
      data-testid="tour-coachmark"
    >
      <p className="text-sm font-semibold">{paso.completo ? 'Paso listo' : paso.titulo}</p>
      <p className="mt-1 text-xs text-hc-muted">
        {paso.completo
          ? 'Esto ya está. Podés seguir con el siguiente paso de la guía.'
          : paso.detalle}
      </p>
      {paso.completo && siguiente && siguiente.id !== paso.id ? (
        <div className="mt-3 max-w-xs">
          <Boton
            to={vista.rutas[siguiente.id]}
            onClick={siguiente.id === 'tienda' ? tour.marcarTiendaVista : undefined}
          >
            Siguiente: {siguiente.titulo}
          </Boton>
        </div>
      ) : null}
    </div>
  )
}
