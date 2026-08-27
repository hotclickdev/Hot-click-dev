import { useMemo, useState } from 'react'
import { CLIENTES, formatoPrecio, letraDe } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminEntityRow, AdminSearchField } from './AdminUi'

/**
 * Admin · Clientes (Figma 81:284).
 */
export default function AdminClientesPage() {
  const [q, setQ] = useState('')
  const lista = useMemo(() => filtrarClientes(q), [q])

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <AdminPageHeader
        titulo="Clientes"
        subtitulo="Compradores de todas las tiendas"
        atras="/prototipo/admin/herramientas"
      />
      <AdminSearchField label="Buscar cliente" placeholder="Buscar cliente" value={q} onChange={setQ} />
      {lista.length === 0 ? (
        <p className="mt-8 text-sm text-hc-muted" role="status">
          No hay clientes con esa búsqueda.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {lista.map((c) => (
            <li key={c.id}>
              <AdminEntityRow
                letra={letraDe(c.nombre)}
                titulo={c.nombre}
                subtitulo={`${c.email} · ${c.compras} compras`}
                extra={formatoPrecio(c.total)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function filtrarClientes(q: string) {
  const texto = q.trim().toLowerCase()
  if (!texto) return CLIENTES
  return CLIENTES.filter((c) => `${c.nombre} ${c.email}`.toLowerCase().includes(texto))
}
