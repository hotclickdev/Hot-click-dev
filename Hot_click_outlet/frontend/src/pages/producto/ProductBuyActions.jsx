import Button from '@/components/ui/Button'
import AddToCartButton from './AddToCartButton'

/**
 * Un rojo por vista: Comprar ahora. Agregar al pedido es el atajo azul.
 */
export default function ProductBuyActions({
  mainCTARef, inStock, justAdded, onAdd, onComprarAhora, t,
}) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        ref={mainCTARef}
        variant="primary"
        size="xl"
        className="w-full h-14 rounded-2xl text-sm font-semibold"
        disabled={!inStock}
        onClick={onComprarAhora}
      >
        {t('product.buyNow')}
      </Button>
      <AddToCartButton inStock={inStock} justAdded={justAdded} onAdd={onAdd} t={t} />
    </div>
  )
}
