import { useNavigate } from 'react-router-dom'

const FEATURE_LABELS = {
  pos:      'Punto de Venta (POS)',
  crm:      'CRM de Clientes',
  compras:  'Módulo de Compras',
  reportes: 'Reportes Avanzados',
  ai:       'Asistente AI',
  api:      'API y Webhooks',
}

/**
 * Bloque de upgrade que se muestra cuando una feature no está disponible en el plan.
 *
 * Props:
 *   feature       string  — clave de la feature bloqueada
 *   planRequerido string  — 'PRO' | 'ENTERPRISE'
 *   compact       bool    — versión reducida para usar inline
 */
export default function UpgradePrompt({ feature, planRequerido = 'PRO', compact = false }) {
  const navigate    = useNavigate()
  const featureLabel = FEATURE_LABELS[feature] ?? feature

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>{featureLabel} requiere plan <strong>{planRequerido}</strong></span>
        <button
          onClick={() => navigate('/admin/planes')}
          className="ml-auto font-semibold underline hover:no-underline"
        >
          Upgrade
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
      {/* Ícono de candado */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
        <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>

      <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">
        {featureLabel}
      </h3>
      <p className="mb-6 max-w-xs text-sm text-gray-500 dark:text-gray-400">
        Esta función requiere el plan <strong className="text-gray-700 dark:text-gray-300">{planRequerido}</strong>.
        Actualiza tu plan para desbloquearla.
      </p>

      <button
        onClick={() => navigate('/admin/planes')}
        className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-400"
      >
        Ver planes disponibles →
      </button>
    </div>
  )
}
