import { useMemo, useState } from 'react'
import { USUARIOS, letraDe, tonoRol } from './adminData'
import AdminPageHeader from './AdminPageHeader'
import { AdminChipRow, AdminEntityRow, AdminSearchField } from './AdminUi'

const FILTROS = ['Todos', 'Vendedores', 'Compradores'] as const
type FiltroUsuario = (typeof FILTROS)[number]

/**
 * Admin 03 — Usuarios (Figma 42:191).
 */
export default function AdminUsuariosPage() {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<FiltroUsuario>('Todos')
  const lista = useMemo(() => filtrarUsuarios(q, filtro), [q, filtro])

  return (
    <main className="mx-auto max-w-md px-5 pb-8 pt-14">
      <AdminPageHeader titulo="Usuarios" subtitulo="Vendedores y compradores de la plataforma" />
      <AdminSearchField label="Buscar usuario" placeholder="Buscar usuario" value={q} onChange={setQ} />
      <div className="mt-4">
        <AdminChipRow opciones={FILTROS} valor={filtro} onChange={setFiltro} />
      </div>
      {lista.length === 0 ? (
        <p className="mt-8 text-sm text-hc-muted" role="status">
          No hay usuarios con ese filtro.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {lista.map((u) => (
            <li key={u.id}>
              <AdminEntityRow
                to={`/prototipo/admin/usuarios/${u.id}`}
                letra={letraDe(u.nombre)}
                titulo={u.nombre}
                subtitulo={u.email}
                badge={u.rol}
                badgeTono={tonoRol(u.rol)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function filtrarUsuarios(q: string, filtro: FiltroUsuario) {
  const texto = q.trim().toLowerCase()
  return USUARIOS.filter((u) => {
    if (filtro === 'Vendedores' && u.rol !== 'Vendedor' && u.rol !== 'Suspendido') return false
    if (filtro === 'Compradores' && u.rol !== 'Comprador') return false
    if (!texto) return true
    return `${u.nombre} ${u.email}`.toLowerCase().includes(texto)
  })
}
