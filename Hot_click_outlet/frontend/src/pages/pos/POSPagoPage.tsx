import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { posService } from '@/services/posService'
import { productService } from '@/services/productService'
import useCartStore from '@/store/cartStore'
import TrustGlyph from '@/components/ui/TrustGlyph'
import type { Producto } from '@/types/producto'
import type { Id } from '@/types/api'

export const POS_QR_TOKEN_KEY = 'hc-pos-qr-token'

type QrPagoItem = {
  productoId?: Id
  nombre?: string
  nombreProducto?: string
  cantidad?: number
  precioUnitario?: number
  imagen?: string | null
}

type QrPagoInfo = {
  estado?: string
  total?: number
  empresaNombre?: string
  items?: QrPagoItem[]
}

/**
 * Escaneo del QR del POS: carga los productos en el carrito público y va a /carrito.
 */
export default function POSPagoPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const clearCart = useCartStore((s) => s.clearCart)
  const addItem = useCartStore((s) => s.addItem)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const yaCargado = useRef(false)

  useEffect(() => {
    if (!token || yaCargado.current) return
    yaCargado.current = true

    const cargar = async () => {
      try {
        const data = await posService.infoQrSesion(token) as QrPagoInfo
        if (data.estado === 'PAGADO') {
          setLoading(false)
          setError('Este QR ya fue pagado')
          return
        }
        if (data.estado === 'EXPIRADO' || data.estado === 'CANCELADO') {
          setLoading(false)
          setError('QR no encontrado o expirado')
          return
        }
        const items = data.items ?? []
        if (items.length === 0) {
          setLoading(false)
          setError('El QR no tiene productos')
          return
        }

        clearCart()
        for (const item of items) {
          const producto = await productoParaCarrito(item)
          const cantidad = Math.max(1, item.cantidad ?? 1)
          addItem(producto, cantidad)
        }
        sessionStorage.setItem(POS_QR_TOKEN_KEY, token)
        navigate('/carrito', { replace: true })
      } catch {
        setError('QR no encontrado o expirado')
        setLoading(false)
      }
    }
    void cargar()
  }, [token, clearCart, addItem, navigate])

  if (loading && !error) {
    return (
      <div className="hc-sistema-theme min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--hc-bg)' }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 animate-pulse"
            style={{ background: 'var(--hc-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando productos al carrito…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <div className="text-center max-w-xs">
        <div className="mb-4 flex justify-center" style={{ color: '#fbbf24' }}>
          <TrustGlyph tipo="alerta" className="w-12 h-12" />
        </div>
        <p className="font-bold text-[var(--hc-text)] mb-2">
          {error === 'Este QR ya fue pagado' ? 'Pago ya completado' : 'QR inválido o expirado'}
        </p>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          {error === 'Este QR ya fue pagado'
            ? 'Este código ya se usó. Pedile uno nuevo al cajero si necesitás pagar otra vez.'
            : 'Este código de pago ya no es válido. Solicita uno nuevo al cajero.'}
        </p>
      </div>
    </div>
  )
}

async function productoParaCarrito(item: QrPagoItem): Promise<Producto> {
  const id = item.productoId
  if (id != null) {
    try {
      const { data } = await productService.getById(id)
      if (data) return data
    } catch {
      /* fallback con datos del QR */
    }
  }
  return {
    id: id as number,
    nombre: item.nombre ?? item.nombreProducto ?? 'Producto',
    nombreProducto: item.nombre ?? item.nombreProducto,
    precio: item.precioUnitario ?? 0,
    precioVenta: item.precioUnitario ?? 0,
    imagenUrl: item.imagen ?? '',
    imagenPrincipalUrl: item.imagen ?? '',
    stock: 99,
  } as Producto
}
