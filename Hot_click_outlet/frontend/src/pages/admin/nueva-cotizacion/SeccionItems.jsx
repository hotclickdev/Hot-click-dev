import ItemRow from './ItemRow'
import SectionCard from './SectionCard'

/**
 * Tabla de ítems de la cotización.
 */
export default function SeccionItems({ items, productos, onChange, onRemove, onAgregar }) {
  return (
    <SectionCard title="Productos">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hc-border)' }}>
              {['Producto', 'Img', 'Código', 'Cant.', 'Unidad', 'Precio unit.', 'Desc. %', 'Subtotal', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--hc-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <ItemRow key={i} item={item} index={i}
                productos={productos}
                onChange={onChange}
                onRemove={onRemove} />
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={onAgregar}
        className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: 'var(--hc-accent)', borderColor: 'var(--hc-accent)' }}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
        Agregar ítem
      </button>
    </SectionCard>
  )
}
