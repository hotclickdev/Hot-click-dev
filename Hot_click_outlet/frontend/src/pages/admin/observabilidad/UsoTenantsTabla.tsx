import { formatoColon } from '@/theme/formatoColon'
import {
  etiquetaLimiteAi,
  formatoTokens,
  ordenarTenants,
  claseCuotaAi,
  type OrdenUsoTenant,
  type UsoTenantsRanking,
} from './usoTenantHelpers'

const COLUMNAS: { id: OrdenUsoTenant; label: string }[] = [
  { id: 'gmv', label: 'GMV' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'llamadasAi', label: 'Créditos IA' },
  { id: 'tokensMes', label: 'Tokens mes' },
  { id: 'imagenes', label: 'Imágenes' },
]

export default function UsoTenantsTabla({ ranking, loading, orden, onOrden, onVer }: {
  ranking: UsoTenantsRanking | null
  loading: boolean
  orden: OrdenUsoTenant
  onOrden: (orden: OrdenUsoTenant) => void
  onVer: (empresaId: number) => void
}) {
  if (loading && !ranking) {
    return (
      <div className="rounded-2xl border border-gray-200 p-8 text-sm text-gray-400 dark:border-gray-700">
        Cargando ranking de tenants…
      </div>
    )
  }

  const tenants = ordenarTenants(ranking?.tenants ?? [], orden)
  if (tenants.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 p-8 text-sm text-gray-500 dark:border-gray-700">
        No hay tenants para mostrar.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">Negocio</th>
            {COLUMNAS.map((c) => (
              <th key={c.id} className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                <button type="button" onClick={() => onOrden(c.id)}
                  className={`min-h-11 ${orden === c.id ? 'font-bold text-gray-800 dark:text-white' : ''}`}>
                  {c.label}
                </button>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.empresaId} className="border-t border-gray-100 dark:border-gray-800">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900 dark:text-white">{t.nombre ?? '—'}</p>
                <p className="text-xs text-gray-400">{t.plan} · {t.estadoEmpresa}</p>
              </td>
              <td className="px-4 py-3 font-medium">{formatoColon(t.gmv)}
                <span className="block text-xs text-gray-400">mes {formatoColon(t.gmvMes)}</span>
              </td>
              <td className="px-4 py-3">{t.pedidos.toLocaleString('es-CR')}
                <span className="block text-xs text-gray-400">mes {t.pedidosMes}</span>
              </td>
              <td className="px-4 py-3">
                <span className={claseCuotaAi(t.pctCuotaAi)}>
                  {t.llamadasAi}/{etiquetaLimiteAi(t.limiteAi)}
                </span>
                <span className="block text-xs text-gray-400">{t.pctCuotaAi}%</span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{formatoTokens(t.tokensMes)}</td>
              <td className="px-4 py-3">{t.imagenes}
                <span className="block text-xs text-gray-400">{t.productos} prod.</span>
              </td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => onVer(t.empresaId)}
                  className="min-h-11 text-xs font-semibold text-[var(--hc-primary)] hover:underline">
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
