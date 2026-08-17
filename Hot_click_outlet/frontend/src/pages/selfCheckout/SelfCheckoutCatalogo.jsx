import SelfCheckoutProductCard from './SelfCheckoutProductCard'

/**
 * Grilla de productos del self-checkout.
 */
export default function SelfCheckoutCatalogo({ productos, onAdd }) {
  return (
    <div className="flex-1 p-4">
      {productos.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>No hay productos disponibles</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {productos.map(p => (
            <SelfCheckoutProductCard key={p.id} producto={p} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  )
}
