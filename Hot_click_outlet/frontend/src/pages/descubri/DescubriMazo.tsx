import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_DESCUBRI } from './iconosDescubri'
import DescubriCarta from './DescubriCarta'
import type { Producto } from '@/types/producto'

type DescubriMazoProps = {
  productos: Producto[]
  indice: number
  /** Elecciones con las que se arma la selección (se muestra en el pie). */
  eleccionesParaSeleccion: number
  onLike: (producto: Producto) => void
  onSkip: (producto: Producto) => void
  onInfo: (producto: Producto) => void
  onDeshacer: () => void
  puedeDeshacer: boolean
}

const BOTON_ACCION = 'flex shrink-0 items-center justify-center rounded-full shadow-[0px_4px_10px_0px_rgba(0,0,0,0.08)] transition-transform active:scale-95'

/**
 * Mazo de Descubrí (Figma `27:946` y pie `27:965`): pista, cartas apiladas, acciones saltar / ver / me gusta
 * y "Deshacer la última". Teclado: ← saltar, → me gusta.
 */
export default function DescubriMazo({
  productos,
  indice,
  eleccionesParaSeleccion,
  onLike,
  onSkip,
  onInfo,
  onDeshacer,
  puedeDeshacer,
}: DescubriMazoProps) {
  const { t } = useTranslation()
  const actual = productos[indice]
  const visibles = productos.slice(indice, indice + 3)

  const handleLike = useCallback(() => { if (actual) onLike(actual) }, [actual, onLike])
  const handleSkip = useCallback(() => { if (actual) onSkip(actual) }, [actual, onSkip])

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

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center">
      <p className="pt-3 text-center text-[13px] leading-[normal] text-hc-n-600">{t('descubri.swipeRightHint')}</p>

      <div className="relative mt-[57px] h-[460px] w-[310px]" role="region" aria-label={t('descubri.deckLabel')} data-testid="descubri-mazo">
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

      <div className="relative left-3 z-20 mt-6 flex items-center gap-6">
        <button
          type="button"
          aria-label={t('descubri.skip')}
          onClick={handleSkip}
          data-testid="descubri-skip"
          className={`${BOTON_ACCION} size-[60px] border border-hc-n-200 bg-hc-n-0 text-hc-n-600`}
        >
          <IconoFigma src={ICONOS_DESCUBRI.saltar25} size={25.2} />
        </button>
        <button
          type="button"
          aria-label={t('descubri.viewProduct')}
          onClick={() => onInfo(actual)}
          data-testid="descubri-info"
          className={`${BOTON_ACCION} size-11 border border-hc-n-200 bg-hc-n-0 text-hc-blue-600`}
        >
          <IconoFigma src={ICONOS_DESCUBRI.info18} size={18.48} />
        </button>
        <button
          type="button"
          aria-label={t('descubri.like')}
          onClick={handleLike}
          data-testid="descubri-like"
          className={`${BOTON_ACCION} size-[60px] bg-hc-red-500 text-hc-n-0`}
        >
          <IconoFigma src={ICONOS_DESCUBRI.meGusta25} size={25.2} />
        </button>
      </div>

      <div className="-mt-0.5 flex flex-col items-center gap-[6px] px-4 pb-5 leading-[normal]">
        <p className="text-[12px] text-hc-n-600">{t('descubri.selectionHint', { total: eleccionesParaSeleccion })}</p>
        <button
          type="button"
          onClick={onDeshacer}
          disabled={!puedeDeshacer}
          className="flex items-center justify-center gap-[6px] text-[13px] font-semibold text-hc-blue-600 disabled:opacity-40"
        >
          <IconoFigma src={ICONOS_DESCUBRI.deshacer14} size={14} />
          {t('descubri.undo')}
        </button>
      </div>
      <p className="sr-only">{t('descubri.remaining', { count: restantes })}</p>
    </div>
  )
}
