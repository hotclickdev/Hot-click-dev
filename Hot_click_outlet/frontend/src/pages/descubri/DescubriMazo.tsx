import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import DescubriCarta from './DescubriCarta'
import type { Producto } from '@/types/producto'

type DescubriMazoProps = {
  productos: Producto[]
  indice: number
  likes: number
  onLike: (producto: Producto) => void
  onSkip: (producto: Producto) => void
}

function IconSkip() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconLike() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

/**
 * Mazo swipe: carta activa + 2 debajo; botones y teclado (← skip, → like).
 */
export default function DescubriMazo({
  productos,
  indice,
  likes,
  onLike,
  onSkip,
}: DescubriMazoProps) {
  const { t } = useTranslation()
  const actual = productos[indice]
  const visibles = productos.slice(indice, indice + 3)

  const handleLike = useCallback(() => {
    if (!actual) return
    onLike(actual)
  }, [actual, onLike])

  const handleSkip = useCallback(() => {
    if (!actual) return
    onSkip(actual)
  }, [actual, onSkip])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleLike()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleSkip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleLike, handleSkip])

  if (!actual) return null

  const restantes = Math.max(0, productos.length - indice)
  const progressLabel = t('descubri.deckProgress', {
    current: indice + 1,
    total: productos.length,
  })

  return (
    <div className="max-w-md mx-auto flex flex-col items-center">
      <div className="w-full flex items-center justify-between gap-3 mb-2 px-1">
        <p className="font-mono text-[12px] font-medium text-hc-n-500" aria-live="polite">
          {progressLabel}
        </p>
        <p className="text-[12px] font-semibold text-hc-red-500">
          {t('descubri.likesCount', { count: likes })}
        </p>
      </div>
      <p className="relative z-10 mb-4 text-center text-[13px] text-hc-n-500">{t('descubri.swipeRightHint')}</p>

      <div
        className="relative w-full h-[min(68vh,480px)] mb-6"
        role="region"
        aria-label={t('descubri.deckLabel')}
        data-testid="descubri-mazo"
      >
        {[...visibles].reverse().map((p, i, arr) => (
          <DescubriCarta
            key={String(p.id)}
            producto={p}
            activo={i === arr.length - 1}
            stackIndex={arr.length - 1 - i}
            onLike={handleLike}
            onSkip={handleSkip}
          />
        ))}
      </div>

      <div className="flex items-center gap-8 mb-3">
        <button
          type="button"
          aria-label={t('descubri.skip')}
          onClick={handleSkip}
          data-testid="descubri-skip"
          className="flex size-[60px] items-center justify-center rounded-full border border-hc-n-200 bg-hc-n-0 text-hc-n-600 shadow-[0_4px_10px_rgba(0,0,0,0.08)] transition-transform active:scale-95"
        >
          <IconSkip />
        </button>
        <button
          type="button"
          aria-label={t('descubri.like')}
          onClick={handleLike}
          data-testid="descubri-like"
          className="flex size-[60px] items-center justify-center rounded-full bg-hc-red-500 text-hc-n-0 shadow-[0_4px_10px_rgba(0,0,0,0.08)] transition-transform active:scale-95"
        >
          <IconLike />
        </button>
      </div>

      <p className="text-center text-[12px] text-hc-n-500">{t('descubri.selectionHint', { total: productos.length })}</p>
      <p className="mt-1 text-center text-[11px] text-hc-n-500">{t('descubri.deckHint')}</p>
      <p className="sr-only">{t('descubri.remaining', { count: restantes })}</p>
    </div>
  )
}
