import { useEffect, useState } from 'react'

const CONSULTA_DESKTOP = '(min-width: 1024px)'

/** `true` desde el breakpoint `lg` de Tailwind: los frames de escritorio de Figma (1440). */
export function useEsDesktop(): boolean {
  const [esDesktop, setEsDesktop] = useState(() => globalThis.matchMedia?.(CONSULTA_DESKTOP).matches ?? false)
  useEffect(() => {
    const lista = globalThis.matchMedia?.(CONSULTA_DESKTOP)
    if (!lista) return undefined
    const alCambiar = () => setEsDesktop(lista.matches)
    lista.addEventListener('change', alCambiar)
    return () => lista.removeEventListener('change', alCambiar)
  }, [])
  return esDesktop
}
