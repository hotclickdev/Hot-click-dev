import { useState } from 'react'

/** Thumbnail inline: muestra la imagen si la URL carga; se oculta silenciosamente en error */
export default function ImgPreview({ url }: { url?: string | null }) {
  const [ok, setOk] = useState(true)
  if (!url || !ok) return null
  return (
    <img
      src={url}
      alt=""
      onError={() => setOk(false)}
      className="w-10 h-10 rounded-lg object-cover shrink-0"
      style={{ border: '1px solid var(--hc-border)' }}
    />
  )
}
