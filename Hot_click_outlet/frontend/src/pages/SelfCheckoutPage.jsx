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

export default function SelfCheckoutPage() {
  const { token } = useParams()
  const [mesa, setMesa]             = useState(null)
  const [productos, setProductos]   = useState([])
  const [carrito, setCarrito]       = useState({}) // { productoId: { producto, cantidad } }
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)
  const [paso, setPaso]             = useState('catalogo') // catalogo | formulario | exito
  const [form, setForm]             = useState({ clienteNombre: '', clienteTel: '', notas: '' })
  const [enviando, setEnviando]     = useState(false)
  const [pedidoResult, setPedidoResult] = useState(null)

  useEffect(() => {
    Promise.all([
      selfCheckoutService.getMesa(token),
      selfCheckoutService.getProductos(token),
    ]).then(([mesaRes, prodRes]) => {
      setMesa(mesaRes.data)
      setProductos(Array.isArray(prodRes.data) ? prodRes.data : [])
    }).catch(() => setError('Código QR inválido o desactivado'))
    .finally(() => setCargando(false))
  }, [token])

  const actualizarCarrito = useCallback((producto, cantidad) => {
    setCarrito(prev => {
      const next = { ...prev }
      if (cantidad <= 0) {
        delete next[producto.id]
      } else {
        next[producto.id] = { producto, cantidad }
      }
      return next
    })
  }, [])

  const totalItems = Object.values(carrito).reduce((s, { cantidad }) => s + cantidad, 0)
  const totalPrecio = Object.values(carrito).reduce((s, { producto, cantidad }) => s + producto.precio * cantidad, 0)

  async function enviarPedido() {
    setEnviando(true)
    try {
      const items = Object.values(carrito).map(({ producto, cantidad }) => ({
        productoId: producto.id,
        cantidad,
      }))
      const { data } = await selfCheckoutService.crearPedido(token, { ...form, items })
      setPedidoResult(data)
      setPaso('exito')
      setCarrito({})
    } catch {
      setError('Error al enviar el pedido. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  const primaryColor = mesa?.colorPrimario ?? '#4F7CFF'

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
