import { useMemo, useState } from 'react'
import VisitanteMain, {
  VisitanteChip,
  VisitanteEmptyState,
  VisitanteProductCard,
  VisitanteSearchField,
  VisitanteTitulo,
} from './VisitantePiezas'
import { CHIPS_SHOP, filtrarProductos, type CategoriaShop } from './visitanteMock'

/**
 * Shop Visitante (Figma 120:327) y vacío (155:553).
 */
export default function VisitanteShopPage({ sinResultados = false }: { sinResultados?: boolean }) {
  const [categoria, setCategoria] = useState<CategoriaShop>('Todos')
  const [consulta, setConsulta] = useState(sinResultados ? 'xyz' : '')
  const productos = useMemo(
    () => (sinResultados ? [] : filtrarProductos(categoria, consulta)),
    [categoria, consulta, sinResultados],
  )

  return (
    <VisitanteMain>
      <VisitanteTitulo sub="Todo el catálogo de HotClick en un solo lugar">Shop</VisitanteTitulo>
      <VisitanteSearchField placeholder="Buscar productos" value={consulta} onChange={setConsulta} />
      <div className="mb-6 flex gap-2.5 overflow-x-auto">
        {CHIPS_SHOP.map((chip) => (
          <VisitanteChip key={chip} activo={categoria === chip} onClick={() => setCategoria(chip)}>
            {chip}
          </VisitanteChip>
        ))}
      </div>
      {productos.length === 0 ? (
        <VisitanteEmptyState
          titulo="No encontramos productos"
          detalle="Probá con otra palabra o revisá otra categoría"
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {productos.map((producto) => (
            <li key={producto.id}>
              <VisitanteProductCard producto={producto} />
            </li>
          ))}
        </ul>
      )}
    </VisitanteMain>
  )
}
