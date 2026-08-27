import { Link } from 'react-router-dom'
import { IconoCorazon } from './VisitanteIcons'
import VisitanteMain, { VisitanteBackHeader, VisitantePrecio, VisitanteThumb } from './VisitantePiezas'
import { FAVORITOS_IDS, productoPorId, visitanteRuta } from './visitanteMock'

/**
 * Favoritos Visitante (Figma 151:298).
 */
export default function VisitanteFavoritosPage() {
  const productos = FAVORITOS_IDS.map((id) => productoPorId(id))
  return (
    <VisitanteMain>
      <VisitanteBackHeader titulo="Favoritos" to={visitanteRuta('cuenta')} />
      <ul className="grid grid-cols-2 gap-3">
        {productos.map((producto) => (
          <li key={producto.id}>
            <Link to={visitanteRuta(`producto/${producto.id}`)} className="flex flex-col gap-1.5">
              <VisitanteThumb altura="h-[110px]">
                <span className="absolute left-2 top-2 flex size-[26px] items-center justify-center rounded-full bg-hc-surface text-hc-primary">
                  <IconoCorazon className="size-3" />
                </span>
              </VisitanteThumb>
              <p className="text-[11px] font-medium">{producto.nombre}</p>
              <p className="text-[9px] text-hc-muted">{producto.negocio}</p>
              <VisitantePrecio colones={producto.precio} className="text-xs" />
            </Link>
          </li>
        ))}
      </ul>
    </VisitanteMain>
  )
}
