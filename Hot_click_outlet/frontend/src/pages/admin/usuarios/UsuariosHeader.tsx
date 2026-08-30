import ImportExportBar from '@/components/admin/ImportExportBar'
import { AdminFilterChip, AdminSearchField } from '@/prototipo/admin/AdminUi'
import { getEstadoStr, getRolStr, type UsuarioAdmin } from './usuarioHelpers'

export type UsuariosHeaderProps = {
  title: string
  subtitle: string
  users: UsuarioAdmin[]
  tabs: [string, string][]
  tab: string
  onTab: (key: string) => void
  search: string
  onSearch: (value: string) => void
}

/**
 * Encabezado Usuarios (Figma 42:191).
 */
export default function UsuariosHeader({
  title,
  subtitle,
  users,
  tabs,
  tab,
  onTab,
  search,
  onSearch,
}: UsuariosHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-[22px] font-bold text-hc-text">{title}</h1>
          <p className="mt-0.5 text-xs text-hc-muted">{subtitle}</p>
        </div>
        <ImportExportBar
          exportOnly
          data={users.map((u) => ({
            id: u.id,
            nombre: u.nombre ?? '',
            correo: u.correo ?? '',
            rol: getRolStr(u),
            estado: getEstadoStr(u),
          }))}
          columns={['id', 'nombre', 'correo', 'rol', 'estado']}
          filename="usuarios"
          sheetName="Usuarios"
        />
      </div>

      <AdminSearchField
        value={search}
        onChange={onSearch}
        placeholder="Buscar usuario"
        label="Buscar usuario"
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1" data-mm="filtro-usuarios">
        {tabs.map(([key, label]) => (
          <AdminFilterChip key={key} activo={tab === key} onClick={() => onTab(key)}>
            {label}
          </AdminFilterChip>
        ))}
      </div>

      {tab === 'deleted' && (
        <div className="flex items-center gap-2.5 rounded-xl border border-hc-border bg-[var(--hc-danger-bg)] px-4 py-3 text-xs text-hc-danger">
          Los datos de estos usuarios se conservan. Podés restaurar una cuenta para que vuelva a estar activa.
        </div>
      )}
    </div>
  )
}
