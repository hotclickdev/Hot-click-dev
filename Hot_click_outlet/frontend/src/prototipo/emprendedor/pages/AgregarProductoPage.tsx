import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CabeceraAtras from '../ui/CabeceraAtras'
import BotonPrimario from '../ui/BotonPrimario'
import { RUTA_EMPRENDEDOR } from '../constants'
import { mensajeErrorProducto, publicarProductoVendedor } from '@/prototipo/compartido/catalogoVendedorApi'
import FormularioPorPasos from '@/prototipo/compartido/FormularioPorPasos'
import PasosProductoVendedor from '@/prototipo/compartido/PasosProductoVendedor'
import useFormProductoVendedor from '@/prototipo/compartido/useFormProductoVendedor'
import { tituloFormProducto } from '@/prototipo/compartido/personalizadoProductoHelpers'
import { pasosProducto, validarPasoProducto } from '@/prototipo/compartido/productoVendedorPasos'
import PantallaExitoWizard, {
  navegarConTransicion,
} from '@/prototipo/compartido/motion/PantallaExitoWizard'

type Props = Readonly<{ personalizado?: boolean }>

const TOTAL_FLUJO_NUEVO = 5
const AUTO_CIERRE_EXITO_MS = 2200

/**
 * Paso agregar producto — catálogo o personalizado según `personalizado` (wizard).
 */
export default function AgregarProductoPage({ personalizado = false }: Props) {
  const navigate = useNavigate()
  const form = useFormProductoVendedor(personalizado)
  const pasos = useMemo(() => pasosProducto(personalizado, false), [personalizado])
  const idPaso = pasos[form.paso]?.id
  const [exito, setExito] = useState(false)

  function irAProductos() {
    navegarConTransicion(() => navigate(`${RUTA_EMPRENDEDOR}/productos`))
  }

  useEffect(() => {
    if (!exito) return
    const t = window.setTimeout(irAProductos, AUTO_CIERRE_EXITO_MS)
    return () => window.clearTimeout(t)
  }, [exito])

  async function publicar() {
    form.setGuardando(true)
    form.setErrorSubmit(null)
    try {
      await publicarProductoVendedor(form.payloadPublicacion())
      setExito(true)
    } catch (err: unknown) {
      form.setErrorSubmit(mensajeErrorProducto(err, 'No se pudo publicar el producto.'))
    } finally {
      form.setGuardando(false)
    }
  }

  if (exito) {
    return (
      <main className="flex flex-col gap-[22px] px-5 py-8">
        <PantallaExitoWizard
          titulo="Producto publicado"
          mensaje="Ya está en tu catálogo. Podés seguir editándolo cuando quieras."
          accion={<BotonPrimario onClick={irAProductos}>Ver productos</BotonPrimario>}
        />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-[22px] px-5 py-8">
      <CabeceraAtras
        titulo={tituloFormProducto(false, personalizado)}
        to={`${RUTA_EMPRENDEDOR}/productos/nuevo`}
      />
      <FormularioPorPasos
        pasos={pasos}
        pasoActual={form.paso}
        onPasoChange={form.setPaso}
        validarPaso={(i) => validarPasoProducto(i, form.datos, false)}
        onFinalizar={publicar}
        etiquetaFinal="Publicar producto"
        enviando={form.guardando}
        progresoOffset={1}
        totalProgreso={TOTAL_FLUJO_NUEVO}
      >
        <PasosProductoVendedor
          idPaso={idPaso}
          personalizado={personalizado}
          editar={false}
          idPrefijo="emp"
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
    </main>
  )
}
