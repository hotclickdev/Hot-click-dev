export default function ReportesKpis({ cols = 4, children }) {
  const className = cols === 3
    ? 'grid grid-cols-3 gap-3'
    : 'grid grid-cols-2 md:grid-cols-4 gap-3'
  return <div className={className}>{children}</div>
}
