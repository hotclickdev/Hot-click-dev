import { useState, type CSSProperties, type ImgHTMLAttributes, type SyntheticEvent } from 'react'
import { getOptimizedUrl } from '@/utils/imageUtils'

export type OptimizedImageProps = {
  src?: string | null
  alt?: string
  width?: number
  height?: number
  className?: string
  style?: CSSProperties
  priority?: boolean
  quality?: number
  onLoad?: () => void
  onError?: ImgHTMLAttributes<HTMLImageElement>['onError']
}

/**
 * Drop-in <img> replacement with shimmer skeleton + fade-in.
 *
 * The PARENT element must have `position: relative` and `overflow: hidden`
 * for the skeleton overlay to fill correctly.
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  style,
  priority = false,
  quality = 80,
  onLoad,
  onError: onErrorProp,
}: OptimizedImageProps) {
  const [loaded,  setLoaded]  = useState(false)
  const [errored, setErrored] = useState(false)

  const optimizedSrc = getOptimizedUrl(src, { width, height, quality })

  if (!src || errored) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center ${className}`}
        style={{
          background: 'var(--hc-surface-2, #f1f5f9)',
          color: 'var(--hc-muted, #94a3b8)',
          ...style,
        }}
        role="img"
        aria-label={alt || 'Imagen no disponible'}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
          <path d="M4 16l4.5-4.5L12 15l3-3 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }

  return (
    <>
      {!loaded && (
        <div
          className="absolute inset-0 hc-skeleton"
          style={{ borderRadius: 0 }}
          aria-hidden="true"
        />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={`transition-opacity duration-500 ease-in ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        style={style}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={() => { setLoaded(true); onLoad?.() }}
        onError={(e: SyntheticEvent<HTMLImageElement>) => { setErrored(true); onErrorProp?.(e) }}
      />
    </>
  )
}

export default OptimizedImage
