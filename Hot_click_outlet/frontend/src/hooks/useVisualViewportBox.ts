import { useEffect, useState } from 'react'

export type VisualViewportBox = {
  offsetTop: number
  height: number
}

function leerViewport(): VisualViewportBox {
  const vv = globalThis.visualViewport
  if (vv) {
    return { offsetTop: vv.offsetTop, height: vv.height }
  }
  return { offsetTop: 0, height: globalThis.innerHeight }
}

/**
 * Ancla un overlay fixed al área visible del teclado móvil.
 * Mientras `activo`, bloquea scroll de documento y cancela el pan de iOS.
 */
export function useVisualViewportBox(activo: boolean): VisualViewportBox {
  const [box, setBox] = useState<VisualViewportBox>(() =>
    typeof globalThis.window === 'undefined'
      ? { offsetTop: 0, height: 800 }
      : leerViewport(),
  )

  useEffect(() => {
    if (!activo) return

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    const sync = () => {
      setBox(leerViewport())
      globalThis.scrollTo(0, 0)
    }

    sync()

    const vv = globalThis.visualViewport
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    globalThis.addEventListener('resize', sync)

    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      globalThis.removeEventListener('resize', sync)
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [activo])

  return box
}
