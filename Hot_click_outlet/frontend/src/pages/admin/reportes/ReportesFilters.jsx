import { QUICK, inputCls, inputStyle } from './reportesHelpers'

export default function ReportesFilters({ quick, desde, hasta, onQuick, onDesde, onHasta }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK.map(q => (
        <button key={q.days} onClick={() => onQuick(q.days)}
          className="px-3 py-1.5 rounded-lg text-sm transition-all"
          style={quick === q.days
            ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
            : { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
          {q.label}
        </button>
      ))}
      <input type="date" value={desde} onChange={e => onDesde(e.target.value)}
        className={inputCls} style={inputStyle}/>
      <input type="date" value={hasta} onChange={e => onHasta(e.target.value)}
        className={inputCls} style={inputStyle}/>
    </div>
  )
}
