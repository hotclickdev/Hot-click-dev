import ProductosListaVista from '@/prototipo/compartido/ProductosListaVista'
import { aProductoListaItem } from '@/prototipo/compartido/productosListaHelpers'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { useCuentaVendedor } from '../hooks/useCuentaVendedor'

/**
 * Mis Productos — chrome Emp + vista compartida.
 */
export default function ProductosPage() {
  const { productos, cargando, error } = useCatalogoEmprendedor()
  const { usuario } = useCuentaVendedor()

  return (
    <ProductosListaVista
      productos={productos.map(aProductoListaItem)}
      cargando={cargando}
      error={error}
      baseNuevo={`${RUTA_EMPRENDEDOR}/productos/nuevo`}
      hrefProducto={(id) => `${RUTA_EMPRENDEDOR}/productos/${id}/editar`}
      variante="emp"
      mensajeVacio="Agregá tu primer producto para empezar a vender"
      encabezado={(
        <header>
          <h1 className="font-display text-[22px] font-bold md:text-[28px]">Mis Productos</h1>
          <p className="text-xs text-hc-muted md:hidden">Outlet · {usuario}</p>
        </header>
      )}
    />
  )
}
