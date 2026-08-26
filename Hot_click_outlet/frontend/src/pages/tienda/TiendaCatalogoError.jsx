/** Error de carga del catálogo público. */
export default function TiendaCatalogoError({ onRetry }) {
  return (
    <div className="text-center py-16 px-4">
      <p className="text-[var(--t-text)] font-semibold">No se pudo cargar el catálogo</p>
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
  )
}
