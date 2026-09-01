import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/utils/format'
import {
  encargoService,
  encargoDesdeRespuesta,
  type Encargo,
} from '@/services/encargoService'
import { useToast } from '@/components/ui/Toast'

export default function EncargoPublicPage() {
  const { token } = useParams()
  const toast = useToast()
  const [encargo, setEncargo] = useState<Encargo | null>(null)
  const [loading, setLoading] = useState(true)
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    if (!token) return
    encargoService.porToken(token)
      .then(({ data }) => setEncargo(encargoDesdeRespuesta(data)))
      .catch(() => setEncargo(null))
      .finally(() => setLoading(false))
  }, [token])

  async function pagar() {
    if (!token || !encargo) return
    setPagando(true)
    try {
      const { data } = await encargoService.checkout(token, {
        metodoEnvio: 'RETIRO_EN_TIENDA',
        provider: 'STRIPE',
      })
      const body = data as { data?: { redirectUrl?: string }; redirectUrl?: string }
      const url = body.data?.redirectUrl || body.redirectUrl
      if (url) {
        window.location.href = url
        return
      }
      toast({ message: 'Checkout iniciado. Revisá tu email si no redirige.', type: 'success' })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo iniciar el pago', type: 'error' })
    } finally {
      setPagando(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-32"><Spinner size="xl" /></div>
      </MainLayout>
    )
  }

  if (!encargo) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <p className="text-lg mb-4">No encontramos este encargo.</p>
          <Link to="/productos" className="underline">Volver al catálogo</Link>
        </div>
      </MainLayout>
    )
  }

  const refs = [encargo.imagenUrl1, encargo.imagenUrl2, encargo.imagenUrl3].filter(Boolean) as string[]

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--hc-muted)' }}>Encargo personalizado</p>
          <h1 className="text-2xl font-bold mt-1" style={{ color: 'var(--hc-text)' }}>
            {encargo.productoNombre || 'Tu encargo'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Estado: <strong>{etiquetaEstado(encargo.estado)}</strong></p>
        </div>

        {refs.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {refs.map(url => (
              <img key={url} src={url} alt="Referencia" className="aspect-square rounded-xl object-cover border" style={{ borderColor: 'var(--hc-border)' }} />
            ))}
          </div>
        )}

        {encargo.notas && (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--hc-border)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--hc-muted)' }}>Tus notas</p>
            <p>{encargo.notas}</p>
          </div>
        )}

        {encargo.estado === 'APROBADO' && encargo.precioCotizado != null && (
          <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--hc-border)' }}>
            <p className="text-lg font-semibold">Precio aprobado: {formatPrice(encargo.precioCotizado)}</p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Tenés 7 días para pagar desde la aprobación.
            </p>
            <Button variant="primary" className="w-full" disabled={pagando} onClick={() => void pagar()}>
              {pagando ? 'Redirigiendo…' : 'Pagar ahora'}
            </Button>
          </div>
        )}

        {encargo.estado === 'PENDIENTE' && (
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            El artista está revisando tu solicitud. Te avisaremos por email.
          </p>
        )}

        {encargo.estado === 'RECHAZADO' && (
          <div className="text-sm rounded-xl p-3" style={{ background: 'rgba(220,38,38,0.08)' }}>
            <p className="font-medium">El artista no pudo aceptar este encargo.</p>
            {encargo.motivoRechazo && <p className="mt-1">{encargo.motivoRechazo}</p>}
          </div>
        )}

        {encargo.estado === 'PAGADO' && (
          <p className="text-sm text-emerald-600">¡Pagado! El artista ya recibió tu encargo.</p>
        )}

        {encargo.estado === 'VENCIDO' && (
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            Esta cotización venció. Podés solicitar un nuevo encargo desde el producto.
          </p>
        )}
      </div>
    </MainLayout>
  )
}

function etiquetaEstado(estado: string) {
  switch (estado) {
    case 'PENDIENTE': return 'Pendiente de revisión'
    case 'APROBADO': return 'Aprobado — listo para pagar'
    case 'RECHAZADO': return 'Rechazado'
    case 'PAGADO': return 'Pagado'
    case 'PENDIENTE_PAGO': return 'Pago en proceso'
    case 'VENCIDO': return 'Vencido'
    default: return estado
  }
}
