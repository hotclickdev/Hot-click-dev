import { useState, useEffect, useRef } from 'react'
import type { Producto } from '@/types/producto'

const BUYERS = [
  { nombre: 'María',   ciudad: 'San José' },
  { nombre: 'Carlos',  ciudad: 'Alajuela' },
  { nombre: 'Ana',     ciudad: 'Heredia' },
  { nombre: 'José',    ciudad: 'Cartago' },
  { nombre: 'Laura',   ciudad: 'Puntarenas' },
  { nombre: 'Pedro',   ciudad: 'Guanacaste' },
  { nombre: 'Valeria', ciudad: 'Limón' },
  { nombre: 'Andrés',  ciudad: 'San José' },
] as const

const ACTIONS = [
  { key: 'bought' as const, icono: 'bolsa' },
  { key: 'added' as const, icono: 'paquete' },
  { key: 'viewed' as const, icono: 'buscar' },
] as const

/** Entero uniforme [0, maxExclusive) — UI demo, no crypto de auth. */
function enteroAleatorio(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! % maxExclusive
}

function pick<T>(arr: readonly T[]): T {
  return arr[enteroAleatorio(arr.length)] as T
}

function rand(min: number, max: number) {
  return min + enteroAleatorio(Math.floor((max - min) * 1000) + 1) / 1000
}

export type SocialProofAction = (typeof ACTIONS)[number]

export type SocialProofNotification = {
  id: number
  buyer: (typeof BUYERS)[number]
  action: SocialProofAction
  product: Producto
}

/**
 * Drives the social-proof notification rotation.
 */
export function useSocialProof(products: Producto[]) {
  const [notification, setNotification] = useState<SocialProofNotification | null>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const productsRef = useRef(products)

  useEffect(() => {
    productsRef.current = products
  }, [products])

  useEffect(() => {
    if (!products.length) return

    function showNext() {
      const ps = productsRef.current
      if (!ps.length) return
      setNotification({ id: Date.now(), buyer: pick(BUYERS), action: pick(ACTIONS), product: pick(ps) })
      timerRef.current = setTimeout(showNext, rand(15_000, 30_000))
    }

    timerRef.current = setTimeout(showNext, rand(8_000, 15_000))
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [products.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  return notification
}

export default useSocialProof
