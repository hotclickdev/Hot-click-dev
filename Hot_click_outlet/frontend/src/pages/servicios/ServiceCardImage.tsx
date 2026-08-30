import { useState } from 'react'
import { CARD_IMAGES, type TipoImagenServicio } from './serviciosHelpers'

export default function ServiceCardImage({ type, className }: { type: TipoImagenServicio; className?: string }) {
  const cfg = CARD_IMAGES[type]
  const [src, setSrc] = useState(cfg.local)
  return (
    <img
      src={src}
      alt={cfg.alt}
      className={className}
      onError={() => { if (src !== cfg.fallback) setSrc(cfg.fallback) }}
    />
  )
}
