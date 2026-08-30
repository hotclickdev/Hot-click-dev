import { useState } from 'react'
import VisitanteMain, {
  VisitanteChip,
  VisitanteEmptyState,
  VisitanteProductCard,
  VisitanteSearchField,
  VisitanteTitulo,
} from './VisitantePiezas'
import { CHIPS_SHOP, type CategoriaShop, type ProductoVisitante } from './visitanteMock'
import { useCatalogoVisitante } from './useCatalogoVisitante'

/**
 * Shop Visitante: catálogo API. Sin SKUs mock si el backend falla o está vacío.
 */
export default function VisitanteShopPage({ sinResultados = false }: { sinResultados?: boolean }) {
  const [categoria, setCategoria] = useState<CategoriaShop>('Todos')
  const [consulta, setConsulta] = useState(sinResultados ? 'xyz' : '')
  const { productos, cargando, error } = useCatalogoVisitante(categoria, consulta)
  const lista = sinResultados ? [] : productos

  return (
    <VisitanteMain>
      <VisitanteTitulo sub="Todo el catálogo de HotClick en un solo lugar">Shop</VisitanteTitulo>
      <VisitanteSearchField
        placeholder="Buscar productos"
        value={consulta}
        onChange={setConsulta}
        dataMm="vis-shop-buscar"
      />
      <div className="mb-6 flex gap-2.5 overflow-x-auto">
        {CHIPS_SHOP.map((chip) => (
          <VisitanteChip key={chip} activo={categoria === chip} onClick={() => setCategoria(chip)}>
            {chip}
          </VisitanteChip>
        ))}
      </div>
      <div data-mm="vis-shop-lista">
        <CuerpoShop cargando={cargando && !sinResultados} error={error && !sinResultados} productos={lista} />
      </div>
    </VisitanteMain>
  )
}

function CuerpoShop({
  cargando,
  error,
  productos,
}: {
  cargando: boolean
  error: boolean
  productos: ProductoVisitante[]
}) {
  if (cargando) {
    return <p className="text-sm text-hc-muted">Cargando productos…</p>
  }
  if (error) {
    return (
      <VisitanteEmptyState
        titulo="Catálogo no disponible"
        detalle="No pudimos cargar los productos. Intentá de nuevo en un momento."
      />
    )
  }
  if (productos.length === 0) {
    return (
      <VisitanteEmptyState
        titulo="No encontramos productos"
        detalle="Probá con otra palabra o revisá otra categoría"
      />
    )
  }
  return (
    <ul className="grid grid-cols-2 gap-4">
      {productos.map((producto) => (
        <li key={producto.id}>
          <VisitanteProductCard producto={producto} />
        </li>
      ))}
    </ul>
  )
}
