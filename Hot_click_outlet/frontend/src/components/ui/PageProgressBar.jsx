import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Barra de progreso delgada en el tope de la pantalla.
 * Se activa en cada cambio de ruta: progresa de 0 â†’ 85 % durante la
 * transición y salta a 100 % antes de desaparecer con fade-out.
 */
export default function PageProgressBar() {
  const { pathname } = useLocation()
  const [pct, setPct]       = useState(0)
  const [phase, setPhase]   = useState('idle') // idle | running | done | out
  const timers = useRef([])

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = [] }

  useEffect(() => {
    clearTimers()
    setPct(0)
    setPhase('running')

    timers.current = [
      setTimeout(() => setPct(25),  10),
      setTimeout(() => setPct(55),  250),
      setTimeout(() => setPct(75),  550),
      setTimeout(() => setPct(90),  1000),
      // Completa y hace fade-out
      setTimeout(() => { setPct(100); setPhase('done') },  1400),
      setTimeout(() => setPhase('out'),  1750),
      setTimeout(() => { setPhase('idle'); setPct(0) }, 2000),
    ]

    return clearTimers
  }, [pathname])

  if (phase === 'idle') return null

  const easing = pct === 100
    ? 'width 0.25s ease'
    : 'width 0.45s cubic-bezier(0.1, 0.6, 0.25, 1)'

  return (
    <div
      aria-hidden
      style={{
        position:   'fixed',
        top: 0, left: 0,
        height:     3,
        width:      `${pct}%`,
        zIndex:     9999,
        background: 'var(--hc-primary)',
        boxShadow:  '0 0 10px color-mix(in srgb, var(--hc-primary) 45%, transparent)',
        transition: easing,
        opacity:    phase === 'out' ? 0 : 1,
        pointerEvents: 'none',
        borderRadius: '0 2px 2px 0',
      }}
    />
  )
}
