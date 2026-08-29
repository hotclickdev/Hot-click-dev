import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boton, Campo, Chip, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useCatalogoVendedor } from './useCatalogoVendedor'
import {
  guardarProductoVendedor,
  mensajeErrorProducto,
  publicarProductoVendedor,
} from './catalogoVendedorApi'
import iconCamara from './assets/icon-camara.svg'

const CATEGORIAS = ['Tecnología', 'Ropa', 'Otro'] as const
type CategoriaForm = (typeof CATEGORIAS)[number]

/**
 * Alta / edición de producto (Figma 61:231 / 61:422) con API real.
 */
export default function ProductoFormPage() {
  const { id } = useParams()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const { seller, cargando } = useCatalogoVendedor()
  const existente = id ? seller.find((p) => p.id === id) : undefined
  const [nombre, setNombre] = useState('')
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('')
  const [categoria, setCategoria] = useState<CategoriaForm>('Tecnología')
  const [estado, setEstado] = useState<'Publicado' | 'Pausado'>('Publicado')
  const [error, setError] = useState<string | null>(null)
  const [iniciado, setIniciado] = useState(false)
  const editar = Boolean(id)

  useEffect(() => {
    if (!existente || iniciado) return
    setNombre(existente.nombre)
    setCompra(String(existente.precioCompra))
    setVenta(String(existente.precio))
    setDescripcion(existente.descripcion)
    setStock(String(existente.stock))
    setCategoria(existente.categoria)
    setEstado(existente.estado)
    setIniciado(true)
  }, [existente, iniciado])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim()) {
      setError('Escribí el nombre del producto.')
      return
    }
    const datos = { nombre, precioCompra: compra, precioVenta: venta, descripcion, stock, categoria, estado }
    try {
      if (id) await guardarProductoVendedor(id, datos)
      else await publicarProductoVendedor(datos)
      navigate(ruta('productos'))
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo guardar el producto.'))
    }
  }

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo={editar ? 'Editar Producto' : 'Nuevo Producto'} volverA={ruta('productos')} />
      {cargando && editar && !existente ? <p className="text-sm text-hc-muted">Cargando…</p> : null}
      <ZonaFoto editar={editar} nombre={existente?.nombre} />
      <form onSubmit={(e) => void enviar(e)}>
        <Campo etiqueta="Nombre del producto" value={nombre} onChange={setNombre} placeholder="Ej: Camiseta Oversize Negra" />
        <Campo etiqueta="Precio de compra" value={compra} onChange={setCompra} placeholder="₡ 0.00" type="number" />
        <Campo etiqueta="Precio de venta" value={venta} onChange={setVenta} placeholder="₡ 0.00" type="number" />
        <Campo etiqueta="Descripción" value={descripcion} onChange={setDescripcion} placeholder="Ej: Auriculares con estuche de carga..." />
        <Campo etiqueta="Stock disponible" value={stock} onChange={setStock} placeholder="Ej: 10" type="number" />
        <p className="mb-2 text-xs font-medium text-hc-muted">Categoría</p>
        <div className="mb-4 flex gap-2">
          {CATEGORIAS.map((item) => (
            <Chip key={item} activo={categoria === item} onClick={() => setCategoria(item)}>{item}</Chip>
          ))}
        </div>
        {editar ? (
          <>
            <p className="mb-2 text-xs font-medium text-hc-muted">Estado</p>
            <div className="mb-6 flex gap-2">
              <Chip activo={estado === 'Publicado'} onClick={() => setEstado('Publicado')}>Publicado</Chip>
              <Chip activo={estado === 'Pausado'} onClick={() => setEstado('Pausado')}>Pausado</Chip>
            </div>
          </>
        ) : null}
        {error ? <p className="mb-3 text-sm text-hc-danger">{error}</p> : null}
        <Boton type="submit">{editar ? 'Guardar cambios' : 'Publicar producto'}</Boton>
        {editar && id ? (
          <div className="mt-3">
            <Boton variante="suave" to={ruta(`productos/${id}/eliminar`)}>Eliminar producto</Boton>
          </div>
        ) : null}
      </form>
    </main>
  )
}

function ZonaFoto({ editar, nombre }: { editar: boolean; nombre?: string }) {
  return (
    <div className="mb-6 flex h-[118px] flex-col items-center justify-center rounded-xl bg-hc-surface-2">
      {editar ? (
        <>
          <p className="text-xs text-hc-muted">{nombre}.jpg</p>
          <span className="mt-2 rounded-full border border-hc-border px-3 py-1 text-xs">Cambiar foto</span>
        </>
      ) : (
        <>
          <span className="relative mb-2 block size-[26px] overflow-clip">
            <img src={iconCamara} alt="" width={26} height={26} className="size-full" />
          </span>
          <p className="text-sm text-hc-muted">Agregar foto</p>
        </>
      )}
    </div>
  )
}
