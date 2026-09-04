import ProductosListaVista from './ProductosListaVista'
import { EncabezadoPagina } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'
import { useCatalogoVendedor } from './useCatalogoVendedor'
import { aProductoListaItem } from './productosListaHelpers'

/**
 * Listado Mis Productos (Figma 61:142) — chrome Seller + vista compartida.
 */
export default function ProductosPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const { seller, cargando, error } = useCatalogoVendedor()

  return (
    <ProductosListaVista
      productos={seller.map(aProductoListaItem)}
      cargando={cargando}
      error={error}
      baseNuevo={ruta('productos/nuevo')}
      hrefProducto={(id) => ruta(`productos/${id}/editar`)}
      variante="seller"
      encabezado={<EncabezadoPagina titulo="Mis Productos" subtitulo={`Outlet · ${plan.usuario}`} />}
    />
  )
}
