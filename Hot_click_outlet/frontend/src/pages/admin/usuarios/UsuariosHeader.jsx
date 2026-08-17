import ImportExportBar from '@/components/admin/ImportExportBar'
import { getEstadoStr, getRolStr } from './usuarioHelpers'

/**
 * @param {{
 *   title: string
 *   subtitle: string
 *   users: object[]
 *   tabs: [string, string][]
 *   tab: string
 *   onTab: (key: string) => void
 *   search: string
 *   onSearch: (value: string) => void
 * }} props
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
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">{title}</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">{subtitle}</p>
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {tabs.map(([key, label]) => (
            <button type="button"
              key={key}
              onClick={() => onTab(key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === key
                  ? key === 'deleted'
                    ? 'bg-red-500/80 text-white'
                    : 'bg-[#4f7cff] text-white'
                  : 'text-[#8e8e9a] hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8e8e9a]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-[#111114] border border-white/10 text-[#e8e8ed] text-xs placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
          />
        </div>
      </div>

      {tab === 'deleted' && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20 text-xs text-red-300">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"
            />
          </svg>
          Los datos de estos usuarios se conservan en la base de datos. Podés restaurar una cuenta para que vuelva a estar activa.
        </div>
      )}
    </>
  )
}
