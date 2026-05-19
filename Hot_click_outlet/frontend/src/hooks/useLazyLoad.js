import { useEffect, useRef, useState } from 'react'

/**
 * Defers rendering of heavy components until they scroll into view.
 *
 * Usage:
 *   const [ref, isVisible] = useLazyLoad()
 *   return <div ref={ref}>{isVisible && <HeavySection />}</div>
 *
 * @param {IntersectionObserverInit} options - rootMargin, threshold, etc.
 * @returns {[React.RefObject, boolean]}
 */
export function useLazyLoad(options = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // If IntersectionObserver is not available (very old browsers), show immediately
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '120px',  // Start loading 120px before the element enters viewport
        threshold: 0,
        ...options,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, isVisible]
}

export default useLazyLoad
