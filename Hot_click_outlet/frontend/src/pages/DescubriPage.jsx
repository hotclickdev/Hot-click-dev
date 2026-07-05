import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useWishlistStore from '@/store/wishlistStore'
import useCartStore from '@/store/cartStore'
import { useToast } from '@/components/ui/Toast'
import { analytics } from '@/utils/analytics'
import { formatPrice } from '@/utils/format'
import useDescubriDeck from '@/components/descubri/useDescubriDeck'
import SwipeCard from '@/components/descubri/SwipeCard'

const IconX = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" {...props}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
const IconHeart = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
)
const IconUndo = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 010 12h-3" />
  </svg>
)

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
    if (dir === 'like' && !isLiked(top.id)) toggle(top)
    analytics.descubriSwipe(top, dir)
    deck.swipe(dir)
  }, [deck, isLiked, toggle])

  // Teclado en PC: ← paso, → me gusta, Z deshacer
  useEffect(() => {
    if (deck.status !== 'ready') return
    const onKey = (e) => {
      if (e.target.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') handleSwipe('like')
      else if (e.key === 'ArrowLeft') handleSwipe('skip')
      else if (e.key.toLowerCase() === 'z') deck.undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck.status, handleSwipe, deck])

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
        {/* Encabezado */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
              {t('descubri.title')}
            </h1>
            {deck.status === 'ready' && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                {t('descubri.progress', { seen: deck.seen + 1, total: deck.total })}
              </p>
            )}
          </div>
          <Link
            to="/wishlist"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
            style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
          >
            <IconHeart className="w-3.5 h-3.5" style={{ color: 'var(--hc-danger)' }} />
            {deck.liked.length}
          </Link>
        </div>

        {/* Estado: cargando */}
        {deck.status === 'loading' && (
          <div
            className="rounded-2xl animate-pulse h-[min(58vh,500px)] min-h-[360px]"
            style={{ background: 'var(--hc-surface-2)' }}
            aria-busy="true"
            aria-label={t('descubri.loading')}
          />
        )}

        {/* Estado: error / catálogo vacío */}
        {deck.status === 'error' && (
          <div role="status" className="text-center py-16">
            <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>{t('descubri.error')}</p>
            <button
              onClick={deck.restart}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'var(--hc-accent)' }}
            >
              {t('descubri.retry')}
            </button>
          </div>
        )}

        {/* Mazo */}
        {deck.status === 'ready' && (
          <>
            <div className="relative h-[min(58vh,500px)] min-h-[360px]">
              <AnimatePresence custom={lastDir}>
                {deck.remaining.slice(0, 3).map((p, i) => (
                  <SwipeCard
                    key={p.id}
                    product={p}
                    isTop={i === 0}
                    stackIndex={i}
                    onSwipe={handleSwipe}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Controles */}
            {/* pr en móvil: deja libre la esquina de los botones flotantes (carrito/WhatsApp) */}
            <div className="flex items-center justify-center gap-4 sm:gap-5 mt-5 pr-12 sm:pr-0">
              <button
                onClick={deck.undo}
                disabled={!deck.canUndo}
                aria-label={t('descubri.undo')}
                className="w-11 h-11 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
                style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
              >
                <IconUndo className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => handleSwipe('skip')}
                aria-label={t('descubri.skip')}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90"
                style={{ background: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 14px var(--hc-shadow)' }}
              >
                <IconX className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleSwipe('like')}
                aria-label={t('descubri.like')}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-transform active:scale-90"
                style={{ background: 'var(--hc-danger)', boxShadow: '0 4px 14px var(--hc-shadow)' }}
              >
                <IconHeart className="w-6 h-6" />
              </button>
              <Link
                to={deck.remaining[0] ? `/productos/${deck.remaining[0].id}` : '/productos'}
                aria-label={t('descubri.detail')}
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4.5 h-4.5">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8h.01M11 12h1v4h1" />
                </svg>
              </Link>
            </div>

            <p className="hidden sm:block text-center text-[11px] mt-4" style={{ color: 'var(--hc-muted)' }}>
              {t('descubri.keyboardHint')}
            </p>
          </>
        )}

        {/* Pantalla final */}
        {deck.status === 'done' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            <h2 className="text-lg font-bold mt-6 mb-1" style={{ color: 'var(--hc-text)' }}>
              {deck.liked.length > 0
                ? t('descubri.doneTitle', { count: deck.liked.length })
                : t('descubri.doneEmptyTitle')}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>
              {deck.liked.length > 0 ? t('descubri.doneSub') : t('descubri.doneEmptySub')}
            </p>

            {deck.liked.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-6 text-left">
                {deck.liked.map((p) => (
                  <Link
                    key={p.id}
                    to={`/productos/${p.id}`}
                    className="rounded-xl overflow-hidden"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
                  >
                    <div className="bg-white h-20 flex items-center justify-center p-2">
                      <img src={p.imagenUrl} alt={p.nombre} className="max-h-full max-w-full object-contain" loading="lazy" />
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] leading-tight line-clamp-2" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--hc-accent)' }}>{formatPrice(p.precio)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              {deck.liked.some((p) => p.stock > 0) && (
                <button
                  onClick={handleAddAll}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: 'var(--hc-accent)' }}
                >
                  {t('descubri.addAll')}
                </button>
              )}
              <button
                onClick={deck.restart}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
              >
                {t('descubri.restart')}
              </button>
              <Link to="/productos" className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
                {t('descubri.backToCatalog')}
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </MainLayout>
  )
}
