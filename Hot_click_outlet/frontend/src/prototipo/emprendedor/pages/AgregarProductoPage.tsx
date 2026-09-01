import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import FilaChips from '../ui/FilaChips'
import { CATEGORIAS_PRODUCTO, RUTA_EMPRENDEDOR } from '../constants'
import { mensajeErrorProducto, publicarProductoVendedor } from '@/prototipo/compartido/catalogoVendedorApi'
import CamposPersonalizadoProducto from '@/prototipo/compartido/CamposPersonalizadoProducto'
import ZonaFotoProducto from '@/prototipo/compartido/ZonaFotoProducto'
import {
  type ModoPrecioPersonalizado,
  modosPrecioPersonalizadoHabilitados,
  preciosAlPublicar,
  tituloFormProducto,
} from '@/prototipo/compartido/personalizadoProductoHelpers'

type Props = Readonly<{ personalizado?: boolean }>

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
  const [instrucciones, setInstrucciones] = useState('')
  const [modoPrecio, setModoPrecio] = useState<ModoPrecioPersonalizado>('COTIZACION')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim()) {
      setError('Escribí el nombre del producto.')
      return
    }
    if (personalizado && modosPrecioPersonalizadoHabilitados() && modoPrecio === 'RANGO' && (!precioMin || !precioMax)) {
      setError('Indicá el rango de precio (mínimo y máximo).')
      return
    }
    const precios = preciosAlPublicar(personalizado, compra, venta, {
      modoPrecio: personalizado ? modoPrecio : undefined,
      precioMin,
      precioMax,
    })
    setGuardando(true)
    setError(null)
    try {
      await publicarProductoVendedor({
        nombre,
        precioCompra: precios.precioCompra,
        precioVenta: precios.precioVenta,
        descripcion,
        stock,
        categoria,
        esPersonalizado: personalizado,
        modoPrecioPersonalizado: precios.modoPrecioPersonalizado,
        precioPersonalizadoMin: precios.precioPersonalizadoMin,
        precioPersonalizadoMax: precios.precioPersonalizadoMax,
        instruccionesPersonalizacion: personalizado ? instrucciones : undefined,
        imagenUrl: imagenUrl || undefined,
      })
      navigate(`${RUTA_EMPRENDEDOR}/productos`)
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo publicar el producto.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 py-8">
      <CabeceraAtras
        titulo={tituloFormProducto(false, personalizado)}
        to={`${RUTA_EMPRENDEDOR}/productos/nuevo`}
      />
      <ZonaFotoProducto
        imagenUrl={imagenUrl}
        onImagenChange={setImagenUrl}
        bordeDiscontinuo
      />
      <form className="flex flex-col gap-5" onSubmit={publicar}>
        <CampoTexto etiqueta="Nombre del producto" value={nombre} onChange={setNombre} placeholder="Ej: Camiseta Oversize Negra" />
        {!personalizado ? (
          <>
            <CampoTexto etiqueta="Precio de compra" value={compra} onChange={setCompra} type="number" placeholder="₡ 0" />
            <CampoTexto etiqueta="Precio de venta" value={venta} onChange={setVenta} type="number" placeholder="₡ 0" />
          </>
        ) : (
          <CamposPersonalizadoProducto
            idPrefijo="emp"
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
