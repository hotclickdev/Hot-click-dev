import {
  useState, useRef, useEffect, useCallback,
  type TouchEvent, type WheelEvent, type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { getOptimizedUrl } from '@/utils/imageUtils'
import { compartirProducto } from './compartirProducto'
import { ICONOS_PRODUCTO } from './iconosProducto'

const SWIPE_MIN_PX = 50
const ZOOM_MAX = 3
const ZOOM_STEP = 1

type ProductGalleryFullscreenProps = {
  open: boolean
  onClose: () => void
  galeria: string[]
  activeImg: number
  onSelectImg: (index: number) => void
  titulo: string
  precioLabel?: string
}

/**
 * Galería a pantalla completa con zoom, fiel a los frames de Figma
 * "Galería a pantalla completa" (55:2167) y "Galería · foto ampliada" (55:2191).
 * Doble click/tap alterna 1x↔2x; con zoom activo se puede arrastrar (mouse o
 * touch) para mover la foto, y la rueda del mouse hace zoom continuo.
 */
export default function ProductGalleryFullscreen({
  open, onClose, galeria, activeImg, onSelectImg, titulo, precioLabel,
}: ProductGalleryFullscreenProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [compartido, setCompartido] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const touchStartX = useRef<number | null>(null)

  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  // Al cambiar de foto el zoom vuelve a 1x (se ajusta durante el render, sin efecto).
  const [imgConZoom, setImgConZoom] = useState(activeImg)
  if (imgConZoom !== activeImg) {
    setImgConZoom(activeImg)
    resetZoom()
  }

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onSelectImg(Math.min(activeImg + 1, galeria.length - 1))
      else if (e.key === 'ArrowLeft') onSelectImg(Math.max(activeImg - 1, 0))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, onSelectImg, activeImg, galeria.length])

  if (!open) return null

  function toggleZoomAt() {
    if (zoom > 1) resetZoom()
    else setZoom(2)
  }

  async function handleShare() {
    const resultado = await compartirProducto(titulo)
    if (resultado !== 'copiado') return
    setCompartido(true)
    setTimeout(() => setCompartido(false), 1800)
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(1, z - Math.sign(e.deltaY) * 0.35)))
  }

  function onMouseDown(e: MouseEvent) {
    if (zoom <= 1) return
    setArrastrando(true)
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragState.current) return
    const { startX, startY, panX, panY } = dragState.current
    setPan({ x: panX + (e.clientX - startX), y: panY + (e.clientY - startY) })
  }
  function onMouseUp() { dragState.current = null; setArrastrando(false) }

  function onTouchStart(e: TouchEvent) {
    if (zoom > 1) {
      const touch = e.touches[0]
      setArrastrando(true)
    dragState.current = { startX: touch.clientX, startY: touch.clientY, panX: pan.x, panY: pan.y }
      return
    }
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  function onTouchMove(e: TouchEvent) {
    if (!dragState.current) return
    const touch = e.touches[0]
    const { startX, startY, panX, panY } = dragState.current
    setPan({ x: panX + (touch.clientX - startX), y: panY + (touch.clientY - startY) })
  }
  function onTouchEnd(e: TouchEvent) {
    if (dragState.current) { dragState.current = null; setArrastrando(false); return }
    const startX = touchStartX.current
    touchStartX.current = null
    if (startX == null || galeria.length <= 1) return
    const endX = e.changedTouches[0]?.clientX
    if (endX == null) return
    const dx = endX - startX
    if (Math.abs(dx) < SWIPE_MIN_PX) return
    if (dx < 0) onSelectImg(Math.min(activeImg + 1, galeria.length - 1))
    else onSelectImg(Math.max(activeImg - 1, 0))
  }

  const contador = `${activeImg + 1} / ${galeria.length}${zoom > 1 ? ` · ${Math.round(zoom * ZOOM_STEP)}×` : ''}`

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('product.galeriaTitulo', { titulo })}
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-hc-n-900 leading-[normal]"
      >
        {/* Barra (Figma 55:2168): cerrar, contador y compartir centrados en y=30 */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 pb-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label={t('product.galeriaCerrar')}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.16] text-hc-n-0"
          >
            <IconoFigma src={ICONOS_PRODUCTO.cerrar} size={20} />
          </button>
          <span className="font-mono text-[13px] font-medium text-hc-n-0">{contador}</span>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label={t('product.share')}
            className="relative flex size-5 shrink-0 items-center justify-center text-hc-n-0 after:absolute after:-inset-3"
          >
            <IconoFigma src={ICONOS_PRODUCTO.compartirClaro} size={20} />
            {compartido && (
              <span className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-md bg-hc-n-0 px-2 py-1 text-[11px] text-hc-n-900">
                {t('product.enlaceCopiado')}
              </span>
            )}
          </button>
        </div>

        {/* Visor (Figma 55:2178): 520 px de alto, a 32 px de la barra */}
        <div
          className="relative mx-auto mt-8 min-h-[240px] max-h-[520px] w-full max-w-3xl flex-1 select-none touch-none overflow-hidden lg:max-h-[68vh]"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={toggleZoomAt}
        >
          <AnimatePresence mode="wait">
            {galeria[activeImg] && (
              <motion.img
                key={activeImg}
                src={getOptimizedUrl(galeria[activeImg], { width: 1200 })}
                alt={t('product.galeriaFoto', { titulo, n: activeImg + 1, total: galeria.length })}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                draggable={false}
                className="absolute inset-0 size-full object-cover"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: arrastrando ? 'none' : 'transform 0.2s ease-out',
                  cursor: zoom > 1 ? 'grab' : 'zoom-in',
                }}
              />
            )}
          </AnimatePresence>
          {/* Pista de gesto (Figma 55:2180 y 55:2204) */}
          <p className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-[6px] whitespace-nowrap rounded-full bg-black/55 px-3 py-[7px] text-[12px] text-hc-n-0">
            <IconoFigma src={ICONOS_PRODUCTO.gestoZoom} size={14} className="text-hc-n-0" />
            {zoom > 1 ? t('product.galeriaPistaMover') : t('product.galeriaPistaAmpliar')}
          </p>
        </div>

        {/* Miniaturas (Figma 55:2185): 64 px, activa con borde blanco de 2 px, el resto al 55 % */}
        {galeria.length > 1 && (
          <div className="scrollbar-hide mx-auto mt-[42px] flex max-w-full shrink-0 gap-[10px] overflow-x-auto px-4">
            {galeria.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectImg(i)}
                aria-label={t('product.verFoto', { n: i + 1 })}
                aria-current={i === activeImg}
                className={`relative size-16 shrink-0 overflow-hidden rounded-[10px] ${
                  i === activeImg ? 'border-2 border-hc-n-0' : 'opacity-55'
                }`}
              >
                <img src={getOptimizedUrl(url, { width: 128 })} alt="" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {(titulo || precioLabel) && (
          <p className="mx-auto mt-[26px] max-w-full shrink-0 truncate px-4 pb-6 text-[14px] font-medium text-hc-n-0">
            {titulo}{precioLabel ? ` · ${precioLabel}` : ''}
          </p>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
