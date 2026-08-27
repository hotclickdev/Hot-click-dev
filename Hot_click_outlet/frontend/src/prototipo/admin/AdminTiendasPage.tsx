import { useMemo, useState } from 'react'
import { TIENDAS, letraDe, tonoEstadoTienda } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminChipRow, AdminEntityRow, AdminSearchField } from './AdminUi'

const FILTROS = ['Todas', 'Activas', 'Pendientes', 'Suspendidas'] as const
type FiltroTienda = (typeof FILTROS)[number]

/**
 * Admin 02 — Tiendas (Figma 42:128).
 */
export default function AdminTiendasPage() {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<FiltroTienda>('Todas')
  const lista = useMemo(() => filtrarTiendas(q, filtro), [q, filtro])

  return (
    <main className="mx-auto max-w-md px-5 pb-8 pt-14">
      <AdminPageHeader titulo="Tiendas" subtitulo="48 tiendas registradas en HotClick" />
      <AdminSearchField
        label="Buscar tienda o vendedor"
        placeholder="Buscar tienda o vendedor"
        value={q}
        onChange={setQ}
      />
      <div className="mt-4">
        <AdminChipRow opciones={FILTROS} valor={filtro} onChange={setFiltro} />
      </div>
      <ListaFiltrada total={lista.length} />
      <ul className="mt-4 flex flex-col gap-4">
        {lista.map((tienda) => (
          <li key={tienda.id}>
            <AdminEntityRow
              to={`/prototipo/admin/tiendas/${tienda.id}`}
              letra={letraDe(tienda.nombre)}
              titulo={tienda.nombre}
              subtitulo={tienda.handle}
              badge={tienda.estado}
              badgeTono={tonoEstadoTienda(tienda.estado)}
            />
          </li>
        ))}
      </ul>
    </main>
  )
}

function ListaFiltrada({ total }: { total: number }) {
  if (total > 0) return null
  return (
    <p className="mt-8 text-sm text-hc-muted" role="status">
      No hay tiendas con ese filtro.
    </p>
  )
}

function filtrarTiendas(q: string, filtro: FiltroTienda) {
  const texto = q.trim().toLowerCase()
  return TIENDAS.filter((t) => {
    if (filtro === 'Activas' && t.estado !== 'Activa') return false
    if (filtro === 'Pendientes' && t.estado !== 'Pendiente') return false
    if (filtro === 'Suspendidas' && t.estado !== 'Suspendida') return false
    if (!texto) return true
    return `${t.nombre} ${t.handle}`.toLowerCase().includes(texto)
  })
}
