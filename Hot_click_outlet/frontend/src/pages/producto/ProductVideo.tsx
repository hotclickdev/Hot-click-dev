import { useTranslation } from 'react-i18next'
import { detectVideo } from './productoHelpers'
import type { Producto } from '@/types/producto'

/** Video del producto (YouTube, TikTok o Instagram): no está en Figma; se conserva con los tokens del diseño de compra. */
export default function ProductVideo({ product }: { product: Producto }) {
  const { t } = useTranslation()
  const vid = detectVideo(product.videoUrl)
  if (!vid) return null

  const isTikTok = vid.type === 'tiktok'

  return (
    <section aria-labelledby="video-producto" className="flex max-w-3xl flex-col gap-3 pb-6 pt-3 leading-[normal]">
      <h2 id="video-producto" className="font-display text-[16px] font-bold leading-5 tracking-normal text-hc-n-900 [text-wrap:wrap]">
        {t('product.videoTitle')}
      </h2>
      <div
        className="relative w-full overflow-hidden rounded-[14px] border border-hc-n-200 bg-black"
        style={isTikTok ? { paddingBottom: '177.77%', maxWidth: '340px', margin: '0 auto' } : { paddingBottom: '56.25%' }}
      >
        <iframe
          src={vid.embedUrl}
          title={`Video de ${product.titulo || product.nombre}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 size-full"
        />
      </div>
    </section>
  )
}
