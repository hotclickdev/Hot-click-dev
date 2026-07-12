import { Helmet } from 'react-helmet-async'

/**
 * Envoltorio mínimo para las rutas /admin/pos/* — sin sidebar ni chrome del
 * Sistema. Las páginas de POS (AdminPOS, AdminPOSCaja, AdminPOSHistorial)
 * traen su propia identidad visual; este shell solo aporta el fondo base y
 * evita que se mezclen con el panel de administración.
 */
export default function POSShell({ children }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {children}
    </div>
  )
}
