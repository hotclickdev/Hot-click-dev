/**
 * Ficha de la tienda: Comprar ahora es el job; agregar se queda en la ficha.
 */
export default function TiendaBuyActions({ stockDisponible, agregado, onAgregar, onComprarAhora }) {
  if (stockDisponible <= 0) return null
  return (
    <div className="flex flex-col gap-2 mt-2">
      <button
        type="button"
        onClick={onComprarAhora}
        className="w-full py-3 min-h-[44px] rounded-xl text-white font-semibold"
        style={{ backgroundColor: 'var(--t-primary)' }}
      >
        Comprar ahora
      </button>
      <button
        type="button"
        onClick={onAgregar}
        className={`w-full py-3 min-h-[44px] rounded-xl font-semibold ${
          agregado
            ? 'text-white border border-transparent'
            : 'border border-[var(--t-border)] text-[var(--t-text)] hover:bg-[var(--t-hover)]'
        }`}
        style={agregado ? { backgroundColor: 'var(--hc-success)' } : undefined}
      >
        {agregado ? 'Agregado al pedido' : 'Agregar al pedido'}
      </button>
    </div>
  )
}
