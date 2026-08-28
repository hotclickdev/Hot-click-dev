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

  if (!src || errored) return null

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
