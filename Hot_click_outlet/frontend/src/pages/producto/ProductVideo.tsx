import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { detectVideo, segmentoVideo, type SegmentoVideo, type VideoDetectado } from './productoHelpers'

/**
 * Íconos de plataforma de la imagen aprobada (`docs/figma-migration/MANUAL_MARCA_FIGMA/fuente/index.html`,
 * símbolos `yt`, `ig`, `tt`, `ln`, `ext`, `pl`). Trazo 1.6 en `currentColor`, caja 16.
 */
function IconoRed({ red, className }: { red: SegmentoVideo; className?: string }) {
  const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={className}>
      {red === 'youtube' && (<><rect x="1.5" y="3.5" width="13" height="9" rx="2.5" {...trazo} /><path d="M6.8 6.1v3.8L10 8z" fill="currentColor" /></>)}
      {red === 'instagram' && (<><rect x="2" y="2" width="12" height="12" rx="3.5" {...trazo} /><circle cx="8" cy="8" r="2.7" {...trazo} /><circle cx="11.4" cy="4.6" r=".9" fill="currentColor" /></>)}
      {red === 'tiktok' && <path d="M8.6 2v8.4a2.4 2.4 0 1 1-2.4-2.4M8.6 2c.3 1.9 1.6 3.1 3.6 3.3" {...trazo} />}
      {red === 'otra' && <path d="M6.7 9.3a2.6 2.6 0 0 0 3.7 0l2.1-2.1a2.6 2.6 0 0 0-3.7-3.7l-.6.6M9.3 6.7a2.6 2.6 0 0 0-3.7 0L3.5 8.8a2.6 2.6 0 0 0 3.7 3.7l.6-.6" {...trazo} />}
    </svg>
  )
}

function IconoExterno() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[14px]">
      <path d="M6 3.5H4A1.5 1.5 0 0 0 2.5 5v7A1.5 1.5 0 0 0 4 13.5h7a1.5 1.5 0 0 0 1.5-1.5v-2M9 2.5h4.5V7M13.3 2.7 7.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Botón rojo de 60 px con sombra (`.play` de la imagen aprobada). */
function CirculoPlay() {
  return (
    <span className="absolute left-1/2 top-1/2 flex size-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-hc-red-500 shadow-[0_4px_14px_rgba(0,0,0,0.25)]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[30px]">
        <path d="M9 6.8v10.4c0 .6.7 1 1.2.6l8-5.2a.7.7 0 0 0 0-1.2l-8-5.2c-.5-.4-1.2 0-1.2.6z" fill="#fff" />
      </svg>
    </span>
  )
}

const SEGMENTOS: SegmentoVideo[] = ['youtube', 'instagram', 'tiktok', 'otra']

/**
 * Control segmentado de 4 plataformas (`.pl` / `.pchip`): indica de qué red es el video. El visitante no elige,
 * así que es una lista con el segmento activo marcado, no botones.
 */
function ControlPlataforma({ activo }: { activo: SegmentoVideo }) {
  const { t } = useTranslation()
  const nombre: Record<SegmentoVideo, string> = { youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', otra: t('product.otraRed') }
  return (
    <ul aria-label={t('product.plataformaVideo')} className="m-0 grid list-none grid-cols-4 gap-1 rounded-[12px] bg-hc-n-100 p-1">
      {SEGMENTOS.map((s) => {
        const on = s === activo
        return (
          <li
            key={s}
            aria-current={on ? 'true' : undefined}
            className={`flex flex-col items-center gap-1 whitespace-nowrap rounded-[9px] pb-[7px] pt-2 text-[12px] leading-[15px] ${
              on ? 'bg-hc-n-0 font-semibold text-hc-blue-600 shadow-[0_1px_3px_rgba(20,23,28,0.12),0_0_0_1px_var(--hc-blue-100)]' : 'font-medium text-hc-n-600'
            }`}
          >
            <IconoRed red={s} className="size-[18px] shrink-0" />
            {nombre[s]}
          </li>
        )
      })}
    </ul>
  )
}

/** Insignia oscura sobre el reproductor (`.badge`): ícono de la red + nombre. */
function InsigniaRed({ video }: { video: VideoDetectado }) {
  return (
    <span className="pointer-events-none absolute left-[10px] top-[10px] flex items-center gap-[5px] rounded-full bg-black/55 py-1 pl-[7px] pr-[9px] text-[11px] font-semibold leading-[13px] text-hc-n-0">
      <IconoRed red={segmentoVideo(video.type)} className="size-[13px]" />
      {video.etiqueta}
    </span>
  )
}

/**
 * Tarjeta 16:9 con portada, velo y botón de play (`.player`). Carga perezosa: el iframe recién existe al tocar play.
 * Redes verticales (Shorts, Instagram, TikTok, reels de Facebook) pasan a 9:16 al reproducir para que el embed
 * sea usable (derivado de la imagen aprobada). "Otra red" sin embed abre el enlace en otra pestaña.
 */
function Reproductor({ video, titulo, portada }: { video: VideoDetectado; titulo: string; portada?: string | null }) {
  const { t } = useTranslation()
  const [activo, setActivo] = useState(false)
  // La miniatura de YouTube es 4:3 con franjas negras: centrada, el recorte 16:9 las elimina.
  const imagen = video.miniatura ?? portada ?? null
  const caja = 'relative w-full overflow-hidden rounded-[14px] bg-hc-n-100'
  const fondo = (
    <>
      {imagen && <img src={imagen} alt="" loading="lazy" decoding="async" className={`absolute inset-0 size-full object-cover ${video.miniatura ? 'object-center' : '[object-position:50%_58%]'}`} />}
      <span aria-hidden="true" className="absolute inset-0 bg-[rgba(20,23,28,0.22)]" />
      <CirculoPlay />
      <InsigniaRed video={video} />
    </>
  )

  if (!video.embedUrl) {
    return (
      <a href={video.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={t('product.verEn', { red: video.etiqueta })} className={`${caja} block aspect-video`}>
        {fondo}
      </a>
    )
  }
  if (activo) {
    return (
      <div className={`${caja} ${video.vertical ? 'mx-auto aspect-[9/16] max-w-[340px]' : 'aspect-video'}`}>
        <iframe
          src={video.embedUrl}
          title={t('product.videoDe', { titulo })}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    )
  }
  return (
    <button type="button" onClick={() => setActivo(true)} aria-label={t('product.reproducirVideo', { titulo })} className={`${caja} block aspect-video`}>
      {fondo}
    </button>
  )
}

type ProductVideoProps = {
  videoUrl?: string | null
  titulo: string
  /** Nombre de la tienda para "Publicado por …". */
  tienda?: string | null
  /** Foto principal del producto: portada cuando la red no da miniatura (Instagram, TikTok, otra red). */
  portada?: string | null
}

/**
 * "Video del producto" tal como la imagen aprobada `docs/figma-migration/MANUAL_MARCA_FIGMA/ficha-video.png`
 * (2-oct-2026): separador, título Sora 17 con "Publicado por", control segmentado de plataforma, tarjeta 16:9 con
 * play e insignia, y enlace "Ver en …". Va entre Opiniones y "También te puede gustar"; sin video no se dibuja.
 */
export default function ProductVideo({ videoUrl, titulo, tienda, portada }: ProductVideoProps) {
  const { t } = useTranslation()
  const video = detectVideo(videoUrl)
  if (!video) return null
  return (
    <section aria-labelledby="video-producto" className="flex flex-col gap-3 px-4 pb-4 pt-2 leading-[normal] lg:max-w-[644px] lg:px-0 lg:pb-6 lg:pt-4">
      <div aria-hidden="true" className="h-px w-full bg-hc-n-200 lg:hidden" />
      <div className="flex flex-col gap-[2px]">
        <h2 id="video-producto" className="font-display text-[17px] font-bold leading-[normal] tracking-normal text-hc-n-900">
          {t('product.videoTitle')}
        </h2>
        {tienda && <p className="text-[12px] text-hc-n-500">{t('product.publicadoPor', { tienda })}</p>}
      </div>
      <ControlPlataforma activo={segmentoVideo(video.type)} />
      <Reproductor video={video} titulo={titulo} portada={portada} />
      <div className="flex items-center justify-between gap-3">
        <a href={video.url} target="_blank" rel="noopener noreferrer nofollow" className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-hc-blue-600">
          <span className="truncate">{t('product.verEn', { red: video.etiqueta })}</span>
          <IconoExterno />
        </a>
        <span className="shrink-0 text-[12px] text-hc-n-500">{video.embedUrl ? t('product.seReproduceAqui') : t('product.videoOtraPestana')}</span>
      </div>
    </section>
  )
}
