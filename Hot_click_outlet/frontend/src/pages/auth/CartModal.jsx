import Modal from '@/components/ui/Modal'

export default function CartModal({ open, cart, addItem, onClose, onDone }) {
  const restore = async () => {
    cart?.items?.forEach((item) =>
      addItem({ id: item.productoId, nombre: item.nombre, precio: item.precio,
                imagenUrl: item.imagenUrl, stock: item.stock ?? item.cantidad ?? 1 }, item.cantidad ?? 1)
    )
    try {
      const { abandonedCartService: svc } = await import('@/services/abandonedCartService')
      await svc.deleteAbandonedCart(cart.id)
    } catch { /* ok */ }
    onClose(); onDone()
  }
  const discard = async () => {
    try {
      const { abandonedCartService: svc } = await import('@/services/abandonedCartService')
      await svc.deleteAbandonedCart(cart.id)
    } catch { /* ok */ }
    onClose(); onDone()
  }
  return (
    <Modal open={open} title="¡Tenés productos guardados!">
      <div>
        <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>
          Dejaste {cart?.items?.length ?? 0} producto(s) en tu carrito antes. ¿Querés restaurarlos?
        </p>
        <div className="space-y-2 mb-5">
          {cart?.items?.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1">
              {item.imagenUrl && <img src={item.imagenUrl} alt={item.nombre} width={32} height={32} className="rounded-lg object-cover shrink-0" />}
              <span className="text-sm truncate flex-1" style={{ color: 'var(--hc-text)' }}>{item.nombre}</span>
              <span className="text-xs shrink-0" style={{ color: 'var(--hc-muted)' }}>×{item.cantidad ?? 1}</span>
            </div>
          ))}
          {(cart?.items?.length ?? 0) > 3 && (
            <p className="text-xs pl-1" style={{ color: 'var(--hc-muted)' }}>y {cart.items.length - 3} más…</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={restore} className="hc-btn hc-btn-primary flex-1">Restaurar carrito</button>
          <button onClick={discard} className="hc-btn hc-btn-outline flex-1">Descartar</button>
        </div>
      </div>
    </Modal>
  )
}
