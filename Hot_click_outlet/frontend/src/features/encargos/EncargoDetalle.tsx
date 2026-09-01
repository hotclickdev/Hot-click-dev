import { formatPrice } from '@/utils/format'
import { etiquetaPresupuestoCliente, linkWhatsAppCotizacion, type Encargo } from '@/services/encargoService'

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

export default function EncargoDetalle({
  encargo, precio, onPrecioChange, mensaje, onMensajeChange,
  motivo, onMotivoChange, busy, onAprobar, onRechazar, onFulfillment, onCerrar,
}: Props) {
  const waLink = precio && Number(precio) > 0
    ? linkWhatsAppCotizacion(encargo, Number(precio))
    : null

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
        <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--hc-border)' }}>
          <div>
            <label htmlFor="encargo-precio-aprobar" className="text-xs">Precio a cobrar (₡)</label>
            <input
              id="encargo-precio-aprobar"
              type="number"
              min={1}
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--hc-border)' }}
              value={precio}
              onChange={(e) => onPrecioChange(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="encargo-mensaje-vendedor" className="text-xs">Mensaje para el cliente (opcional)</label>
            <textarea
              id="encargo-mensaje-vendedor"
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--hc-border)', minHeight: 56 }}
              value={mensaje}
              onChange={(e) => onMensajeChange(e.target.value)}
              maxLength={500}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onAprobar}
            className="w-full rounded-xl py-3 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--hc-primary)' }}
          >
            Aprobar y enviar link de pago
          </button>
          {waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="block text-center text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
              Enviar cotización por WhatsApp
            </a>
          ) : null}
          <div>
            <label htmlFor="encargo-motivo-rechazo" className="text-xs">O rechazar con motivo</label>
            <textarea
              id="encargo-motivo-rechazo"
              className="w-full mt-1 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--hc-border)', minHeight: 64 }}
              value={motivo}
              onChange={(e) => onMotivoChange(e.target.value)}
            />
            <button type="button" disabled={busy} onClick={onRechazar} className="w-full mt-2 rounded-xl border py-2 text-sm">
              Rechazar
            </button>
          </div>
        </div>
      ) : null}

      {encargo.precioCotizado != null && encargo.estado !== 'PENDIENTE' ? (
        <p className="text-sm">Precio cotizado: {formatPrice(encargo.precioCotizado)}</p>
      ) : null}

      {encargo.estado === 'PAGADO' && onFulfillment ? (
        <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--hc-border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>Estado de producción</p>
          <p className="text-sm">Actual: <strong>{encargo.estadoFulfillment ?? 'EN_PRODUCCION'}</strong></p>
          <div className="flex flex-wrap gap-2">
            {FULFILLMENT.map((est) => (
              <button
                key={est}
                type="button"
                disabled={busy || encargo.estadoFulfillment === est}
                onClick={() => onFulfillment(est)}
                className="text-xs px-3 py-1.5 rounded-full border"
                style={{ borderColor: 'var(--hc-border)' }}
              >
                {est.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
