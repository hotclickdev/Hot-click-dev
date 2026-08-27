import { useState } from 'react'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR } from '../constants'

const INICIALES = [
  {
    id: 'cobro',
    titulo: 'Falló tu cobro mensual',
    detalle: 'Tu método de pago fue rechazado. Actualizalo para no perder tu plan.',
    hace: 'Hace 1 hora',
    tono: 'alerta' as const,
    leida: false,
  },
  {
    id: 'stock',
    titulo: 'Stock por agotarse',
    detalle: 'Auriculares Bluetooth X200 y 3 productos más están por agotarse.',
    hace: 'Hace 3 horas',
    tono: 'aviso' as const,
    leida: false,
  },
  {
    id: 'venta',
    titulo: 'Nueva venta',
    detalle: 'Vendiste 2 unidades de Camiseta Oversize Negra por ₡19.800.',
    hace: 'Hoy, 10:20 a.m.',
    tono: 'exito' as const,
    leida: true,
  },
  {
    id: 'aprobado',
    titulo: 'Tu producto fue aprobado',
    detalle: 'Cargador USB-C 30W ya está visible en el marketplace.',
    hace: 'Ayer',
    tono: 'info' as const,
    leida: true,
  },
]

const TONO_ICONO = {
  alerta: 'bg-[var(--hc-danger-bg)] text-hc-primary',
  aviso: 'bg-[var(--hc-warning-bg)] text-hc-warning',
  exito: 'bg-[var(--hc-success-bg)] text-hc-success',
  info: 'bg-[var(--hc-info-bg)] text-hc-accent',
}

/**
 * Notificaciones (Figma 64:154).
 */
export default function NotificacionesPage() {
  const [items, setItems] = useState(INICIALES)
  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8">
      <CabeceraAtras
        titulo="Notificaciones"
        to={`${RUTA_EMPRENDEDOR}/opciones`}
        extra={
          <button
            type="button"
            className="min-h-11 text-[11px] font-medium text-hc-primary"
            onClick={() => setItems((prev) => prev.map((n) => ({ ...n, leida: true })))}
          >
            Marcar leídas
          </button>
        }
      />
      {items.map((item) => (
        <article
          key={item.id}
          className={`flex gap-3 rounded-xl p-3 ${item.leida ? 'bg-hc-surface' : 'bg-[var(--hc-n-50)]'}`}
        >
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${TONO_ICONO[item.tono]}`}>
            {item.tono === 'exito' ? 'ok' : item.tono === 'info' ? 'i' : '!'}
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-bold">
              {item.titulo}
              {item.leida ? null : <span className="size-1.5 rounded-full bg-hc-primary" aria-label="Sin leer" />}
            </p>
            <p className="mt-0.5 text-[11px] text-hc-muted">{item.detalle}</p>
            <p className="mt-1 text-[10px] text-hc-muted">{item.hace}</p>
          </div>
        </article>
      ))}
    </main>
  )
}
