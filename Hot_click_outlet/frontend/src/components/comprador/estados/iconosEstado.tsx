import type { ReactNode } from 'react'

function Trazo({ children, size = 28 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export const IconoCorazon = () => (
  <Trazo><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></Trazo>
)
export const IconoPaquete = () => (
  <Trazo><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></Trazo>
)
export const IconoBuscarNada = () => (
  <Trazo><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M9 9l4 4M13 9l-4 4" /></Trazo>
)
export const IconoSinConexion = () => (
  <Trazo><path d="M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8a15 15 0 0 0-10-3.8M5 12.5a10 10 0 0 1 3-1.8M19 12.5a10 10 0 0 0-2.6-1.6M8.5 16a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" /></Trazo>
)
