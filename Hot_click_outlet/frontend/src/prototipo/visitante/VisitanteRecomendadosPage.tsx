import { Link } from 'react-router-dom'
import VisitanteMain, { VisitanteEmptyState, VisitanteTitulo } from './VisitantePiezas'
import { visitanteRuta, type NegocioVisitante } from './visitanteMock'
import { useProductosVisitanteApi } from './useCatalogoVisitante'
import { negociosUnicos } from './visitanteCatalogo'

/**
 * Recomendados Visitante: negocios que sí tienen productos en la API.
 */
export default function VisitanteRecomendadosPage() {
  const { productos, cargando, error } = useProductosVisitanteApi()
  const negocios = negociosUnicos(productos)

  return (
    <VisitanteMain>
      <VisitanteTitulo sub="Negocios con productos reales en el catálogo">
        ¡Ya sabemos qué te gusta!
      </VisitanteTitulo>
      <CuerpoRecomendados negocios={negocios} cargando={cargando} error={error} />
    </VisitanteMain>
  )
}

function CuerpoRecomendados({
  negocios,
  cargando,
  error,
}: {
  negocios: NegocioVisitante[]
  cargando: boolean
  error: boolean
}) {
  if (cargando) return <p className="text-sm text-hc-muted">Cargando recomendaciones…</p>
  if (error) {
    return (
      <VisitanteEmptyState
        titulo="Catálogo no disponible"
        detalle="No pudimos cargar negocios. Intentá de nuevo en un momento."
      />
    )
  }
  if (negocios.length === 0) {
    return (
      <VisitanteEmptyState
        titulo="Todavía no hay negocios"
        detalle="Cuando haya productos en el catálogo, van a aparecer acá."
      />
    )
  }
  return (
    <>
      <h2 className="mb-3 text-[15px] font-bold">Negocios recomendados</h2>
      <ul className="flex flex-col gap-3">
        {negocios.map((negocio) => (
          <li key={negocio.id}>
            <Link
              to={visitanteRuta(`negocio/${negocio.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-hc-border p-3.5"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--hc-n-100)] text-base font-bold text-hc-muted">
                {negocio.inicial}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold">{negocio.nombre}</p>
                <p className="text-[10px] text-hc-muted">
                  {negocio.rubro} · {negocio.productos} productos
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
