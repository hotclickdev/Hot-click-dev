/**
 * Encabezado del formulario de cotización B2B.
 */
export default function FormHeader({ esEdicion, onCancelar }: {
  esEdicion: boolean
  onCancelar: () => void
}) {
  return (
    <div className="flex items-center gap-4">
      <button type="button" onClick={onCancelar}
        className="p-2 rounded-xl transition-colors hover:bg-black/10 dark:hover:bg-white/10"
        style={{ color: 'var(--hc-muted)' }}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
      </button>
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
          {esEdicion ? 'Editar cotización' : 'Nueva cotización B2B'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          Completá los datos y agregá los productos
        </p>
      </div>
    </div>
  )
}
