import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { selfCheckoutService } from '@/services/selfCheckoutService'
import QrPagina from '@/features/qr-negocio/QrPagina'
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
  ResumenPedidoSelfCheckout,
} from './selfCheckout/selfCheckoutTypes'

type PasoSelfCheckout = 'catalogo' | 'formulario' | 'exito'

/**
 * QR de mesa (`/checkout/qr/:token`). Frames Figma: menú `29:1650` y pedido
 * enviado `29:1741`.
 */
export default function SelfCheckoutPage() {
  const { token } = useParams()
  const { t } = useTranslation()
  const [mesa, setMesa]             = useState<MesaSelfCheckout | null>(null)
  const [productos, setProductos]   = useState<ProductoSelfCheckout[]>([])
  const [carrito, setCarrito]       = useState<CarritoSelfCheckout>({}) // { productoId: { producto, cantidad } }
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [paso, setPaso]             = useState<PasoSelfCheckout>('catalogo') // catalogo | formulario | exito
  const [form, setForm]             = useState<FormSelfCheckout>({ clienteNombre: '', clienteTel: '', notas: '' })
  const [enviando, setEnviando]     = useState(false)
  const [pedidoResult, setPedidoResult] = useState<PedidoResultSelfCheckout | null>(null)
  const [resumen, setResumen]       = useState<ResumenPedidoSelfCheckout | null>(null)

  useEffect(() => {
    Promise.all([
      selfCheckoutService.getMesa(token as string),
      selfCheckoutService.getProductos(token as string),
    ]).then(([mesaRes, prodRes]) => {
      setMesa(mesaRes.data as MesaSelfCheckout)
      setProductos(Array.isArray(prodRes.data) ? prodRes.data as ProductoSelfCheckout[] : [])
    }).catch(() => setError(t('pos.mesa.errorQr')))
    .finally(() => setCargando(false))
  }, [token, t])

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
      const lineas = Object.values(carrito)
      const items = lineas.map(({ producto, cantidad }) => ({
        productoId: producto.id,
        cantidad,
      }))
      const { data } = await selfCheckoutService.crearPedido(token as string, { ...form, items })
      setPedidoResult(data as PedidoResultSelfCheckout)
      setResumen({ lineas })
      setPaso('exito')
      setCarrito({})
    } catch {
      setError(t('pos.mesa.errorEnviar'))
    } finally {
      setEnviando(false)
    }
  }

  if (cargando) {
    return <SelfCheckoutLoading />
  }

  if (error && !mesa) {
    return <SelfCheckoutError error={error} />
  }

  if (paso === 'exito') {
    return (
      <SelfCheckoutExito
        mesa={mesa}
        pedidoResult={pedidoResult}
        resumen={resumen}
        onOtroPedido={() => { setPaso('catalogo'); setPedidoResult(null); setResumen(null) }}
      />
    )
  }

  return (
    <QrPagina>
      <SelfCheckoutHeader mesa={mesa} conInvitacion={paso === 'catalogo'} />

      {paso === 'catalogo' && (
        <SelfCheckoutCatalogo productos={productos} carrito={carrito} onCambiar={actualizarCarrito} />
      )}

      {paso === 'formulario' && (
        <SelfCheckoutFormulario
          carrito={carrito} form={form} error={error} enviando={enviando}
          totalPrecio={totalPrecio}
          setForm={setForm}
          onVolver={() => setPaso('catalogo')}
          onEnviar={enviarPedido}
        />
      )}

      {paso === 'catalogo' && totalItems > 0 && (
        <SelfCheckoutFab
          totalItems={totalItems} totalPrecio={totalPrecio}
          onVerPedido={() => setPaso('formulario')}
        />
      )}
    </QrPagina>
  )
}
