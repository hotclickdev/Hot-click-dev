import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconoMas, IconoVolver } from './VisitanteIcons'
import VisitanteMain, {
  VisitanteBoton,
  VisitanteEmptyState,
  VisitanteProductCard,
  VisitanteSearchField,
} from './VisitantePiezas'
import { visitanteRuta, type NegocioVisitante, type ProductoVisitante } from './visitanteMock'
import { useProductosVisitanteApi } from './useCatalogoVisitante'
import { negocioDesdeProductos, productosDeNegocio } from './visitanteCatalogo'

/**
 * Perfil de negocio Visitante: productos de la API de esa tienda.
 */
export default function VisitanteNegocioPage() {
  const { id } = useParams()
  const { productos: catalogo, cargando, error } = useProductosVisitanteApi()
  const deTienda = productosDeNegocio(id, catalogo)
  const negocio = id ? negocioDesdeProductos(id, deTienda) : null

  return (
    <CuerpoNegocio
      negocio={negocio}
      deTienda={deTienda}
      cargando={cargando}
      error={error}
    />
  )
}

function CuerpoNegocio({
  negocio,
  deTienda,
  cargando,
  error,
}: {
  negocio: NegocioVisitante | null
  deTienda: ProductoVisitante[]
  cargando: boolean
  error: boolean
}) {
  if (cargando) {
    return (
      <VisitanteMain>
        <p className="text-sm text-hc-muted">Cargando tienda…</p>
      </VisitanteMain>
    )
  }
  if (error) {
    return (
      <VisitanteMain>
        <VisitanteEmptyState
          titulo="Tienda no disponible"
          detalle="No pudimos cargar este negocio. Intentá de nuevo en un momento."
        />
      </VisitanteMain>
    )
  }
  if (!negocio) {
    return (
      <VisitanteMain>
        <VisitanteEmptyState
          titulo="Negocio no encontrado"
          detalle="Esta tienda no tiene productos en el catálogo."
        />
        <div className="mt-4">
          <VisitanteBoton to={visitanteRuta('shop')}>Ver el shop</VisitanteBoton>
        </div>
      </VisitanteMain>
    )
  }
  return <PerfilNegocio negocio={negocio} deTienda={deTienda} />
}

function PerfilNegocio({
  negocio,
  deTienda,
}: {
  negocio: NegocioVisitante
  deTienda: ProductoVisitante[]
}) {
  const [sigue, setSigue] = useState(false)
  const [consulta, setConsulta] = useState('')
  const q = consulta.trim().toLowerCase()
  const productos = deTienda.filter((item) => !q || item.nombre.toLowerCase().includes(q))

  return (
    <div className="mx-auto max-w-md bg-hc-surface">
      <div className="relative h-[130px] bg-gradient-to-r from-hc-accent to-[var(--hc-blue-800)]">
        <Link
          to={visitanteRuta('recomendados')}
          aria-label="Volver"
          className="absolute left-5 top-[60px] flex size-[38px] items-center justify-center rounded-full bg-hc-surface"
        >
          <IconoVolver className="size-5" />
        </Link>
      </div>
      <div className="flex gap-3.5 px-[22px]">
        <div className="-mt-8 flex size-[72px] items-center justify-center rounded-[20px] border-4 border-white bg-hc-surface font-display text-[28px] font-bold text-hc-accent">
          {negocio.inicial}
        </div>
        <div className="pt-10">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[17px] font-bold">{negocio.nombre}</h1>
          </div>
          <p className="mt-1 text-[11px] text-hc-muted">
            {negocio.productos} productos · {negocio.rubro}
          </p>
        </div>
      </div>
      <VisitanteMain conNav={false} className="pt-4">
        <div className="mb-5 grid grid-cols-2 gap-2.5">
          <VisitanteBoton onClick={() => setSigue((v) => !v)} className="gap-1 py-3 text-[13px]">
            {sigue ? 'Siguiendo' : (
              <>
                <IconoMas className="size-4" /> Seguir
              </>
            )}
          </VisitanteBoton>
          <VisitanteBoton to={visitanteRuta('asesor-ia')} variant="ghost" className="py-3 text-[13px]">
            Mensaje
          </VisitanteBoton>
        </div>
        <VisitanteSearchField placeholder="Buscar en esta tienda" value={consulta} onChange={setConsulta} />
        <h2 className="mb-3 text-[15px] font-bold">Productos</h2>
        {productos.length === 0 ? (
          <VisitanteEmptyState titulo="Sin productos" detalle="No hay artículos que coincidan con la búsqueda." />
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {productos.map((producto) => (
              <li key={producto.id}>
                <VisitanteProductCard producto={producto} />
              </li>
            ))}
          </ul>
        )}
      </VisitanteMain>
    </div>
  )
}
