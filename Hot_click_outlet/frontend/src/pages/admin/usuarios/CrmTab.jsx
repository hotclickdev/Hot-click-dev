import Spinner from '@/components/ui/Spinner'

const SEG_COLORS = { NUEVO: '#6490EA', FRECUENTE: '#34d399', VIP: '#fbbf24', INACTIVO: '#A7B0BC' }

/**
 * @param {{
 *   clientes: object[]
 *   crmSearch: string
 *   onCrmSearch: (value: string) => void
 *   onSelect: (id: number|string) => void
 *   loading: boolean
 * }} props
 */
export default function CrmTab({ clientes, crmSearch, onCrmSearch, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-16"><Spinner size="lg" /></div>
    )
  }

  if (clientes.length === 0) {
    return (
      <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
        <div className="text-center py-12 text-[#8e8e9a] text-sm">No hay clientes registrados</div>
      </div>
    )
  }

  const filtrados = clientes.filter((c) =>
    !crmSearch
    || [c.nombre, c.correo, c.telefono].some((f) => f?.toLowerCase().includes(crmSearch.toLowerCase()))
  )

  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/8">
        <input
          type="text"
          placeholder="Buscar por nombre, correo o teléfono…"
          value={crmSearch}
          onChange={(e) => onCrmSearch(e.target.value)}
          className="w-full h-9 pl-4 pr-4 rounded-xl bg-[#0a0a0d] border border-white/10 text-[#e8e8ed] text-xs placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {['Cliente', 'Segmento', 'Pedidos', 'Total', 'Puntos', 'Acciones'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtrados.map((c) => (
              <CrmRow key={c.id} cliente={c} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CrmRow({ cliente, onSelect }) {
  const seg = cliente.segmento ?? 'NUEVO'
  const segColor = SEG_COLORS[seg] ?? '#A7B0BC'
  return (
    <tr
      className="hover:bg-white/3 transition-colors cursor-pointer"
      onClick={() => onSelect(cliente.id)}
    >
      <td className="px-4 py-3">
        <p className="font-medium text-[#e8e8ed]">{cliente.nombre} {cliente.apellidoPaterno}</p>
        <p className="text-xs text-[#8e8e9a]">{cliente.correo}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ backgroundColor: `${segColor}18`, color: segColor }}
        >
          {seg}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-[#8e8e9a]">{cliente.numPedidosHist ?? 0}</td>
      <td className="px-4 py-3 text-xs font-medium text-[#4f7cff]">
        ₡{new Intl.NumberFormat('es-CR').format(cliente.totalComprasHist ?? 0)}
      </td>
      <td className="px-4 py-3 text-xs font-medium" style={{ color: '#fbbf24' }}>
        {cliente.puntosFidelidad ?? 0} pts
      </td>
      <td className="px-4 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(cliente.id) }}
          className="px-3 py-1 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors"
        >
          Ver ficha
        </button>
      </td>
    </tr>
  )
}
