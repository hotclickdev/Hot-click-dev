import { useMemo, useState, type ReactNode } from 'react'
import BotonesAgregarProducto from './BotonesAgregarProducto'
import EntradaPagina from './motion/EntradaPagina'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'
import ListadoFeedback from './ListadoFeedback'
import { Chip } from './ui'
import FilaProductoLista from './FilaProductoLista'
import {
  FILTROS_PRODUCTOS,
  filtrarProductos,
  gruposProductosVisibles,
  type ProductoListaItem,
} from './productosListaHelpers'

export type ProductosListaVariante = 'emp' | 'seller'

type Props = Readonly<{
  productos: ProductoListaItem[]
  cargando: boolean
  error: string | null
  baseNuevo: string
  hrefProducto: (id: string) => string
  encabezado: ReactNode
  variante?: ProductosListaVariante
  mensajeVacio?: string
}>

/**
 * Vista compartida Mis Productos — chrome lo aporta Emp / Seller.
 */
export default function ProductosListaVista({
  productos,
  cargando,
  error,
  baseNuevo,
  hrefProducto,
  encabezado,
  variante = 'seller',
  mensajeVacio = 'Usá los botones de arriba para publicar catálogo o personalizado.',
}: Props) {
  const [filtro, setFiltro] = useState<string>('Todos')
  const visibles = useMemo(() => filtrarProductos(productos, filtro), [productos, filtro])
  const vacio = !cargando && productos.length === 0
  const emp = variante === 'emp'
  const mainClass = emp
    ? 'flex flex-col gap-6 px-5 py-8 md:max-w-[760px] md:gap-6 md:px-16 md:py-12'
    : 'px-5 pb-8 pt-[60px]'

  return (
    <main className={mainClass}>
      <EntradaPagina className={emp ? 'flex flex-col gap-6' : undefined}>
        {encabezado}

        {emp && vacio ? null : <BotonesAgregarProducto baseNuevo={baseNuevo} />}

        {emp ? (
          !vacio ? <FilaChipsFiltro valor={filtro} onChange={setFiltro} /> : null
        ) : (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {FILTROS_PRODUCTOS.map((item) => (
              <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>
                {item}
              </Chip>
            ))}
          </div>
        )}

        <div data-mm="seller-lista-productos">
          <ListadoFeedback
            cargando={cargando}
            error={error}
            cantidad={productos.length}
            skeletonLabel="Cargando catálogo"
            className={emp ? 'space-y-3' : 'mt-6 space-y-3'}
            empty={(
              <EstadoVacioConversacional
                titulo="Todavía no subiste productos"
                mensaje={mensajeVacio}
                accion={emp ? <BotonesAgregarProducto baseNuevo={baseNuevo} /> : undefined}
              />
            )}
          >
            {visibles.length === 0 ? (
              <p className={`text-sm text-hc-muted ${emp ? '' : 'mt-6'}`}>
                No hay productos en este filtro.
              </p>
            ) : emp ? (
              <ListadoGruposEmp productos={visibles} filtro={filtro} hrefProducto={hrefProducto} />
            ) : (
              <ListadoGruposSeller
                productos={visibles}
                filtro={filtro}
                hrefProducto={hrefProducto}
              />
            )}
          </ListadoFeedback>
        </div>
      </EntradaPagina>
    </main>
  )
}

function FilaChipsFiltro({
  valor,
  onChange,
}: {
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {FILTROS_PRODUCTOS.map((item) => (
        <Chip key={item} activo={valor === item} onClick={() => onChange(item)}>
          {item}
        </Chip>
      ))}
    </div>
  )
}

function ListadoGruposEmp({
  productos,
  filtro,
  hrefProducto,
}: {
  productos: ProductoListaItem[]
  filtro: string
  hrefProducto: (id: string) => string
}) {
  const grupos = gruposProductosVisibles(productos, filtro)
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((grupo) => (
        <section key={grupo.titulo} className="flex flex-col gap-4">
          <h2 className="text-[15px] font-bold">{grupo.titulo}</h2>
          <ListaStagger className="flex flex-col gap-4">
            {grupo.items.map((producto) => (
              <ItemListaStagger key={producto.id}>
                <FilaProductoLista producto={producto} to={hrefProducto(producto.id)} />
              </ItemListaStagger>
            ))}
          </ListaStagger>
        </section>
      ))}
    </div>
  )
}

function ListadoGruposSeller({
  productos,
  filtro,
  hrefProducto,
}: {
  productos: ProductoListaItem[]
  filtro: string
  hrefProducto: (id: string) => string
}) {
  const grupos =
    filtro === 'Todos'
      ? [
          { titulo: 'Recién agregados', items: productos.filter((p) => p.reciente) },
          { titulo: 'Tecnología', items: productos.filter((p) => p.categoria === 'Tecnología') },
          { titulo: 'Ropa', items: productos.filter((p) => p.categoria === 'Ropa') },
        ]
      : [{ titulo: filtro, items: productos }]

  return (
    <div className="mt-6 space-y-5">
      {grupos.map((grupo) =>
        grupo.items.length === 0 ? null : (
          <section key={grupo.titulo}>
            <h2 className="mb-3 text-[15px] font-bold">{grupo.titulo}</h2>
            <ListaStagger className="space-y-4">
              {grupo.items.map((producto) => (
                <ItemListaStagger key={producto.id}>
                  <FilaProductoLista producto={producto} to={hrefProducto(producto.id)} />
                </ItemListaStagger>
              ))}
            </ListaStagger>
          </section>
        ),
      )}
    </div>
  )
}
