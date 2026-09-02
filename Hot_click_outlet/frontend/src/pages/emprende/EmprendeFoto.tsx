import { useState } from 'react'

type Props = {
  src: string
  fallback: string
  alt: string
  className?: string
}

/** Imagen local con respaldo de Unsplash si el archivo no carga. */
export default function EmprendeFoto({ src, fallback, alt, className = '' }: Props) {
  const [actual, setActual] = useState(src)
  return (
    <img
      src={actual}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => { if (actual !== fallback) setActual(fallback) }}
    />
  )
}
