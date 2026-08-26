import { estiloMarcaTienda } from './tiendaTheme'

/** Fallo de red o servidor al abrir /tienda/:slug (no es 404). */
export default function TiendaInfoError({ onRetry }) {
  return (
    <div className="hc-tenant-theme min-h-screen flex items-center justify-center px-4" style={estiloMarcaTienda(null)}>
      <div className="text-center max-w-md">
        <p className="font-semibold text-[var(--t-text)]">No se pudo abrir esta tienda</p>
        <p className="text-sm mt-2 text-[var(--t-muted)]">Verificá tu conexión e intentá de nuevo.</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center mt-6 px-5 min-h-11 rounded-lg text-white text-sm font-semibold"
          style={{ backgroundColor: 'var(--t-primary)' }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}
