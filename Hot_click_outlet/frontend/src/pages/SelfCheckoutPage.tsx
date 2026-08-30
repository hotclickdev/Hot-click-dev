import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { selfCheckoutService } from '@/services/selfCheckoutService'
import SelfCheckoutLoading from './selfCheckout/SelfCheckoutLoading'
import SelfCheckoutError from './selfCheckout/SelfCheckoutError'
import SelfCheckoutExito from './selfCheckout/SelfCheckoutExito'
import SelfCheckoutHeader from './selfCheckout/SelfCheckoutHeader'
import SelfCheckoutCatalogo from './selfCheckout/SelfCheckoutCatalogo'
import SelfCheckoutFormulario from './selfCheckout/SelfCheckoutFormulario'
import SelfCheckoutFab from './selfCheckout/SelfCheckoutFab'
import type {
  CarritoSelfCheckout,
  FormSelfCheckout,
  MesaSelfCheckout,
  PedidoResultSelfCheckout,
  ProductoSelfCheckout,
} from './selfCheckout/selfCheckoutTypes'

type PasoSelfCheckout = 'catalogo' | 'formulario' | 'exito'

export default function SelfCheckoutPage() {
  const { token } = useParams()
  const [mesa, setMesa]             = useState<MesaSelfCheckout | null>(null)
  const [productos, setProductos]   = useState<ProductoSelfCheckout[]>([])
  const [carrito, setCarrito]       = useState<CarritoSelfCheckout>({}) // { productoId: { producto, cantidad } }
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [paso, setPaso]             = useState<PasoSelfCheckout>('catalogo') // catalogo | formulario | exito
  const [form, setForm]             = useState<FormSelfCheckout>({ clienteNombre: '', clienteTel: '', notas: '' })
  const [enviando, setEnviando]     = useState(false)
  const [pedidoResult, setPedidoResult] = useState<PedidoResultSelfCheckout | null>(null)

  useEffect(() => {
    Promise.all([
      selfCheckoutService.getMesa(token as string),
      selfCheckoutService.getProductos(token as string),
    ]).then(([mesaRes, prodRes]) => {
      setMesa(mesaRes.data as MesaSelfCheckout)
      setProductos(Array.isArray(prodRes.data) ? prodRes.data as ProductoSelfCheckout[] : [])
    }).catch(() => setError('Código QR inválido o desactivado'))
    .finally(() => setCargando(false))
  }, [token])

  const actualizarCarrito = useCallback((producto: ProductoSelfCheckout, cantidad: number) => {
    setCarrito(prev => {
      const next = { ...prev }
      if (cantidad <= 0) {
        delete next[String(producto.id)]
      } else {
        next[String(producto.id)] = { producto, cantidad }
      }
      return next
    })
  }, [])

  const totalItems = Object.values(carrito).reduce((s, { cantidad }) => s + cantidad, 0)
  const totalPrecio = Object.values(carrito).reduce((s, { producto, cantidad }) => s + (producto.precio as number) * cantidad, 0)

  async function enviarPedido() {
    setEnviando(true)
    try {
      const items = Object.values(carrito).map(({ producto, cantidad }) => ({
        productoId: producto.id,
        cantidad,
      }))
      const { data } = await selfCheckoutService.crearPedido(token as string, { ...form, items })
      setPedidoResult(data as PedidoResultSelfCheckout)
      setPaso('exito')
      setCarrito({})
    } catch {
      setError('Error al enviar el pedido. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const primaryColor = mesa?.colorPrimario ?? '#E73B33'

  if (cargando) {
    return <SelfCheckoutLoading primaryColor={primaryColor} />
  }

  if (error && !mesa) {
    return <SelfCheckoutError error={error} />
  }

  if (paso === 'exito') {
    return (
      <SelfCheckoutExito
        mesa={mesa}
        pedidoResult={pedidoResult}
        primaryColor={primaryColor}
        onOtroPedido={() => { setPaso('catalogo'); setPedidoResult(null) }}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f0f17' }}>
      {/* Header */}
      <SelfCheckoutHeader mesa={mesa} primaryColor={primaryColor} />

      {/* Catálogo */}
      {paso === 'catalogo' && (
        <SelfCheckoutCatalogo productos={productos} onAdd={actualizarCarrito} />
      )}

      {/* Formulario de checkout */}
      {paso === 'formulario' && (
        <SelfCheckoutFormulario
          carrito={carrito} form={form} error={error} enviando={enviando}
          totalPrecio={totalPrecio} primaryColor={primaryColor}
          setForm={setForm}
          onVolver={() => setPaso('catalogo')}
          onEnviar={enviarPedido}
        />
      )}

      {/* FAB del carrito */}
      {paso === 'catalogo' && totalItems > 0 && (
        <SelfCheckoutFab
          totalItems={totalItems} totalPrecio={totalPrecio}
          primaryColor={primaryColor} onVerPedido={() => setPaso('formulario')}
        />
      )}
    </div>
  )
}
