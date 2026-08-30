import { Link } from 'react-router-dom'
import { IconoCorazon } from './VisitanteIcons'
import useWishlistStore from '@/store/wishlistStore'
import VisitanteMain, {
  VisitanteBackHeader,
  VisitanteEmptyState,
  VisitantePrecio,
  VisitanteThumb,
} from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

/**
 * Favoritos Visitante: wishlist real, no SKUs mock.
 */
export default function VisitanteFavoritosPage() {
  const items = useWishlistStore((s) => s.items)

  return (
    <VisitanteMain>
      <VisitanteBackHeader titulo="Favoritos" to={visitanteRuta('cuenta')} />
      {items.length === 0 ? (
        <VisitanteEmptyState
          titulo="Todavía no hay favoritos"
          detalle="Guardá productos desde el catálogo y van a aparecer acá."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link to={visitanteRuta(`producto/${item.id}`)} className="flex flex-col gap-1.5">
                <VisitanteThumb altura="h-[110px]" imagenUrl={item.imagenUrl}>
                  <span className="absolute left-2 top-2 flex size-[26px] items-center justify-center rounded-full bg-hc-surface text-hc-primary">
                    <IconoCorazon className="size-3" />
                  </span>
                </VisitanteThumb>
                <p className="text-[11px] font-medium">{item.nombre}</p>
                <VisitantePrecio colones={item.precio} className="text-xs" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </VisitanteMain>
  )
}
