import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { accionesCarrito, accionesSeguras } from './aiChatHelpers'
import type { AiChatMensaje } from './aiChatHelpers'
import type { Producto } from '@/types/producto'

type Props = Readonly<{
  mensaje: AiChatMensaje
  onAgregar: (producto: Producto, cantidad?: number) => void
  /** La hoja no pinta los botones de enlace (WhatsApp de la tienda); la lista clásica ya los muestra. */
  incluirEnlaces?: boolean
}>

const PILL = 'min-h-11 rounded-full px-4 text-[13px] font-semibold leading-[normal] transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hc-blue-600)]'

/**
 * Botones de acción del asesor (AG-28). "Agregar al carrito" aplica la acción que validó el backend sobre el
 * cartStore (vía onAgregar) solo cuando la persona lo aprieta; "Chat de la tienda" abre el WhatsApp que el backend
 * armó (solo si el plan de la tienda lo permite).
 */
export default function AccionesCarrito({ mensaje, onAgregar, incluirEnlaces = false }: Props) {
  const { t } = useTranslation()
  const [agregados, setAgregados] = useState<ReadonlySet<number>>(new Set())
  const carrito = accionesCarrito(mensaje)
  const enlaces = incluirEnlaces ? accionesSeguras(mensaje.acciones) : []
  if (carrito.length === 0 && enlaces.length === 0) return null

  function agregar(producto: Producto, cantidad: number, id: number) {
    onAgregar(producto, cantidad)
    setAgregados((prev) => new Set(prev).add(id))
  }

  return (
    <div className="flex flex-wrap gap-2 pt-0.5" data-testid="ai-chat-acciones-asesor">
      {carrito.map(({ producto, cantidad }) => {
        const id = Number(producto.id)
        const hecho = agregados.has(id)
        return (
          <button
            key={id} type="button" disabled={hecho} onClick={() => agregar(producto, cantidad, id)}
            className={`${PILL} bg-hc-primary text-white disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {hecho
              ? t('chat.carritoAgregado')
              : t('chat.agregarAlCarrito', { cantidad, nombre: producto.nombre })}
          </button>
        )
      })}
      {enlaces.map((a) => (
        <a
          key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
          className={`${PILL} inline-flex items-center border border-hc-n-200 bg-hc-n-0 text-hc-n-900`}
        >
          {a.tipo === 'whatsapp' ? t('chat.chatTienda') : a.label}
        </a>
      ))}
    </div>
  )
}
