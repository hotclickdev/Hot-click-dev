import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import iconCamara from '../assets/icon-camara.svg'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import FilaChips from '../ui/FilaChips'
import { CATEGORIAS_PRODUCTO, RUTA_EMPRENDEDOR } from '../constants'
import { mensajeErrorProducto, publicarProductoVendedor } from '@/prototipo/compartido/catalogoVendedorApi'

type ModoPrecio = 'FIJO' | 'RANGO' | 'COTIZACION'

const MODOS_PRECIO: { valor: ModoPrecio; titulo: string; ayuda: string }[] = [
  { valor: 'FIJO', titulo: 'Precio fijo', ayuda: 'El cliente paga de una vez.' },
  { valor: 'RANGO', titulo: 'Rango', ayuda: 'Mostrás desde–hasta y cotizás dentro del rango.' },
  { valor: 'COTIZACION', titulo: 'Cotización', ayuda: 'Sin precio público: revisás y cotizás después.' },
]

type Props = { personalizado?: boolean }

/**
 * Paso agregar producto — catálogo o personalizado según `personalizado`.
 */
export default function AgregarProductoPage({ personalizado = false }: Props) {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('')
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS_PRODUCTO)[number]>('Tecnología')
  const [modoPrecio, setModoPrecio] = useState<ModoPrecio>('FIJO')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [instrucciones, setInstrucciones] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim()) {
      setError('Escribí el nombre del producto.')
      return
    }
    if (personalizado && modoPrecio === 'RANGO' && (!precioMin || !precioMax)) {
      setError('Indicá el rango de precio (mínimo y máximo).')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await publicarProductoVendedor({
        nombre,
        precioCompra: compra,
        precioVenta: ventaParaGuardar(personalizado, modoPrecio, venta, precioMin),
        descripcion,
        stock,
        categoria,
        esPersonalizado: personalizado,
        modoPrecioPersonalizado: personalizado ? modoPrecio : undefined,
        precioPersonalizadoMin: personalizado && modoPrecio === 'RANGO' ? precioMin : undefined,
        precioPersonalizadoMax: personalizado && modoPrecio === 'RANGO' ? precioMax : undefined,
        instruccionesPersonalizacion: personalizado ? instrucciones : undefined,
      })
      navigate(`${RUTA_EMPRENDEDOR}/productos`)
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo publicar el producto.'))
    } finally {
      setGuardando(false)
    }
  }

  const titulo = personalizado ? 'Producto personalizado' : 'Nuevo Producto'

  return (
    <main className="flex flex-col gap-[22px] px-5 py-8">
      <CabeceraAtras titulo={titulo} to={`${RUTA_EMPRENDEDOR}/productos/nuevo`} />
      <ZonaFoto />
      <form className="flex flex-col gap-5" onSubmit={publicar}>
        <CampoTexto etiqueta="Nombre del producto" value={nombre} onChange={setNombre} placeholder="Ej: Camiseta Oversize Negra" />
        {!personalizado || modoPrecio === 'FIJO' ? (
          <>
            <CampoTexto etiqueta="Precio de compra" value={compra} onChange={setCompra} type="number" placeholder="₡ 0" />
            <CampoTexto etiqueta="Precio de venta" value={venta} onChange={setVenta} type="number" placeholder="₡ 0" />
          </>
        ) : null}
        {personalizado ? (
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
        <CampoTexto etiqueta="Descripción" value={descripcion} onChange={setDescripcion} placeholder="Ej: Auriculares con estuche de carga…" />
        <CampoTexto etiqueta="Stock disponible" value={stock} onChange={setStock} type="number" placeholder="Ej: 10" />
        <div>
          <p className="mb-2 text-xs font-medium text-hc-muted">Categoría</p>
          <FilaChips valor={categoria} opciones={CATEGORIAS_PRODUCTO} onChange={setCategoria} />
        </div>
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
        <BotonPrimario type="submit">{guardando ? 'Publicando…' : 'Publicar producto'}</BotonPrimario>
      </form>
    </main>
  )
}

function ventaParaGuardar(
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
    <div className="flex flex-col gap-3 rounded-2xl border border-hc-border p-3">
      <p className="text-xs font-medium text-hc-muted" id="modo-precio-label">Cómo se define el precio</p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby="modo-precio-label">
        {MODOS_PRECIO.map((modo) => (
          <label key={modo.valor} className="flex cursor-pointer items-start gap-2 rounded-xl border border-hc-border px-3 py-2">
            <input
              type="radio"
              name="modoPrecioPersonalizado"
              checked={modoPrecio === modo.valor}
              onChange={() => setModoPrecio(modo.valor)}
              aria-label={modo.titulo}
            />
            <span>
              <span className="block text-sm font-medium text-hc-text">{modo.titulo}</span>
              <span className="block text-xs text-hc-muted">{modo.ayuda}</span>
            </span>
          </label>
        ))}
      </div>
      {modoPrecio === 'RANGO' ? (
        <div className="grid grid-cols-2 gap-2">
          <CampoTexto etiqueta="Precio mínimo" value={precioMin} onChange={setPrecioMin} type="number" placeholder="₡ 5.000" />
          <CampoTexto etiqueta="Precio máximo" value={precioMax} onChange={setPrecioMax} type="number" placeholder="₡ 25.000" />
        </div>
      ) : null}
      {modoPrecio === 'COTIZACION' ? (
        <p className="text-xs text-hc-muted">El cliente envía fotos y notas; vos cotizás al aprobar el encargo.</p>
      ) : null}
      <label htmlFor="instrucciones-personalizacion" className="text-xs font-medium text-hc-muted">
        Instrucciones para el cliente
      </label>
      <textarea
        id="instrucciones-personalizacion"
        className="min-h-[88px] w-full rounded-xl border border-hc-border px-3 py-2 text-sm"
        value={instrucciones}
        onChange={(e) => setInstrucciones(e.target.value)}
        placeholder="Ej: Subí foto del diseño. Indicá talla."
        maxLength={3000}
      />
    </div>
  )
}

function ZonaFoto() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hc-border bg-[var(--hc-n-50)] py-8">
      <span className="size-[26px] overflow-hidden">
        <img src={iconCamara} alt="" width={26} height={26} className="size-full" />
      </span>
      <p className="text-[13px] font-medium text-hc-muted">Agregar foto</p>
    </div>
  )
}
