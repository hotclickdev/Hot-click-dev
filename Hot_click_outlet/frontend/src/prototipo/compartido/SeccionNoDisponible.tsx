import { Link, useLocation } from 'react-router-dom'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'

/**
 * QA-AUT-046: una ruta del panel que no existe (p. ej. /emprendedor/facturacion, adonde llevaba
 * /admin/facturacion) dejaba la pantalla en blanco. Ahora explica que no está disponible y ofrece volver.
 */
export default function SeccionNoDisponible({ volverA }: Readonly<{ volverA: string }>) {
  const { pathname } = useLocation()
  const facturacion = pathname.includes('facturacion')
  return (
    <main className="px-5 py-8 md:px-16 md:py-12">
      <EstadoVacioConversacional
        titulo={facturacion ? 'La facturación todavía no está en tu panel' : 'Esta sección no está disponible'}
        mensaje={facturacion
          ? 'Por ahora no podés emitir ni ver facturas desde acá. Tus ventas y reportes siguen en el panel.'
          : 'Puede que el enlace ya no exista o que tu plan no incluya esta sección.'}
        accion={(
          <Link to={volverA} className="hc-btn hc-btn-primary" style={{ textDecoration: 'none' }}>
            Volver al panel
          </Link>
        )}
      />
    </main>
  )
}
