import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BotonSecundario from '../ui/BotonSecundario'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import { guardarProductoVendedor, mensajeErrorProducto } from '@/prototipo/compartido/catalogoVendedorApi'
import FormularioPorPasos from '@/prototipo/compartido/FormularioPorPasos'
import PasosProductoVendedor from '@/prototipo/compartido/PasosProductoVendedor'
import useFormProductoVendedor from '@/prototipo/compartido/useFormProductoVendedor'
import type { ModoPrecioPersonalizado } from '@/prototipo/compartido/personalizadoProductoHelpers'
import { pasosProducto, validarPasoProducto } from '@/prototipo/compartido/productoVendedorPasos'

/**
 * Editar producto — catálogo o personalizado según el producto cargado (wizard).
 */
export default function EditarProductoPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { productos, cargando } = useCatalogoEmprendedor()
  const original = useMemo(() => productos.find((p) => p.id === id), [productos, id])
  const esPersonalizado = original?.esPersonalizado === true
  const form = useFormProductoVendedor(esPersonalizado)
  const { cargarDesde } = form
  const [iniciado, setIniciado] = useState(false)
  const pasos = useMemo(() => pasosProducto(esPersonalizado, true), [esPersonalizado])
  const idPaso = pasos[form.paso]?.id

  useEffect(() => {
    if (!original || iniciado) return
    cargarDesde({
      nombre: original.nombre,
      compra: String(original.precioCompra),
      venta: String(original.precio),
      descripcion: original.descripcion,
      stock: String(original.stock),
      categoria: original.categoria,
      categoriaId: original.categoriaId ?? '',
      estado: original.estado,
      instrucciones: original.instruccionesPersonalizacion ?? '',
      modoPrecio: (original.modoPrecioPersonalizado as ModoPrecioPersonalizado) || 'COTIZACION',
      precioMin: original.precioPersonalizadoMin != null ? String(original.precioPersonalizadoMin) : '',
      precioMax: original.precioPersonalizadoMax != null ? String(original.precioPersonalizadoMax) : '',
      imagenUrl: original.imagenUrl ?? '',
    })
    setIniciado(true)
  }, [original, iniciado, cargarDesde])

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

  async function guardar() {
    form.setGuardando(true)
    form.setErrorSubmit(null)
    try {
      await guardarProductoVendedor(id, form.payloadPublicacion())
      navigate(`${RUTA_EMPRENDEDOR}/productos`)
    } catch (err: unknown) {
      form.setErrorSubmit(mensajeErrorProducto(err, 'No se pudo guardar el producto.'))
    } finally {
      form.setGuardando(false)
    }
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 py-8">
      <CabeceraAtras
        titulo={esPersonalizado ? 'Editar personalizado' : 'Editar Producto'}
        to={`${RUTA_EMPRENDEDOR}/productos`}
      />
      <FormularioPorPasos
        pasos={pasos}
        pasoActual={form.paso}
        onPasoChange={form.setPaso}
        validarPaso={(i) => validarPasoProducto(i, form.datos, true)}
        onFinalizar={guardar}
        etiquetaFinal="Guardar cambios"
        enviando={form.guardando}
      >
        <PasosProductoVendedor
          idPaso={idPaso}
          personalizado={esPersonalizado}
          editar
          idPrefijo="emp-edit"
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
      <BotonSecundario tono="peligro" onClick={() => navigate(`${RUTA_EMPRENDEDOR}/productos/${id}/eliminar`)}>
        Eliminar producto
      </BotonSecundario>
    </main>
  )
}
