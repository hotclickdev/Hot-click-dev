import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import BotonSecundario from '../ui/BotonSecundario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import FilaChips from '../ui/FilaChips'
import { CATEGORIAS_PRODUCTO, RUTA_EMPRENDEDOR } from '../constants'
import { PRODUCTOS_DEMO } from '../data/catalogoDemo'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { esCategoriaProducto, useEmprendedorDemoStore } from '../store/emprendedorDemoStore'
import type { EstadoPublicacion } from '../types'

const ESTADOS = ['Publicado', 'Pausado'] as const

/**
 * Paso 6 Editar Producto (Figma 18:2).
 */
export default function EditarProductoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos } = useCatalogoEmprendedor()
  const actualizarProducto = useEmprendedorDemoStore((estadoStore) => estadoStore.actualizarProducto)
  const original = useMemo(
    () => productos.find((p) => p.id === id) ?? PRODUCTOS_DEMO.find((p) => p.id === id),
    [productos, id],
  )
  const [nombre, setNombre] = useState(original?.nombre ?? '')
  const [compra, setCompra] = useState(String(original?.precioCompra ?? ''))
  const [venta, setVenta] = useState(String(original?.precio ?? ''))
  const [descripcion, setDescripcion] = useState(original?.descripcion ?? '')
  const [stock, setStock] = useState(String(original?.stock ?? ''))
  const [categoria, setCategoria] = useState<string>(original?.categoria ?? 'Tecnología')
  const [estado, setEstado] = useState<string>(original?.estado ?? 'Publicado')

  if (!original) {
    return (
      <main className="px-5 py-8">
        <CabeceraAtras titulo="Editar Producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
        <p className="mt-6 text-sm text-hc-muted">No encontramos ese producto.</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 py-8">
      <CabeceraAtras titulo="Editar Producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-[var(--hc-n-100)] py-8">
        <p className="text-[11px] font-medium text-hc-muted">{original.nombre}.jpg</p>
        <span className="rounded-full border border-hc-border bg-hc-surface px-3 py-1.5 text-[11px] font-medium text-hc-primary">
          Cambiar foto
        </span>
      </div>
      <form className="flex flex-col gap-5" onSubmit={guardar}>
        <CampoTexto etiqueta="Nombre del producto" value={nombre} onChange={setNombre} />
        <CampoTexto etiqueta="Precio de compra" value={compra} onChange={setCompra} type="number" />
        <CampoTexto etiqueta="Precio de venta" value={venta} onChange={setVenta} type="number" />
        <CampoTexto etiqueta="Descripción" value={descripcion} onChange={setDescripcion} />
        <CampoTexto etiqueta="Stock disponible" value={stock} onChange={setStock} type="number" />
        <div>
          <p className="mb-2 text-xs font-medium text-hc-muted">Categoría</p>
          <FilaChips valor={categoria} opciones={CATEGORIAS_PRODUCTO} onChange={setCategoria} />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-hc-muted">Estado</p>
          <FilaChips valor={estado} opciones={ESTADOS} onChange={setEstado} />
        </div>
        <BotonPrimario type="submit">Guardar cambios</BotonPrimario>
        <BotonSecundario tono="peligro" onClick={() => navigate(`${RUTA_EMPRENDEDOR}/productos/${id}/eliminar`)}>
          Eliminar producto
        </BotonSecundario>
      </form>
    </main>
  )

  function guardar(evento: FormEvent) {
    evento.preventDefault()
    if (!esCategoriaProducto(categoria)) return
    actualizarProducto(id, {
      nombre,
      precioCompra: compra,
      precioVenta: venta,
      descripcion,
      stock,
      categoria,
      estado: estado as EstadoPublicacion,
    })
    navigate(`${RUTA_EMPRENDEDOR}/productos`)
  }
}
