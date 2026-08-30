import { fmtFechaSuscripcion } from './suscripcionHelpers'
import type { SuscripcionInfo } from './suscripcionHelpers'

export default function SuscripcionAcciones({
  esTrial,
  tieneStripe,
  sub,
  estado,
  confirmarCancelar,
  cancelando,
  abriendo,
  onVerPlanes,
  onAbrirPortal,
  onPedirConfirmacion,
  onCancelarConfirmacion,
  onConfirmarCancelar,
}: {
  esTrial: boolean
  tieneStripe?: boolean
  sub: SuscripcionInfo | null
  estado: string
  confirmarCancelar: boolean
  cancelando: boolean
  abriendo: boolean
  onVerPlanes: () => void
  onAbrirPortal: () => void
  onPedirConfirmacion: () => void
  onCancelarConfirmacion: () => void
  onConfirmarCancelar: () => void
}) {
  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Acciones</p>

      {esTrial && (
        <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--hc-border)' }}>
          <div>
            <p className="text-sm" style={{ color: 'var(--hc-text)' }}>Activar suscripción</p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Elige un plan y paga con tarjeta</p>
          </div>
          <button type="button"
            onClick={onVerPlanes}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
          >
            Elegir plan
          </button>
        </div>
      )}

      {tieneStripe && (
        <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--hc-border)' }}>
          <div>
            <p className="text-sm" style={{ color: 'var(--hc-text)' }}>Portal de facturación</p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Actualizar tarjeta, descargar facturas</p>
          </div>
          <button type="button"
            onClick={onAbrirPortal}
            disabled={abriendo}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          >
            {abriendo ? 'Abriendo…' : 'Abrir portal'}
          </button>
        </div>
      )}

      {tieneStripe && !sub?.cancelarAlVencer && estado === 'ACTIVO' && (
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm" style={{ color: 'var(--hc-text)' }}>Cancelar suscripción</p>
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>Se mantiene activa hasta el fin del período</p>
          </div>
          {confirmarCancelar ? (
            <div className="flex gap-2">
              <button type="button"
                onClick={onCancelarConfirmacion}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}
              >
                No
              </button>
              <button type="button"
                onClick={onConfirmarCancelar}
                disabled={cancelando}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}
              >
                {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
              </button>
            </div>
          ) : (
            <button type="button"
              onClick={onPedirConfirmacion}
              className="px-4 py-2 rounded-xl text-sm transition-opacity hover:opacity-80"
              style={{ color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              Cancelar plan
            </button>
          )}
        </div>
      )}

      {sub?.cancelarAlVencer && (
        <div className="py-2 text-sm" style={{ color: '#fbbf24' }}>
          La suscripción se cancelará al vencer el período ({fmtFechaSuscripcion(sub?.fechaFin)}).
        </div>
      )}
    </div>
  )
}
