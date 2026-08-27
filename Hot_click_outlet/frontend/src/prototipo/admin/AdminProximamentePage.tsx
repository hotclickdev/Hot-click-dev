import { Link } from 'react-router-dom'

/**
 * Admin 10 — Próximamente (Figma 48:258).
 */
export default function AdminProximamentePage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <Link to="/prototipo/admin/dashboard" className="inline-flex min-h-8 min-w-8 items-center text-xl" aria-label="Volver">
        ←
      </Link>
      <div className="mt-24 text-center">
        <p className="mx-auto flex size-[72px] items-center justify-center rounded-full bg-hc-surface-2 text-xs font-semibold text-hc-muted">
          En espera
        </p>
        <h1 className="mt-6 font-display text-xl font-bold">Próximamente</h1>
        <p className="mt-3 text-sm text-hc-muted">Esta función del panel admin está en desarrollo.</p>
      </div>
    </main>
  )
}
