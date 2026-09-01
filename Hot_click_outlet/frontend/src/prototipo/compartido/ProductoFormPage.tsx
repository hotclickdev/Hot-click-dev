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
import CamposPersonalizadoProducto from './CamposPersonalizadoProducto'
import ZonaFotoProducto from './ZonaFotoProducto'
import {
  type ModoPrecioPersonalizado,
  modosPrecioPersonalizadoHabilitados,
  preciosAlPublicar,
  tituloFormProducto,
} from './personalizadoProductoHelpers'

const CATEGORIAS = ['Tecnología', 'Ropa', 'Otro'] as const
type CategoriaForm = (typeof CATEGORIAS)[number]

type Props = Readonly<{ personalizado?: boolean }>

/**
 * Alta / edición de producto (Figma 61:231 / 61:422) con API real.
 */
export default function ProductoFormPage({ personalizado = false }: Props) {
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
  const [instrucciones, setInstrucciones] = useState('')
  const [modoPrecio, setModoPrecio] = useState<ModoPrecioPersonalizado>('COTIZACION')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [iniciado, setIniciado] = useState(false)
  const editar = Boolean(id)
  const esPersonalizado = personalizado && !editar
    ? true
    : existente?.esPersonalizado === true

  useEffect(() => {
    if (!existente || iniciado) return
    setNombre(existente.nombre)
    setCompra(String(existente.precioCompra))
    setVenta(String(existente.precio))
    setDescripcion(existente.descripcion)
    setStock(String(existente.stock))
    setCategoria(existente.categoria)
    setEstado(existente.estado)
    setInstrucciones(existente.instruccionesPersonalizacion ?? '')
    setModoPrecio((existente.modoPrecioPersonalizado as ModoPrecioPersonalizado) || 'COTIZACION')
    setPrecioMin(existente.precioPersonalizadoMin != null ? String(existente.precioPersonalizadoMin) : '')
    setPrecioMax(existente.precioPersonalizadoMax != null ? String(existente.precioPersonalizadoMax) : '')
    setImagenUrl(existente.imagenUrl ?? '')
    setIniciado(true)
  }, [existente, iniciado])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim()) {
      setError('Escribí el nombre del producto.')
      return
    }
    if (esPersonalizado && modosPrecioPersonalizadoHabilitados() && modoPrecio === 'RANGO' && (!precioMin || !precioMax)) {
      setError('Indicá el rango de precio (mínimo y máximo).')
      return
    }
    const precios = preciosAlPublicar(esPersonalizado, compra, venta, {
      modoPrecio: esPersonalizado ? modoPrecio : undefined,
      precioMin,
      precioMax,
    })
    const datos = {
      nombre,
      precioCompra: precios.precioCompra,
      precioVenta: precios.precioVenta,
      descripcion,
      stock,
      categoria,
      estado,
      esPersonalizado: esPersonalizado || undefined,
      modoPrecioPersonalizado: precios.modoPrecioPersonalizado,
      precioPersonalizadoMin: precios.precioPersonalizadoMin,
      precioPersonalizadoMax: precios.precioPersonalizadoMax,
      instruccionesPersonalizacion: esPersonalizado ? instrucciones : undefined,
      imagenUrl: imagenUrl || undefined,
    }
    try {
      if (id) await guardarProductoVendedor(id, datos)
      else await publicarProductoVendedor(datos)
      navigate(ruta('productos'))
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo guardar el producto.'))
    }
  }

  const volverA = editar ? ruta('productos') : ruta('productos/nuevo')

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo={tituloFormProducto(editar, esPersonalizado)} volverA={volverA} />
      {cargando && editar && !existente ? <p className="text-sm text-hc-muted">Cargando…</p> : null}
      <ZonaFotoProducto imagenUrl={imagenUrl} onImagenChange={setImagenUrl} />
      <form onSubmit={(e) => void enviar(e)}>
        <Campo etiqueta="Nombre del producto" value={nombre} onChange={setNombre} placeholder="Ej: Camiseta Oversize Negra" />
        {!esPersonalizado ? (
          <>
            <Campo etiqueta="Precio de compra" value={compra} onChange={setCompra} placeholder="₡ 0.00" type="number" />
            <Campo etiqueta="Precio de venta" value={venta} onChange={setVenta} placeholder="₡ 0.00" type="number" />
          </>
        ) : (
          <CamposPersonalizadoProducto
            idPrefijo="pyme"
            instrucciones={instrucciones}
            onInstruccionesChange={setInstrucciones}
            modoPrecio={modoPrecio}
            onModoChange={setModoPrecio}
            precioMin={precioMin}
            onPrecioMinChange={setPrecioMin}
            precioMax={precioMax}
            onPrecioMaxChange={setPrecioMax}
            compra={compra}
            onCompraChange={setCompra}
            venta={venta}
            onVentaChange={setVenta}
          />
        )}
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
