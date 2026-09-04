import { useState } from 'react'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { ItemListaStagger, ListaStagger } from '@/prototipo/compartido/motion/ListaStagger'
import { RUTA_EMPRENDEDOR } from '../constants'

type TonoNotif = 'alerta' | 'aviso' | 'exito' | 'info'

type Notif = {
  id: string
  titulo: string
  detalle: string
  hace: string
  tono: TonoNotif
  leida: boolean
}

const INICIALES: Notif[] = [
  {
    id: 'cobro',
    titulo: 'Falló tu cobro mensual',
    detalle: 'Tu método de pago fue rechazado. Actualizalo para no perder tu plan.',
    hace: 'Hace 1 hora',
    tono: 'alerta',
    leida: false,
  },
  {
    id: 'stock',
    titulo: 'Stock por agotarse',
    detalle: 'Auriculares Bluetooth X200 y 3 productos más están por agotarse.',
    hace: 'Hace 3 horas',
    tono: 'aviso',
    leida: false,
  },
  {
    id: 'venta',
    titulo: '¡Nueva venta!',
    detalle: 'Vendiste 2 unidades de Camiseta Oversize Negra por ₡19.800.',
    hace: 'Hoy, 10:20 a.m.',
    tono: 'exito',
    leida: true,
  },
  {
    id: 'aprobado',
    titulo: 'Tu negocio fue aprobado',
    detalle: 'Cargador USB-C 30W ya está visible en el marketplace.',
    hace: 'Ayer',
    tono: 'info',
    leida: true,
  },
]

const ESTILO_TONO: Record<TonoNotif, string> = {
  alerta: 'bg-[var(--hc-danger-bg)] text-hc-danger',
  aviso: 'bg-[var(--hc-warning-bg)] text-hc-warning',
  exito: 'bg-[var(--hc-success-bg)] text-hc-success',
  info: 'bg-[var(--hc-info-bg)] text-hc-info',
}

const GLIFO_TONO: Record<TonoNotif, string> = {
  alerta: '!',
  aviso: '!',
  exito: '✓',
  info: 'i',
}

/**
 * Notificaciones — Figma móvil 64:154 (iconos, leídas, Marcar leídas).
 */
export default function NotificacionesPage() {
  const [items, setItems] = useState(INICIALES)
  const haySinLeer = items.some((n) => !n.leida)

  return (
    <EmprendedorPageFrame
      titulo="Notificaciones"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
      extraMovil={
        haySinLeer ? (
          <button
            type="button"
            className="min-h-11 shrink-0 text-[11px] font-medium text-hc-primary"
            onClick={() => setItems((prev) => prev.map((n) => ({ ...n, leida: true })))}
          >
            Marcar leídas
          </button>
        ) : null
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-hc-muted">Avisos de cobro, stock y ventas</p>
          {haySinLeer ? (
            <button
              type="button"
              className="hidden min-h-11 text-[13px] font-medium text-hc-primary md:inline"
              onClick={() => setItems((prev) => prev.map((n) => ({ ...n, leida: true })))}
            >
              Marcar leídas
            </button>
          ) : null}
        </div>
        <ListaStagger className="flex flex-col gap-3">
          {items.map((item) => (
            <ItemListaStagger key={item.id}>
              <article
                className={`flex gap-3 rounded-xl p-3.5 md:p-4 ${
                  item.leida ? 'border border-hc-border bg-hc-surface' : 'bg-hc-surface-2'
                }`}
              >
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ESTILO_TONO[item.tono]}`}
                  aria-hidden
                >
                  {GLIFO_TONO[item.tono]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold md:text-[15px]">
                    {item.titulo}
                    {!item.leida ? (
                      <span className="size-1.5 shrink-0 rounded-full bg-hc-primary" aria-label="Sin leer" />
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-hc-muted md:text-[13px]">{item.detalle}</p>
                  <p className="mt-1 text-[10px] text-hc-muted md:text-xs">{item.hace}</p>
                </div>
              </article>
            </ItemListaStagger>
          ))}
        </ListaStagger>
      </div>
    </EmprendedorPageFrame>
  )
}
