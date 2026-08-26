import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useWishlistStore from '@/store/wishlistStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'
import useDescubriDeck from '@/components/descubri/useDescubriDeck'
import DescubriHeader from './descubri/DescubriHeader'
import DescubriLoading from './descubri/DescubriLoading'
import DescubriError from './descubri/DescubriError'
import DescubriDeck from './descubri/DescubriDeck'
import DescubriDone from './descubri/DescubriDone'
import { destinoDetalleDescubri } from './descubri/destinoDetalleDescubri'

export default function DescubriPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const deck = useDescubriDeck()
  const { toggle, isLiked } = useWishlistStore()
  const addItem = useCartStore((s) => s.addItem)
  const [lastDir, setLastDir] = useState('like')
  const lastSwipeAt = useRef(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (deck.status === 'ready' && !startedRef.current) {
      startedRef.current = true
      analytics.descubriStart(deck.total)
    }
  }, [deck.status, deck.total])

  useEffect(() => {
    if (deck.status === 'done') analytics.descubriFinish(deck.liked.length, deck.seen)
  }, [deck.status]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwipe = useCallback((dir) => {
    const now = Date.now()
    if (now - lastSwipeAt.current < 260) return
    lastSwipeAt.current = now
    const top = deck.remaining[0]
    if (!top) return
    setLastDir(dir)
    // Carta especial (info/empresa): solo se descarta — sin wishlist ni
    // analytics de producto (su evento _view ya se disparó al ser top).
    if (top._tipo) {
      deck.swipe(dir)
      return
    }
    if (dir === 'like' && !isLiked(top.id)) toggle(top)
    analytics.descubriSwipe(top, dir)
    deck.swipe(dir)
  }, [deck, isLiked, toggle])

  const handleUndo = useCallback(() => {
    if (!deck.canUndo) return
    analytics.descubriUndo()
    deck.undo()
  }, [deck])

  // Teclado en PC: ← paso, → me gusta, Z deshacer
  useEffect(() => {
    if (deck.status !== 'ready') return
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') handleSwipe('like')
      else if (e.key === 'ArrowLeft') handleSwipe('skip')
      else if (e.key.toLowerCase() === 'z') handleUndo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck.status, handleSwipe, handleUndo])

  // Destino del botón "detalle" según la carta en el top del mazo
  const top = deck.remaining[0]
  const detailTo = destinoDetalleDescubri(top, deck.remaining)

  const handleAddAll = () => {
    const disponibles = deck.liked.filter((p) => p.stock > 0)
    disponibles.forEach((p) => addItem(p))
    analytics.descubriAddAll(disponibles.length, disponibles.reduce((s, p) => s + p.precio, 0))
    toast({ message: t('descubri.addedAll', { count: disponibles.length }), type: 'success' })
    navigate('/carrito')
  }

  return (
    <MainLayout>
      <Helmet>
        <title>{t('descubri.metaTitle')}</title>
        <meta name="description" content={t('descubri.metaDescription')} />
      </Helmet>

      <div className="max-w-md mx-auto px-4 pt-5 pb-8 sm:pt-8">
        <DescubriHeader deck={deck} />
        {deck.status === 'loading' && <DescubriLoading />}
        {deck.status === 'error' && <DescubriError onRetry={deck.restart} />}
        {deck.status === 'ready' && (
          <DescubriDeck
            deck={deck}
            lastDir={lastDir}
            onSwipe={handleSwipe}
            onUndo={handleUndo}
            detailTo={detailTo}
          />
        )}
        {deck.status === 'done' && (
          <DescubriDone
            liked={deck.liked}
            onAddAll={handleAddAll}
            onRestart={deck.restart}
          />
        )}
      </div>
    </MainLayout>
  )
}
