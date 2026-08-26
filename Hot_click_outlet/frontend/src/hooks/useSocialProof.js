import { useState, useEffect, useRef } from 'react'

const BUYERS = [
  { nombre: 'María',   ciudad: 'San José' },
  { nombre: 'Carlos',  ciudad: 'Alajuela' },
  { nombre: 'Ana',     ciudad: 'Heredia' },
  { nombre: 'José',    ciudad: 'Cartago' },
  { nombre: 'Laura',   ciudad: 'Puntarenas' },
  { nombre: 'Pedro',   ciudad: 'Guanacaste' },
  { nombre: 'Valeria', ciudad: 'Limón' },
  { nombre: 'Andrés',  ciudad: 'San José' },
]

const ACTIONS = [
  { text: 'compró',            icono: 'bolsa' },
  { text: 'agregó al pedido', icono: 'paquete' },
  { text: 'acaba de ver',      icono: 'buscar' },
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)] // NOSONAR — solo para animaciones de UI
}

function rand(min, max) {
  return min + Math.random() * (max - min) // NOSONAR — solo para delays de animación
}

/**
 * Drives the social-proof notification rotation.
 *
 * @param {object[]} products  Normalized product list (imagenUrl + stock > 0 already filtered)
 * @returns {object|null}      Latest notification, or null before the first fires
 */
export function useSocialProof(products) {
  const [notification, setNotification] = useState(null)
  const timerRef    = useRef(null)
  const productsRef = useRef(products)

  // Keep ref current without restarting the timer loop
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

    // Initial delay: 8 – 15 s so the first notification doesn't fire immediately on page load
    timerRef.current = setTimeout(showNext, rand(8_000, 15_000))
    return () => clearTimeout(timerRef.current)
  }, [products.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  return notification
}

export default useSocialProof
