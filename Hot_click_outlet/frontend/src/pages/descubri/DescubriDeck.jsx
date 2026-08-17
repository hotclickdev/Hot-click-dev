import { AnimatePresence } from 'framer-motion'
import SwipeCard from '@/components/descubri/SwipeCard'
import SpecialCard from '@/components/descubri/SpecialCard'
import DescubriControls from './DescubriControls'

/** Mazo de cartas (hasta 3 visibles) y controles. */
export default function DescubriDeck({ deck, lastDir, onSwipe, onUndo, detailTo }) {
  return (
    <>
      <div className="relative h-[min(58vh,500px)] min-h-[360px]">
        <AnimatePresence custom={lastDir}>
          {deck.remaining.slice(0, 3).map((p, i) =>
            p._tipo ? (
              <SpecialCard
                key={p.id}
                card={p}
                isTop={i === 0}
                stackIndex={i}
                onSwipe={onSwipe}
              />
            ) : (
              <SwipeCard
                key={p.id}
                product={p}
                isTop={i === 0}
                stackIndex={i}
                onSwipe={onSwipe}
              />
            )
          )}
        </AnimatePresence>
      </div>

      <DescubriControls
        canUndo={deck.canUndo}
        onUndo={onUndo}
        onSwipe={onSwipe}
        detailTo={detailTo}
      />
    </>
  )
}
