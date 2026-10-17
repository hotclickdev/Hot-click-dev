import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import { MENSAJE_VACIO, TITULO_VACIO } from '../emprendedor/pages/notificacionesTextos'

/**
 * Notificaciones (Figma 64:504). Sin API de avisos in-app todavía: estado vacío, sin datos de ejemplo.
 */
export default function NotificacionesPage() {
  const ruta = useSellerRuta()
  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px]">
        <EncabezadoPagina titulo="Notificaciones" volverA={ruta('opciones')} />
        <EstadoVacioConversacional titulo={TITULO_VACIO} mensaje={MENSAJE_VACIO} />
      </main>
    </EntradaPagina>
  )
}
