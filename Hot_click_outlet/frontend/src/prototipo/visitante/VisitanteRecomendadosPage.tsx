import { Link } from 'react-router-dom'
import VisitanteMain, { VisitanteTitulo } from './VisitantePiezas'
import { NEGOCIOS_VISITANTE, visitanteRuta } from './visitanteMock'

/**
 * Recomendados Visitante (Figma 133:298).
 */
export default function VisitanteRecomendadosPage() {
  return (
    <VisitanteMain>
      <VisitanteTitulo sub="Según lo que te gustó, te pueden interesar estas categorías y estos negocios">
        ¡Ya sabemos qué te gusta!
      </VisitanteTitulo>
      <h2 className="mb-3 text-[15px] font-bold">Categorías para vos</h2>
      <div className="mb-6 flex gap-2.5">
        {['Hogar', 'Decoración'].map((cat) => (
          <Link
            key={cat}
            to={visitanteRuta('shop')}
            className="rounded-full bg-[var(--hc-blue-50)] px-4 py-2.5 text-xs font-bold text-hc-accent"
          >
            {cat}
          </Link>
        ))}
      </div>
      <h2 className="mb-3 text-[15px] font-bold">Negocios recomendados</h2>
      <ul className="flex flex-col gap-3">
        {NEGOCIOS_VISITANTE.map((negocio) => (
          <li key={negocio.id}>
            <Link
              to={visitanteRuta(`negocio/${negocio.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-hc-border p-3.5"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--hc-n-100)] text-base font-bold text-hc-muted">
                {negocio.inicial}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-bold">{negocio.nombre}</p>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                      negocio.plan === 'PLAN PYME'
                        ? 'bg-[var(--hc-blue-50)] text-hc-accent'
                        : 'bg-[var(--hc-n-100)] text-hc-muted'
                    }`}
                  >
                    {negocio.plan}
                  </span>
                </div>
                <p className="text-[10px] text-hc-muted">
                  {negocio.rubro} · {negocio.detalle}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </VisitanteMain>
  )
}
