import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import BotonSecundario from '../ui/BotonSecundario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import FilaChips from '../ui/FilaChips'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { guardarProductoVendedor, mensajeErrorProducto } from '@/prototipo/compartido/catalogoVendedorApi'
import CamposPersonalizadoProducto from '@/prototipo/compartido/CamposPersonalizadoProducto'
import ChipsCategoriaVendedor from '@/prototipo/compartido/ChipsCategoriaVendedor'
import ZonaFotoProducto from '@/prototipo/compartido/ZonaFotoProducto'
import { idCategoriaValido } from '@/prototipo/compartido/categoriaVendedor'
import {
  type ModoPrecioPersonalizado,
  errorCatalogoProducto,
  errorPreciosPersonalizado,
  preciosAlPublicar,
} from '@/prototipo/compartido/personalizadoProductoHelpers'
import type { EstadoPublicacion } from '../types'

const ESTADOS = ['Publicado', 'Pausado'] as const

/**
 * Editar producto — catálogo o personalizado según el producto cargado.
 */
export default function EditarProductoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos, cargando } = useCatalogoEmprendedor()
  const original = useMemo(() => productos.find((p) => p.id === id), [productos, id])
  const esPersonalizado = original?.esPersonalizado === true
  const [nombre, setNombre] = useState('')
  const [compra, setCompra] = useState('')
  const [venta, setVenta] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [stock, setStock] = useState('')
  const [categoria, setCategoria] = useState('')
  const [categoriaId, setCategoriaId] = useState('')
  const [estado, setEstado] = useState('Publicado')
  const [instrucciones, setInstrucciones] = useState('')
  const [modoPrecio, setModoPrecio] = useState<ModoPrecioPersonalizado>('COTIZACION')
  const [precioMin, setPrecioMin] = useState('')
  const [precioMax, setPrecioMax] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
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
    setCategoriaId(original.categoriaId ?? '')
    setEstado(original.estado)
    setInstrucciones(original.instruccionesPersonalizacion ?? '')
    setModoPrecio((original.modoPrecioPersonalizado as ModoPrecioPersonalizado) || 'COTIZACION')
    setPrecioMin(original.precioPersonalizadoMin != null ? String(original.precioPersonalizadoMin) : '')
    setPrecioMax(original.precioPersonalizadoMax != null ? String(original.precioPersonalizadoMax) : '')
    setImagenUrl(original.imagenUrl ?? '')
    setIniciado(true)
  }, [original, iniciado])

  const elegirCategoria = useCallback((idCat: string, nombreCat: string) => {
    setCategoriaId(idCat)
    setCategoria(nombreCat)
  }, [])

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
    if (!idCategoriaValido(categoriaId)) {
      setError('Seleccioná una categoría.')
      return
    }
    const errorCatalogo = errorCatalogoProducto(esPersonalizado, venta, stock)
    if (errorCatalogo) {
      setError(errorCatalogo)
      return
    }
    const errorPrecios = errorPreciosPersonalizado(esPersonalizado, modoPrecio, venta, precioMin, precioMax)
    if (errorPrecios) {
      setError(errorPrecios)
      return
    }
    const precios = preciosAlPublicar(esPersonalizado, compra, venta, {
      modoPrecio: esPersonalizado ? modoPrecio : undefined,
      precioMin,
      precioMax,
    })
    setError(null)
    try {
      await guardarProductoVendedor(id, {
        nombre,
        precioCompra: precios.precioCompra,
        precioVenta: precios.precioVenta,
        descripcion,
        stock,
        categoria,
        categoriaId,
        estado: estado as EstadoPublicacion,
        esPersonalizado,
        modoPrecioPersonalizado: precios.modoPrecioPersonalizado,
        precioPersonalizadoMin: precios.precioPersonalizadoMin,
        precioPersonalizadoMax: precios.precioPersonalizadoMax,
        instruccionesPersonalizacion: esPersonalizado ? instrucciones : undefined,
        imagenUrl: imagenUrl || undefined,
      })
      navigate(`${RUTA_EMPRENDEDOR}/productos`)
    } catch (err: unknown) {
      setError(mensajeErrorProducto(err, 'No se pudo guardar el producto.'))
    }
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 py-8">
      <CabeceraAtras
        titulo={esPersonalizado ? 'Editar personalizado' : 'Editar Producto'}
        to={`${RUTA_EMPRENDEDOR}/productos`}
      />
      <form className="flex flex-col gap-5" onSubmit={(e) => void guardar(e)}>
        <ZonaFotoProducto imagenUrl={imagenUrl} onImagenChange={setImagenUrl} bordeDiscontinuo />
        <CampoTexto etiqueta="Nombre del producto" value={nombre} onChange={setNombre} />
        {!esPersonalizado ? (
          <>
            <CampoTexto etiqueta="Precio de compra" value={compra} onChange={setCompra} type="number" />
            <CampoTexto etiqueta="Precio de venta" value={venta} onChange={setVenta} type="number" />
          </>
        ) : (
          <CamposPersonalizadoProducto
            idPrefijo="emp-edit"
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
        <CampoTexto etiqueta="Descripción" value={descripcion} onChange={setDescripcion} />
        <CampoTexto etiqueta="Stock disponible" value={stock} onChange={setStock} type="number" />
        <div>
          <p className="mb-2 text-xs font-medium text-hc-muted">Categoría</p>
          <ChipsCategoriaVendedor categoriaId={categoriaId} onChange={elegirCategoria} />
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
