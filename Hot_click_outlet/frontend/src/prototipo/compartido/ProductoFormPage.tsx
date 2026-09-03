import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Boton, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useCatalogoVendedor } from './useCatalogoVendedor'
import {
  guardarProductoVendedor,
  mensajeErrorProducto,
  publicarProductoVendedor,
} from './catalogoVendedorApi'
import FormularioPorPasos from './FormularioPorPasos'
import PasosProductoVendedor from './PasosProductoVendedor'
import useFormProductoVendedor from './useFormProductoVendedor'
import type { ModoPrecioPersonalizado } from './personalizadoProductoHelpers'
import { tituloFormProducto } from './personalizadoProductoHelpers'
import { pasosProducto, validarPasoProducto } from './productoVendedorPasos'

type Props = Readonly<{ personalizado?: boolean }>

const TOTAL_FLUJO_NUEVO = 5

/**
 * Alta / edición de producto (PYME / Negocio Plus) — mismo wizard que Emprendedor.
 */
export default function ProductoFormPage({ personalizado = false }: Props) {
  const { id } = useParams()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const { seller, cargando } = useCatalogoVendedor()
  const editar = Boolean(id)
  const existente = id ? seller.find((p) => p.id === id) : undefined
  const esPersonalizado = personalizado && !editar
    ? true
    : existente?.esPersonalizado === true
  const form = useFormProductoVendedor(esPersonalizado)
  const { cargarDesde } = form
  const [iniciado, setIniciado] = useState(false)
  const pasos = useMemo(() => pasosProducto(esPersonalizado, editar), [esPersonalizado, editar])
  const idPaso = pasos[form.paso]?.id
  const volverA = editar ? ruta('productos') : ruta('productos/nuevo')

  useEffect(() => {
    if (!existente || iniciado) return
    cargarDesde({
      nombre: existente.nombre,
      compra: String(existente.precioCompra),
      venta: String(existente.precio),
      descripcion: existente.descripcion,
      stock: String(existente.stock),
      categoria: existente.categoria,
      categoriaId: existente.categoriaId ?? '',
      estado: existente.estado,
      instrucciones: existente.instruccionesPersonalizacion ?? '',
      modoPrecio: (existente.modoPrecioPersonalizado as ModoPrecioPersonalizado) || 'COTIZACION',
      precioMin: existente.precioPersonalizadoMin != null ? String(existente.precioPersonalizadoMin) : '',
      precioMax: existente.precioPersonalizadoMax != null ? String(existente.precioPersonalizadoMax) : '',
      imagenUrl: existente.imagenUrl ?? '',
    })
    setIniciado(true)
  }, [existente, iniciado, cargarDesde])

  if (editar && cargando && !existente) {
    return (
      <main className="px-5 pb-8 pt-[60px]">
        <EncabezadoPagina titulo={tituloFormProducto(true, false)} volverA={volverA} />
        <p className="text-sm text-hc-muted">Cargando…</p>
      </main>
    )
  }

  if (editar && !cargando && !existente) {
    return (
      <main className="px-5 pb-8 pt-[60px]">
        <EncabezadoPagina titulo={tituloFormProducto(true, false)} volverA={volverA} />
        <p className="text-sm text-hc-muted">No encontramos ese producto.</p>
      </main>
    )
  }

  async function finalizar() {
    form.setGuardando(true)
    form.setErrorSubmit(null)
    try {
      const datos = form.payloadPublicacion()
      if (id) await guardarProductoVendedor(id, datos)
      else await publicarProductoVendedor(datos)
      navigate(ruta('productos'))
    } catch (err: unknown) {
      form.setErrorSubmit(mensajeErrorProducto(err, 'No se pudo guardar el producto.'))
    } finally {
      form.setGuardando(false)
    }
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo={tituloFormProducto(editar, esPersonalizado)} volverA={volverA} />
      <FormularioPorPasos
        pasos={pasos}
        pasoActual={form.paso}
        onPasoChange={form.setPaso}
        validarPaso={(i) => validarPasoProducto(i, form.datos, editar)}
        onFinalizar={finalizar}
        etiquetaFinal={editar ? 'Guardar cambios' : 'Publicar producto'}
        enviando={form.guardando}
        progresoOffset={editar ? 0 : 1}
        totalProgreso={editar ? undefined : TOTAL_FLUJO_NUEVO}
      >
        <PasosProductoVendedor
          idPaso={idPaso}
          personalizado={esPersonalizado}
          editar={editar}
          idPrefijo={editar ? 'pyme-edit' : 'pyme'}
          nombre={form.nombre}
          onNombreChange={form.setNombre}
          compra={form.compra}
          onCompraChange={form.setCompra}
          venta={form.venta}
          onVentaChange={form.setVenta}
          descripcion={form.descripcion}
          onDescripcionChange={form.setDescripcion}
          stock={form.stock}
          onStockChange={form.setStock}
          categoriaId={form.categoriaId}
          onCategoriaChange={form.elegirCategoria}
          estado={form.estado}
          onEstadoChange={form.setEstado}
          instrucciones={form.instrucciones}
          onInstruccionesChange={form.setInstrucciones}
          modoPrecio={form.modoPrecio}
          onModoChange={form.setModoPrecio}
          precioMin={form.precioMin}
          onPrecioMinChange={form.setPrecioMin}
          precioMax={form.precioMax}
          onPrecioMaxChange={form.setPrecioMax}
          imagenUrl={form.imagenUrl}
          onImagenChange={form.setImagenUrl}
          errorSubmit={form.errorSubmit}
        />
      </FormularioPorPasos>
      {editar && id ? (
        <Boton variante="suave" to={ruta(`productos/${id}/eliminar`)}>Eliminar producto</Boton>
      ) : null}
    </main>
  )
}
