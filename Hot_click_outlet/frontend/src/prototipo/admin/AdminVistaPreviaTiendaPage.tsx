import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { PRODUCTOS_PREVIEW, formatoPrecio, letraDe, tiendaPorId } from './adminData'
import { AdminNoEncontrado } from './AdminTiendaDetallePage'
import { AdminAvatar, AdminChipRow } from './AdminUi'

const CHIPS = ['Todos', 'Tecnología', 'Ropa'] as const

/**
 * Admin 12 — Vista previa de tienda (Figma 49:128).
 */
export default function AdminVistaPreviaTiendaPage() {
  const { id = '' } = useParams()
  const tienda = tiendaPorId(id)
  const [chip, setChip] = useState<(typeof CHIPS)[number]>('Todos')
  if (!tienda) return <AdminNoEncontrado que="tienda" />

  return (
    <div className="mx-auto max-w-md bg-hc-surface pb-10">
      <div className="flex min-h-14 items-center gap-3 px-5">
        <Link to={`/prototipo/admin/tiendas/${tienda.id}`} className="text-xl" aria-label="Volver">
          ←
        </Link>
        <p className="text-[11px] text-hc-muted">Vista previa desde Admin</p>
      </div>
      <p className="bg-hc-text py-2 text-center text-[10px] font-medium text-hc-surface">
        Así te ven los compradores
      </p>
      <div className="h-24 bg-hc-surface-2" aria-hidden />
      <div className="flex items-start gap-3 px-5 pt-4">
        <AdminAvatar letra={letraDe(tienda.nombre)} size="lg" />
        <div>
          <p className="font-medium">Tienda {tienda.nombre}</p>
          <p className="text-[11px] text-hc-muted">
            {tienda.rating} · {tienda.ventas} ventas · Outlet oficial
          </p>
        </div>
      </div>
      <div className="px-5 pt-5">
        <span className="inline-flex min-h-8 items-center rounded-full border border-hc-border px-4 text-xs font-medium">
          + Seguir tienda
        </span>
        <label className="mt-4 block">
          <span className="sr-only">Buscar en esta tienda</span>
          <input
            type="search"
            placeholder="Buscar en esta tienda"
            className="min-h-11 w-full rounded-lg bg-hc-surface-2 px-3.5 text-sm placeholder:text-hc-muted"
          />
        </label>
        <div className="mt-4">
          <AdminChipRow opciones={CHIPS} valor={chip} onChange={setChip} />
        </div>
        <h2 className="mb-3 mt-5 text-[15px] font-bold">Productos de esta tienda</h2>
        <ul className="grid grid-cols-2 gap-3">
          {PRODUCTOS_PREVIEW.map((p) => (
            <li key={p.id}>
              <article className="overflow-hidden">
                <div className="h-[100px] rounded-lg bg-hc-surface-2" aria-hidden />
                <p className="mt-2 text-[10px] font-medium text-hc-success">Disponible</p>
                <p className="mt-1 text-xs font-medium">{p.nombre}</p>
                <p className="mt-1 text-sm font-semibold">{formatoPrecio(p.precio)}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
