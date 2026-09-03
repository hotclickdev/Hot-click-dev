import { useEffect, useState } from 'react'
import { formatPrice } from '@/utils/format'
import { etiquetaPresupuestoCliente, type Encargo } from '@/services/encargoService'
import EncargoRespuestaPasos from './EncargoRespuestaPasos'

type Props = Readonly<{
  encargo: Encargo
  precio: string
  onPrecioChange: (v: string) => void
  mensaje: string
  onMensajeChange: (v: string) => void
  motivo: string
  onMotivoChange: (v: string) => void
  busy: boolean
  onAprobar: () => void
  onRechazar: () => void
  onFulfillment?: (estado: string) => void
  onCerrar: () => void
}>

const FULFILLMENT = ['EN_PRODUCCION', 'LISTO', 'ENTREGADO'] as const
type FulfillmentEstado = (typeof FULFILLMENT)[number]

function etiquetaFulfillment(est: FulfillmentEstado): string {
  return est.replaceAll('_', ' ')
}

type FulfillmentProps = Readonly<{
  encargo: Encargo
  busy: boolean
  onFulfillment: (estado: string) => void
}>

function FulfillmentEstadoProduccion({ encargo, busy, onFulfillment }: FulfillmentProps) {
  const [pendiente, setPendiente] = useState<FulfillmentEstado | null>(null)

  useEffect(() => {
    if (pendiente && encargo.estadoFulfillment === pendiente) {
      setPendiente(null)
    }
  }, [encargo.estadoFulfillment, pendiente])

  const confirmar = () => {
    if (!pendiente) return
    onFulfillment(pendiente)
  }

  return (
    <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--hc-border)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Estado de producción</p>
      <p className="text-sm">Actual: <strong>{encargo.estadoFulfillment ?? 'EN_PRODUCCION'}</strong></p>
      {pendiente ? (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface-2, rgba(0,0,0,0.02))' }}>
          <p className="text-sm font-medium">¿Marcar como {etiquetaFulfillment(pendiente)}?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={confirmar}
              className="text-xs px-4 py-2 rounded-full font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: 'var(--hc-primary)' }}
            >
              {busy ? 'Guardando…' : 'Sí'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setPendiente(null)}
              className="text-xs px-4 py-2 rounded-full border disabled:opacity-60"
              style={{ borderColor: 'var(--hc-border)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {FULFILLMENT.map((est) => (
            <button
              key={est}
              type="button"
              disabled={busy || encargo.estadoFulfillment === est}
              onClick={() => setPendiente(est)}
              className="text-xs px-3 py-1.5 rounded-full border disabled:opacity-60"
              style={{ borderColor: 'var(--hc-border)' }}
            >
              {etiquetaFulfillment(est)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function EncargoDetalle({
  encargo, precio, onPrecioChange, mensaje, onMensajeChange,
  motivo, onMotivoChange, busy, onAprobar, onRechazar, onFulfillment, onCerrar,
}: Props) {
  return (
    <div className="bg-white dark:bg-[#111114] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h2 className="font-semibold">{encargo.productoNombre}</h2>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            {encargo.nombreCliente} · {encargo.email}
            {encargo.telefono ? ` · ${encargo.telefono}` : ''}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="text-sm">Cerrar</button>
      </div>

      <p className="text-xs rounded-xl border px-3 py-2" style={{ borderColor: 'var(--hc-border)' }}>
        Presupuesto del cliente: <strong>{etiquetaPresupuestoCliente(encargo)}</strong>
      </p>

      <div className="grid grid-cols-3 gap-2">
        {[encargo.imagenUrl1, encargo.imagenUrl2, encargo.imagenUrl3].filter(Boolean).map((url) => (
          <img key={url as string} src={url as string} alt="Referencia" className="aspect-square rounded-xl object-cover" />
        ))}
      </div>

      {encargo.notas ? (
        <div className="text-sm rounded-xl border p-3" style={{ borderColor: 'var(--hc-border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--hc-muted)' }}>Notas del cliente</p>
          {encargo.notas}
        </div>
      ) : null}

      {encargo.tallaSeleccionada ? (
        <p className="text-sm">Medida/talla: <strong>{encargo.tallaSeleccionada}</strong></p>
      ) : null}

      {encargo.estado === 'PENDIENTE' ? (
        <EncargoRespuestaPasos
          encargo={encargo}
          precio={precio}
          onPrecioChange={onPrecioChange}
          mensaje={mensaje}
          onMensajeChange={onMensajeChange}
          motivo={motivo}
          onMotivoChange={onMotivoChange}
          busy={busy}
          onAprobar={onAprobar}
          onRechazar={onRechazar}
        />
      ) : null}

      {encargo.precioCotizado != null && encargo.estado !== 'PENDIENTE' ? (
        <p className="text-sm">Precio cotizado: {formatPrice(encargo.precioCotizado)}</p>
      ) : null}

      {encargo.estado === 'PAGADO' && onFulfillment ? (
        <FulfillmentEstadoProduccion encargo={encargo} busy={busy} onFulfillment={onFulfillment} />
      ) : null}
    </div>
  )
}
