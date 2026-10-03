import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { detectVideo, type VideoDetectado } from './productoHelpers'

/** Triángulo de reproducir (blanco sobre el círculo rojo del CTA de Figma). */
function IconoPlay({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path d="M6 4.2v11.6a.8.8 0 0 0 1.22.68l9.2-5.8a.8.8 0 0 0 0-1.36l-9.2-5.8A.8.8 0 0 0 6 4.2Z" />
    </svg>
  )
}

/** Insignia de la red (chip de 11 px con borde, como las etiquetas de `5:23`); va junto al título para no tapar el embed. */
function InsigniaRed({ video }: { video: VideoDetectado }) {
  return (
    <span className="shrink-0 rounded-full border border-hc-n-200 bg-hc-n-0 px-2 py-[3px] text-[11px] font-semibold leading-[13px] text-hc-n-700">
      {video.etiqueta}
    </span>
  )
}

/** Embed perezoso: YouTube muestra su miniatura y recién al tocar carga el reproductor; el resto usa `loading="lazy"`. */
function EmbedVideo({ video, titulo }: { video: VideoDetectado; titulo: string }) {
  const { t } = useTranslation()
  const [activo, setActivo] = useState(!video.miniatura)
  const proporcion = video.vertical ? 'aspect-[9/16] max-w-[340px]' : 'aspect-video'
  return (
    <div className={`relative mx-auto w-full overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-100 ${proporcion}`}>
      {activo && video.embedUrl ? (
        <iframe
          src={video.embedUrl}
          title={t('product.videoDe', { titulo })}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActivo(true)}
          aria-label={t('product.reproducirVideo', { titulo })}
          className="absolute inset-0 flex items-center justify-center"
        >
          {video.miniatura && <img src={video.miniatura} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
          <span className="relative flex size-14 items-center justify-center rounded-full bg-hc-red-500 pl-[3px] text-hc-n-0 shadow-md">
            <IconoPlay size={22} />
          </span>
        </button>
      )}
    </div>
  )
}

/** Red sin embed ("otra red"): tarjeta de enlace con el mismo borde y radio que el bloque de envío de `28:839`. */
function TarjetaEnlaceVideo({ video }: { video: VideoDetectado }) {
  const { t } = useTranslation()
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-hc-blue-50 pl-[2px] text-hc-blue-600">
        <IconoPlay size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px leading-[normal]">
        <span className="text-[14px] font-semibold text-hc-n-900">{t('product.verVideoEn', { red: video.etiqueta })}</span>
        <span className="text-[12px] text-hc-n-600">{t('product.videoOtraPestana')}</span>
      </span>
      <InsigniaRed video={video} />
    </a>
  )
}

/**
 * "Video del producto" (derivado de Figma `28:839`): mismo título Sora 17, separador y radio 14 que Opiniones.
 * Va entre Opiniones y "También te puede gustar". Sin video no se dibuja nada.
 */
export default function ProductVideo({ videoUrl, titulo }: { videoUrl?: string | null; titulo: string }) {
  const { t } = useTranslation()
  const video = detectVideo(videoUrl)
  if (!video) return null
  return (
    <section aria-labelledby="video-producto" className="flex flex-col gap-[10px] px-4 pb-4 pt-2 leading-[normal] lg:max-w-[644px] lg:px-0 lg:pb-6 lg:pt-4">
      <div aria-hidden="true" className="h-px w-full bg-hc-n-200 lg:hidden" />
      <div className="flex items-center justify-between gap-3">
        <h2 id="video-producto" className="font-display text-[17px] font-bold leading-[21px] tracking-normal text-hc-n-900 lg:text-[22px]">
          {t('product.videoTitle')}
        </h2>
        {video.embedUrl && <InsigniaRed video={video} />}
      </div>
      {video.embedUrl ? <EmbedVideo video={video} titulo={titulo} /> : <TarjetaEnlaceVideo video={video} />}
    </section>
  )
}
