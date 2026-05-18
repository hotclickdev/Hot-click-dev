import { useEffect, useRef } from 'react'

export function useScrollReveal({ threshold = 0.12, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (document.documentElement.classList.contains('reduce-motion')) {
      el.classList.add('hc-revealed')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('hc-revealed')
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return ref
}
