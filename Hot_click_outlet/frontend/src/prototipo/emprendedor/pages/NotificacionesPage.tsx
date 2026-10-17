import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import EstadoVacioConversacional from '@/prototipo/compartido/motion/EstadoVacioConversacional'
import { RUTA_EMPRENDEDOR } from '../constants'

import { MENSAJE_VACIO, TITULO_VACIO } from './notificacionesTextos'

/**
 * Notificaciones — Figma móvil 64:154. Sin API de avisos in-app todavía: se muestra el estado vacío.
 * Antes había una lista de ejemplo fija que parecía de otro negocio (visitante 16-oct, ítem 1).
 */
export default function NotificacionesPage() {
  return (
    <EmprendedorPageFrame titulo="Notificaciones" volverA={`${RUTA_EMPRENDEDOR}/opciones`}>
      <div className="flex flex-col gap-5">
        <p className="text-sm text-hc-muted">Avisos de cobro, stock y ventas</p>
        <EstadoVacioConversacional titulo={TITULO_VACIO} mensaje={MENSAJE_VACIO} />
      </div>
    </EmprendedorPageFrame>
  )
}
