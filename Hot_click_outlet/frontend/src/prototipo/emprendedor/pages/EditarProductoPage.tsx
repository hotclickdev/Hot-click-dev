import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import BotonSecundario from '../ui/BotonSecundario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import FilaChips from '../ui/FilaChips'
import { CATEGORIAS_PRODUCTO, RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { guardarProductoVendedor, mensajeErrorProducto } from '@/prototipo/compartido/catalogoVendedorApi'
import type { EstadoPublicacion } from '../types'

const ESTADOS = ['Publicado', 'Pausado'] as const

/**
 * Paso 6 Editar Producto (Figma 18:2) — guarda en el catálogo real.
 */
export default function EditarProductoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos, cargando } = useCatalogoEmprendedor()
  const original = useMemo(() => productos.find((p) => p.id === id), [productos, id])
  const [nombre, setNombre] = useState('')
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('')
  const [categoria, setCategoria] = useState('Tecnología')
  const [estado, setEstado] = useState('Publicado')
  const [error, setError] = useState<string | null>(null)
  const [iniciado, setIniciado] = useState(false)

  useEffect(() => {
    if (!original || iniciado) return
    setNombre(original.nombre)
    setCompra(String(original.precioCompra))
    setVenta(String(original.precio))
    setDescripcion(original.descripcion)
    setStock(String(original.stock))
    setCategoria(original.categoria)
    setEstado(original.estado)
    setIniciado(true)
  }, [original, iniciado])

  if (cargando) {
    return (
      <main className="px-5 py-8">
        <CabeceraAtras titulo="Editar Producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
        <p className="mt-6 text-sm text-hc-muted">Cargando producto…</p>
      </main>
    )
  }

  if (!original) {
    return (
      <main className="px-5 py-8">
        <CabeceraAtras titulo="Editar Producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
        <p className="mt-6 text-sm text-hc-muted">No encontramos ese producto.</p>
      </main>
    )
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    try {
      await guardarProductoVendedor(id, {
        nombre,
        precioCompra: compra,
        precioVenta: venta,
        descripcion,
        stock,
        categoria,
        estado: estado as EstadoPublicacion,
      })
      navigate(`${RUTA_EMPRENDEDOR}/productos`)
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo guardar el producto.'))
    }
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 py-8">
      <CabeceraAtras titulo="Editar Producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
      <form className="flex flex-col gap-5" onSubmit={(e) => void guardar(e)}>
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
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <BotonPrimario type="submit">Guardar cambios</BotonPrimario>
        <BotonSecundario tono="peligro" onClick={() => navigate(`${RUTA_EMPRENDEDOR}/productos/${id}/eliminar`)}>
          Eliminar producto
        </BotonSecundario>
      </form>
    </main>
  )
}
