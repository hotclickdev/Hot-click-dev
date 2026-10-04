import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'
import NotificacionesVacio from './NotificacionesVacio'

/**
 * Notificaciones (Figma 64:504).
 */
export default function NotificacionesPage() {
  const ruta = useSellerRuta()
  return (
    <EntradaPagina>
      <main className="px-5 pb-8 pt-[60px]">
        <EncabezadoPagina titulo="Notificaciones" volverA={ruta('opciones')} />
        <NotificacionesVacio />
      </main>
    </EntradaPagina>
  )
}
