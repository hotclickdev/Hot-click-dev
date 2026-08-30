import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import iconCamara from '../assets/icon-camara.svg'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import FilaChips from '../ui/FilaChips'
import { CATEGORIAS_PRODUCTO, RUTA_EMPRENDEDOR } from '../constants'
import { mensajeErrorProducto, publicarProductoVendedor } from '@/prototipo/compartido/catalogoVendedorApi'

/**
 * Paso 3 Agregar Producto (Figma 10:2) — publica en el catálogo real.
 */
export default function AgregarProductoPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('')
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS_PRODUCTO)[number]>('Tecnología')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function publicar(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim()) {
      setError('Escribí el nombre del producto.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await publicarProductoVendedor({
        nombre,
        precioCompra: compra,
        precioVenta: venta,
        descripcion,
        stock,
        categoria,
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
      <CabeceraAtras titulo="Nuevo Producto" to={`${RUTA_EMPRENDEDOR}/productos`} />
      <ZonaFoto />
      <form className="flex flex-col gap-5" onSubmit={publicar}>
        <CampoTexto etiqueta="Nombre del producto" value={nombre} onChange={setNombre} placeholder="Ej: Camiseta Oversize Negra" />
        <CampoTexto etiqueta="Precio de compra" value={compra} onChange={setCompra} type="number" placeholder="₡ 0" />
        <CampoTexto etiqueta="Precio de venta" value={venta} onChange={setVenta} type="number" placeholder="₡ 0" />
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
