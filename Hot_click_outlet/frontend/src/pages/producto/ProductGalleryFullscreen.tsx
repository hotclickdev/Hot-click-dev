import {
  useState, useRef, useEffect, useCallback,
  type TouchEvent, type WheelEvent, type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import CloseIcon from '@/components/ui/CloseIcon'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { getOptimizedUrl } from '@/utils/imageUtils'

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
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open)

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [compartido, setCompartido] = useState(false)
  const dragState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const touchStartX = useRef<number | null>(null)

  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }) }, [])

  useEffect(() => { resetZoom() }, [activeImg, resetZoom])

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
    const url = window.location.href
    const shareData = { title: titulo, url }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
        return
      }
    } catch {
      // el usuario canceló el share nativo — sin acción
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCompartido(true)
      setTimeout(() => setCompartido(false), 1800)
    } catch {
      // sin acceso al portapapeles — no hay fallback disponible
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(1, z - Math.sign(e.deltaY) * 0.35)))
  }

  function onMouseDown(e: MouseEvent) {
    if (zoom <= 1) return
    dragState.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragState.current) return
    const { startX, startY, panX, panY } = dragState.current
    setPan({ x: panX + (e.clientX - startX), y: panY + (e.clientY - startY) })
  }
  function onMouseUp() { dragState.current = null }

  function onTouchStart(e: TouchEvent) {
    if (zoom > 1) {
      const t = e.touches[0]
      dragState.current = { startX: t.clientX, startY: t.clientY, panX: pan.x, panY: pan.y }
      return
    }
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  function onTouchMove(e: TouchEvent) {
    if (!dragState.current) return
    const t = e.touches[0]
    const { startX, startY, panX, panY } = dragState.current
    setPan({ x: panX + (t.clientX - startX), y: panY + (t.clientY - startY) })
  }
  function onTouchEnd(e: TouchEvent) {
    if (dragState.current) { dragState.current = null; return }
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
        aria-label={`Galería de fotos: ${titulo}`}
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[100] flex flex-col"
        style={{ background: '#0a0a0c' }}
      >
        {/* Barra superior */}
        <div className="flex items-center justify-between px-2 h-14 shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar galería"
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/90 hover:bg-white/10"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-white/90 tabular-nums">{contador}</span>
          <button
            type="button"
            onClick={handleShare}
            aria-label="Compartir foto"
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-white/90 hover:bg-white/10"
          >
            <ShareSVG />
            {compartido && (
              <span className="absolute top-full right-0 mt-1 whitespace-nowrap text-[11px] bg-white text-black rounded-md px-2 py-1">
                Link copiado
              </span>
            )}
          </button>
        </div>

        {/* Visor */}
        <div
          className="flex-1 min-h-0 overflow-hidden flex items-center justify-center select-none touch-none"
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
                alt={`${titulo} — foto ${activeImg + 1} de ${galeria.length}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                draggable={false}
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: dragState.current ? 'none' : 'transform 0.2s ease-out',
                  cursor: zoom > 1 ? 'grab' : 'zoom-in',
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Pista de gesto */}
        <p className="text-center text-xs text-white/60 pb-3">
          {zoom > 1
            ? 'Arrastrá para mover · doble toque para volver'
            : 'Pellizcá o tocá dos veces para ampliar'}
        </p>

        {/* Miniaturas */}
        {galeria.length > 1 && (
          <div className="flex gap-2 justify-center overflow-x-auto px-4 pb-4 scrollbar-hide">
            {galeria.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectImg(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === activeImg}
                className="shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-opacity"
                style={{ borderColor: i === activeImg ? '#fff' : 'transparent', opacity: i === activeImg ? 1 : 0.5 }}
              >
                <img
                  src={getOptimizedUrl(url, { width: 64 })}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {(titulo || precioLabel) && (
          <p className="text-center text-sm text-white/85 pb-4 px-4 truncate">
            {titulo}{precioLabel ? ` · ${precioLabel}` : ''}
          </p>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

function ShareSVG() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5" />
    </svg>
  )
}
