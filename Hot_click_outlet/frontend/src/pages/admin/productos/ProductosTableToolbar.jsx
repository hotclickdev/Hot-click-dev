import { PROD_PAGE_SIZE } from './productosHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function PaginacionProductos({ prodPage, productsLength, totalProds, onPage }) {
  if (totalProds <= PROD_PAGE_SIZE) return null
  return (
    <div className="px-4 py-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
      <span>Página {prodPage + 1} · {productsLength} de {totalProds} productos</span>
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={() => onPage(Math.max(0, prodPage - 1))}
          disabled={prodPage === 0}
          className="px-2 py-1 rounded-lg disabled:opacity-30 transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
        >
          <TextoFlecha dir="atras">Anterior</TextoFlecha>
        </button>
        <button type="button"
          onClick={() => onPage(prodPage + 1)}
          disabled={(prodPage + 1) * PROD_PAGE_SIZE >= totalProds}
          className="px-2 py-1 rounded-lg disabled:opacity-30 transition-colors hover:bg-[var(--hc-surface-2)]"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}
        >
          <TextoFlecha>Siguiente</TextoFlecha>
        </button>
      </div>
    </div>
  )
}
