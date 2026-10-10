import EstadoVacioConversacional from './motion/EstadoVacioConversacional'

/**
 * Cuerpo de Notificaciones del panel: el backend todavía no expone avisos del vendedor,
 * así que se muestra el vacío aprobado, sin cifras ni avisos inventados.
 */
export default function NotificacionesVacio() {
  return (
    <EstadoVacioConversacional
      // TODO copy Producto
      titulo="Todavía no tenés notificaciones"
      // TODO copy Producto
      mensaje="Cuando haya novedades de tu tienda, las vas a ver acá."
    />
  )
}
