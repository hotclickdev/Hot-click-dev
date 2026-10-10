import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import NotificacionesVacio from '@/prototipo/compartido/NotificacionesVacio'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Notificaciones — Figma móvil 64:154. Sin API de avisos del vendedor: solo el vacío aprobado.
 */
export default function NotificacionesPage() {
  return (
    <EmprendedorPageFrame titulo="Notificaciones" volverA={`${RUTA_EMPRENDEDOR}/opciones`}>
      <NotificacionesVacio />
    </EmprendedorPageFrame>
  )
}
