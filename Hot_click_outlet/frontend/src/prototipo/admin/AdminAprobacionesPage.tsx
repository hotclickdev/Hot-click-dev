import { useState } from 'react'
import { APROBACIONES_TIENDA, letraDe } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminAvatar, AdminBadge } from './AdminUi'

/**
 * Admin · Aprobaciones de tiendas (Figma 85:228).
 */
export default function AdminAprobacionesPage() {
  const [ids, setIds] = useState(() => APROBACIONES_TIENDA.map((a) => a.id))
  const lista = APROBACIONES_TIENDA.filter((a) => ids.includes(a.id))

  function quitar(id: string) {
    setIds((prev) => prev.filter((x) => x !== id))
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Aprobaciones"
        subtitulo="Tiendas nuevas esperando revisión"
        atras="/prototipo/admin/herramientas"
      />
      {lista.length === 0 ? (
        <p className="text-sm text-hc-muted" role="status">
          No hay tiendas pendientes.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {lista.map((a) => (
            <li key={a.id} className="rounded-lg border border-hc-border p-3.5">
              <div className="flex items-center gap-3">
                <AdminAvatar letra={letraDe(a.nombre)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{a.nombre}</p>
                  <p className="text-xs text-hc-muted">
                    {a.handle} · {a.cuando}
                  </p>
                </div>
                <AdminBadge tono="warn">Pendiente</AdminBadge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  className="flex min-h-10 items-center justify-center rounded-lg bg-hc-text text-sm font-medium text-hc-surface"
                  onClick={() => quitar(a.id)}
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className="flex min-h-10 items-center justify-center rounded-lg border border-hc-border text-sm font-medium"
                  onClick={() => quitar(a.id)}
                >
                  Rechazar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
