/**
 * Estado de error de PlanGate cuando no se pudo leer el plan del negocio.
 */
export default function PlanLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-900/40"
    >
      <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
        No pudimos verificar tu plan
      </h3>
      <p className="mb-6 max-w-xs text-sm text-gray-500 dark:text-gray-400">
        Revisá tu conexión e intentá de nuevo. Si el problema sigue, contactá a soporte.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-xl bg-[var(--hc-primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--hc-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--hc-focus-ring)]"
      >
        Reintentar
      </button>
    </div>
  )
}
