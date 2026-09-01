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
type ModoPrecio = 'FIJO' | 'RANGO' | 'COTIZACION'

const MODOS: { valor: ModoPrecio; titulo: string }[] = [
  { valor: 'FIJO', titulo: 'Precio fijo' },
  { valor: 'RANGO', titulo: 'Rango' },
  { valor: 'COTIZACION', titulo: 'Cotización' },
]

type Props = { personalizado?: boolean }

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
  const [modoPrecio, setModoPrecio] = useState<ModoPrecio>('FIJO')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [iniciado, setIniciado] = useState(false)
  const editar = Boolean(id)
  const esPersonalizado = personalizado && !editar

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
    if (esPersonalizado && modoPrecio === 'RANGO' && (!precioMin || !precioMax)) {
      setError('Indicá el rango de precio (mínimo y máximo).')
      return
    }
    const precioVenta = precioVentaGuardar(esPersonalizado, modoPrecio, venta, precioMin)
    const datos = {
      nombre,
      precioCompra: compra,
      precioVenta,
      descripcion,
      stock,
      categoria,
      estado,
      esPersonalizado: esPersonalizado || undefined,
      modoPrecioPersonalizado: esPersonalizado ? modoPrecio : undefined,
      precioPersonalizadoMin: esPersonalizado && modoPrecio === 'RANGO' ? precioMin : undefined,
      precioPersonalizadoMax: esPersonalizado && modoPrecio === 'RANGO' ? precioMax : undefined,
      instruccionesPersonalizacion: esPersonalizado ? instrucciones : undefined,
    }
    try {
      if (id) await guardarProductoVendedor(id, datos)
      else await publicarProductoVendedor(datos)
      navigate(ruta('productos'))
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo guardar el producto.'))
    }
  }

  const titulo = editar ? 'Editar Producto' : esPersonalizado ? 'Producto personalizado' : 'Nuevo Producto'
  const volverA = editar ? ruta('productos') : ruta('productos/nuevo')

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo={titulo} volverA={volverA} />
      {cargando && editar && !existente ? <p className="text-sm text-hc-muted">Cargando…</p> : null}
      <ZonaFoto editar={editar} nombre={existente?.nombre} />
      <form onSubmit={(e) => void enviar(e)}>
        <Campo etiqueta="Nombre del producto" value={nombre} onChange={setNombre} placeholder="Ej: Camiseta Oversize Negra" />
        {!esPersonalizado || modoPrecio === 'FIJO' ? (
          <>
            <Campo etiqueta="Precio de compra" value={compra} onChange={setCompra} placeholder="₡ 0.00" type="number" />
            <Campo etiqueta="Precio de venta" value={venta} onChange={setVenta} placeholder="₡ 0.00" type="number" />
          </>
        ) : null}
        {esPersonalizado ? (
          <CamposPersonalizado
            modoPrecio={modoPrecio}
            setModoPrecio={setModoPrecio}
            precioMin={precioMin}
            setPrecioMin={setPrecioMin}
            precioMax={precioMax}
            setPrecioMax={setPrecioMax}
            instrucciones={instrucciones}
            setInstrucciones={setInstrucciones}
          />
        ) : null}
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

function precioVentaGuardar(
  personalizado: boolean,
  modo: ModoPrecio,
  venta: string,
  precioMin: string,
): string {
  if (!personalizado) return venta
  if (modo === 'COTIZACION') return venta || '1'
  if (modo === 'RANGO') return precioMin || '1'
  return venta
}

function CamposPersonalizado({
  modoPrecio, setModoPrecio, precioMin, setPrecioMin, precioMax, setPrecioMax, instrucciones, setInstrucciones,
}: {
  modoPrecio: ModoPrecio
  setModoPrecio: (m: ModoPrecio) => void
  precioMin: string
  setPrecioMin: (v: string) => void
  precioMax: string
  setPrecioMax: (v: string) => void
  instrucciones: string
  setInstrucciones: (v: string) => void
}) {
  return (
    <div className="mb-4 space-y-3 rounded-xl border border-hc-border p-3">
      <p className="text-xs font-medium text-hc-muted" id="modo-precio-pyme">Cómo se define el precio</p>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="modo-precio-pyme">
        {MODOS.map((modo) => (
          <label key={modo.valor} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-hc-border px-3 py-1.5 text-xs">
            <input
              type="radio"
              name="modoPrecioPersonalizado"
              checked={modoPrecio === modo.valor}
              onChange={() => setModoPrecio(modo.valor)}
              aria-label={modo.titulo}
            />
            {modo.titulo}
          </label>
        ))}
      </div>
      {modoPrecio === 'RANGO' ? (
        <div className="grid grid-cols-2 gap-2">
          <Campo etiqueta="Precio mínimo" value={precioMin} onChange={setPrecioMin} type="number" placeholder="₡ 5.000" />
          <Campo etiqueta="Precio máximo" value={precioMax} onChange={setPrecioMax} type="number" placeholder="₡ 25.000" />
        </div>
      ) : null}
      <label htmlFor="instrucciones-pyme" className="mb-1 block text-xs font-medium text-hc-muted">
        Instrucciones para el cliente
      </label>
      <textarea
        id="instrucciones-pyme"
        className="min-h-[80px] w-full rounded-xl border border-hc-border px-3 py-2 text-sm"
        value={instrucciones}
        onChange={(e) => setInstrucciones(e.target.value)}
        placeholder="Ej: Subí foto del diseño."
        maxLength={3000}
      />
    </div>
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
