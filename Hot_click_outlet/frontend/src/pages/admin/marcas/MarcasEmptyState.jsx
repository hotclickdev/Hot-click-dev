import TextoMas from '@/components/ui/TextoMas'

function TagIcon() {
  return (
    <svg className="w-7 h-7" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}

export default function MarcasEmptyState({ onCrear }) {
  return (
    <div className="text-center py-14 space-y-3">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.15)' }}>
        <TagIcon />
      </div>
      <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>Sin marcas registradas</p>
      <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--hc-muted)' }}>Las marcas aparecen en el catálogo y en cada producto.</p>
      <button type="button" onClick={onCrear}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
        <TextoMas>Crear primera marca</TextoMas>
      </button>
    </div>
  )
}
