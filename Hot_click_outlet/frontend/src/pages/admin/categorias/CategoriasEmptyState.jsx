import TextoMas from '@/components/ui/TextoMas'

export default function CategoriasEmptyState({ onCrear }) {
  return (
    <div className="text-center py-14 space-y-3">
      <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
        style={{ backgroundColor: 'rgba(23,71,168,0.08)', border: '1px solid rgba(23,71,168,0.15)' }}>
        <svg className="w-7 h-7" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
          <line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
      </div>
      <p className="font-semibold text-[#e8e8ed]">Sin categorías todavía</p>
      <p className="text-sm text-[#8e8e9a] max-w-xs mx-auto">
        Las categorías organizan tu catálogo. Los productos las necesitan para publicarse.
      </p>
      <button type="button"
        onClick={onCrear}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1 transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
      ><TextoMas>Crear primera categoría</TextoMas></button>
    </div>
  )
}
