import type { RefObject } from 'react'
import type { TFunction } from 'i18next'
import Button from '@/components/ui/Button'
import AddToCartButton from './AddToCartButton'

type ProductBuyActionsProps = {
  mainCTARef: RefObject<HTMLButtonElement | null>
  inStock: boolean
  justAdded: boolean
  onAdd: () => void
  onComprarAhora: () => void
  t: TFunction
}

export default function ProductBuyActions({
  mainCTARef, inStock, justAdded, onAdd, onComprarAhora, t,
}: ProductBuyActionsProps) {
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
