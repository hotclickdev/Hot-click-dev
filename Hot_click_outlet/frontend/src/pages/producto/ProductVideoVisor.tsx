import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_PRODUCTO } from './iconosProducto'
import { detectVideo } from './productoHelpers'

/** Triángulo de "reproducir" (12 px), del mismo trazo que la pista de gesto del visor `55:2180`. */
function IconoPlay() {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M3 1.8v8.4a.6.6 0 0 0 .92.5l6.6-4.2a.6.6 0 0 0 0-1L3.92 1.3A.6.6 0 0 0 3 1.8Z" />
    </svg>
  )
}

/**
 * Botón "Ver video" sobre la foto principal (derivado de Figma: pastilla de la pista de gesto `55:2180`).
 * El video ya no es una sección suelta debajo de la ficha.
 */
export function BotonVideoProducto({ videoUrl, onClick, className = '' }: { videoUrl?: string | null; onClick: () => void; className?: string }) {
  const { t } = useTranslation()
  if (!detectVideo(videoUrl)) return null
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute z-[1] flex items-center gap-[6px] whitespace-nowrap rounded-full bg-black/55 px-3 py-[7px] text-[12px] font-medium leading-[normal] text-hc-n-0 ${className}`}
    >
      <IconoPlay />
      {t('product.verVideo')}
    </button>
  )
}

type VisorProps = { open: boolean; onClose: () => void; videoUrl?: string | null; titulo: string; precioLabel?: string }

/**
 * Visor del video del producto, derivado de Figma `55:2167` (barra con cerrar, visor central y
 * "nombre · precio" debajo, sobre n/900).
 */
export default function ProductVideoVisor({ open, onClose, videoUrl, titulo, precioLabel }: VisorProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDivElement>(null)
  const vid = detectVideo(videoUrl)

  useEffect(() => {
    if (!open) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    globalThis.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previo
      globalThis.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || !vid) return null
  const vertical = vid.type === 'tiktok'

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('product.videoTitle')}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-hc-n-900 leading-[normal]"
    >
      <div className="flex h-14 shrink-0 items-center justify-between px-4 pb-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('product.galeriaCerrar')}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.16] text-hc-n-0"
        >
          <IconoFigma src={ICONOS_PRODUCTO.cerrar} size={20} />
        </button>
        <span className="font-mono text-[13px] font-medium text-hc-n-0">{t('product.videoTitle')}</span>
        <span className="size-5" aria-hidden="true" />
      </div>
      <div className="mx-auto mt-8 flex w-full max-w-3xl flex-1 items-start justify-center">
        <div
          className="relative w-full overflow-hidden bg-black"
          style={vertical ? { paddingBottom: '177.77%', maxWidth: '340px' } : { paddingBottom: '56.25%' }}
        >
          <iframe
            src={vid.embedUrl}
            title={t('product.videoDe', { titulo })}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        </div>
      </div>
      <p className="px-4 pb-10 pt-6 text-center text-[14px] font-medium text-hc-n-0">
        {precioLabel ? `${titulo} · ${precioLabel}` : titulo}
      </p>
    </div>,
    document.body,
  )
}
