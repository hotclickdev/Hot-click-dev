import { useEffect, useRef, useState } from 'react'

/**
 * Defers rendering of heavy components until they scroll into view.
 *
 * Usage:
 *   const [ref, isVisible] = useLazyLoad()
 *   return <div ref={ref}>{isVisible && <HeavySection />}</div>
 */
export function useLazyLoad(options: IntersectionObserverInit = {}) {
  const ref = useRef<Element | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

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
        rootMargin: '120px',
        threshold: 0,
        ...options,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, isVisible] as const
}

export default useLazyLoad
