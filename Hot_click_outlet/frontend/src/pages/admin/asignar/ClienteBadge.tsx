import type { ClienteAsignar } from './asignarHelpers'

export default function ClienteBadge({ cliente, onCambiar }: {
  cliente: ClienteAsignar | null
  onCambiar: () => void
}) {
  if (!cliente) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.2)' }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
        {cliente.nombre?.[0]?.toUpperCase()}
      </div>
      <span className="text-xs font-medium" style={{ color: 'var(--hc-accent)' }}>{cliente.nombre} {cliente.apellidoPaterno}</span>
      <button type="button" onClick={onCambiar} className="text-[10px] underline ml-1" style={{ color: 'var(--hc-muted)' }}>cambiar</button>
    </div>
  )
}
