import { useCallback, useState } from 'react'
import type { ModoPrecioPersonalizado } from './personalizadoProductoHelpers'
import { preciosAlPublicar } from './personalizadoProductoHelpers'
import type { DatosPasoProducto } from './productoVendedorPasos'
import type { DatosProductoVendedor } from './catalogoVendedorApi'

export type ValoresInicialesProducto = Readonly<{
  nombre?: string
  compra?: string
  venta?: string
  descripcion?: string
  stock?: string
  categoria?: string
  categoriaId?: string
  estado?: string
  instrucciones?: string
  modoPrecio?: ModoPrecioPersonalizado
  precioMin?: string
  precioMax?: string
  imagenUrl?: string
}>

/**
 * Estado compartido del formulario de producto vendedor (crear / editar).
 */
export default function useFormProductoVendedor(personalizado: boolean) {
  const [paso, setPaso] = useState(0)
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
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const datos: DatosPasoProducto = {
    personalizado,
    nombre,
    categoriaId,
    compra,
    venta,
    stock,
    descripcion,
    instrucciones,
    modoPrecio,
    precioMin,
    precioMax,
  }

  const elegirCategoria = useCallback((id: string, nombreCat: string) => {
    setCategoriaId(id)
    setCategoria(nombreCat)
  }, [])

  const cargarDesde = useCallback((valores: ValoresInicialesProducto) => {
    setNombre(valores.nombre ?? '')
    setCompra(valores.compra ?? '')
    setVenta(valores.venta ?? '')
    setDescripcion(valores.descripcion ?? '')
    setStock(valores.stock ?? '')
    setCategoria(valores.categoria ?? '')
    setCategoriaId(valores.categoriaId ?? '')
    setEstado(valores.estado ?? 'Publicado')
    setInstrucciones(valores.instrucciones ?? '')
    setModoPrecio(valores.modoPrecio ?? 'COTIZACION')
    setPrecioMin(valores.precioMin ?? '')
    setPrecioMax(valores.precioMax ?? '')
    setImagenUrl(valores.imagenUrl ?? '')
  }, [])

  function payloadPublicacion(): DatosProductoVendedor {
    const precios = preciosAlPublicar(personalizado, compra, venta, {
      modoPrecio: personalizado ? modoPrecio : undefined,
      precioMin,
      precioMax,
    })
    return {
      nombre,
      precioCompra: precios.precioCompra,
      precioVenta: precios.precioVenta,
      descripcion,
      stock,
      categoria,
      categoriaId,
      estado: estado as 'Publicado' | 'Pausado',
      esPersonalizado: personalizado,
      modoPrecioPersonalizado: precios.modoPrecioPersonalizado,
      precioPersonalizadoMin: precios.precioPersonalizadoMin,
      precioPersonalizadoMax: precios.precioPersonalizadoMax,
      instruccionesPersonalizacion: personalizado ? instrucciones : undefined,
      imagenUrl: imagenUrl || undefined,
    }
  }

  return {
    paso,
    setPaso,
    datos,
    nombre,
    setNombre,
    compra,
    setCompra,
    venta,
    setVenta,
    descripcion,
    setDescripcion,
    stock,
    setStock,
    categoriaId,
    estado,
    setEstado,
    instrucciones,
    setInstrucciones,
    modoPrecio,
    setModoPrecio,
    precioMin,
    setPrecioMin,
    precioMax,
    setPrecioMax,
    imagenUrl,
    setImagenUrl,
    errorSubmit,
    setErrorSubmit,
    guardando,
    setGuardando,
    elegirCategoria,
    cargarDesde,
    payloadPublicacion,
  }
}
