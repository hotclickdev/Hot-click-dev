import { FILTERS, fmt, PAGE_SIZE } from './cuponesHelpers'
import { Badge, StatCard, UsageBar } from './CuponesUi'

export default function CuponesTable({
  stats,
  filter,
  search,
  loading,
  visible,
  page,
  total,
  onApplyFilter,
  onSearch,
  onGoPage,
}) {
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total generados" value={stats.total} color="#4f7cff" />
          <StatCard label="Disponibles"     value={stats.disponibles} color="#34d399" />
          <StatCard label="Usados"          value={stats.usados} color="#f87171" />
          <StatCard
            label="% Redención"
            value={stats.total > 0 ? `${Math.round(stats.usados / stats.total * 100)}%` : '0%'}
            color="var(--hc-blue-300)"
          />
        </div>
      )}

      {stats?.tipos?.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>Tipos de descuento activos</h2>
          <div className="divide-y" style={{ borderColor: 'var(--hc-border)' }}>
            {stats.tipos.map(t => (
              <div key={t.porcentaje} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black"
                    style={{ background: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
                    {t.porcentaje}%
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                      {t.porcentaje === 13 ? 'Descuento de bienvenida' : `Descuento ${t.porcentaje}%`}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                      Popup email capture — primera compra
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>{t.total} códigos</p>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t.usados} usados</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="p-4 flex flex-wrap gap-3 items-center border-b" style={{ borderColor: 'var(--hc-border)' }}>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button type="button"
                key={String(f.value)}
                onClick={() => onApplyFilter(f.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={filter === f.value
                  ? { background: 'var(--hc-accent)', color: '#fff' }
                  : { background: 'var(--hc-bg)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Buscar código o email…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="ml-auto px-3 py-1.5 rounded-xl text-xs outline-none w-52"
            style={{ background: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
        </div>

        {loading ? (
          <div className="p-12 text-center" style={{ color: 'var(--hc-muted)' }}>
            <svg className="w-6 h-6 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Cargando…
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>
            No hay cupones que mostrar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
                  {['Código', 'Email', 'Descuento', 'Usos', 'Estado', 'Generado', 'Usado el'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                      style={{ color: 'var(--hc-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c, i) => (
                  <tr key={c.id ?? i}
                    style={{ borderBottom: '1px solid var(--hc-border)' }}
                    className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-xs px-2 py-1 rounded-lg"
                        style={{ background: 'rgba(23,71,168,0.1)', color: 'var(--hc-accent)' }}>
                        {c.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-text)' }}>{c.email}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-xs" style={{ color: 'var(--hc-blue-300)' }}>
                        {c.descuentoPorcentaje}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <UsageBar usosActuales={c.usosActuales} maxUsos={c.maxUsos} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge used={c.usado} usosActuales={c.usosActuales} maxUsos={c.maxUsos} />
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {fmt(c.fechaCreacion)}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hc-muted)' }}>
                      {fmt(c.fechaUso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!search.trim() && totalPages > 1 && (
          <div className="p-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--hc-border)' }}>
            <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Página {page + 1} de {totalPages} — {total} cupones
            </span>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => onGoPage(page - 1)}
                disabled={page === 0}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40"
                style={{ background: 'var(--hc-bg)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
              >
                ← Anterior
              </button>
              <button type="button"
                onClick={() => onGoPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40"
                style={{ background: 'var(--hc-bg)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
