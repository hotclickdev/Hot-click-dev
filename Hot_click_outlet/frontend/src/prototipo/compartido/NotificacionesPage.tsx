import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

const NOTIFS = [
  { id: 'cobro', titulo: 'Falló tu cobro mensual', detalle: 'Tu método de pago fue rechazado. Actualizalo para no perder tu plan.', cuando: 'Hace 1 hora', noLeida: true, tono: 'alerta' },
  { id: 'stock', titulo: 'Stock por agotarse', detalle: 'Auriculares Bluetooth X200 y 3 productos más están por agotarse.', cuando: 'Hace 3 horas', noLeida: true, tono: 'alerta' },
  { id: 'venta', titulo: 'Nueva venta', detalle: 'Vendiste 2 unidades de Camiseta Oversize Negra por ₡19.800.', cuando: 'Hoy, 10:20 a.m.', noLeida: false, tono: 'ok' },
  { id: 'aprobado', titulo: 'Tu negocio fue aprobado', detalle: 'Tu catálogo ya puede verse en el marketplace.', cuando: 'Ayer', noLeida: false, tono: 'info' },
] as const

/**
 * Notificaciones (Figma 64:504).
 */
export default function NotificacionesPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina
        titulo="Notificaciones"
        volverA={ruta('opciones')}
        extra={<button type="button" className="text-xs text-hc-accent">Marcar leídas</button>}
      />
      <ul className="space-y-3">
        {NOTIFS.map((item) => (
          <li key={item.id} className="flex gap-3 rounded-xl bg-hc-surface-2 p-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{ background: fondoTono(item.tono), color: colorTono(item.tono) }}
            >
              {item.tono === 'ok' ? '✓' : item.tono === 'alerta' ? '!' : 'i'}
            </span>
            <div>
              <p className="text-sm font-medium">
                {item.titulo}
                {item.noLeida ? <span className="ml-1 inline-block size-1.5 rounded-full bg-hc-primary" /> : null}
              </p>
              <p className="mt-1 text-xs text-hc-muted">{item.detalle}</p>
              <p className="mt-1 text-[11px] text-hc-muted">{item.cuando}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

function fondoTono(tono: string): string {
  if (tono === 'ok') return 'var(--hc-success-bg)'
  if (tono === 'alerta') return 'var(--hc-danger-bg)'
  return 'var(--hc-info-bg)'
}

function colorTono(tono: string): string {
  if (tono === 'ok') return 'var(--hc-success)'
  if (tono === 'alerta') return 'var(--hc-danger)'
  return 'var(--hc-info)'
}
