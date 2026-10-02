import { useEsDesktop } from '@/pages/checkout/useEsDesktop'

const CLASE = 'leading-[normal] font-display text-[22px] font-bold tracking-[-0.02em] text-hc-n-900 [text-wrap:balance]'

/**
 * Título de 22 px de una vista de Servicios HOT.
 * En móvil la barra interna ya es el h1: aquí queda un párrafo con el mismo aspecto.
 * En escritorio la barra no se dibuja y este texto es el h1.
 */
export default function TituloVista({ children }: { children: string }) {
  const esDesktop = useEsDesktop()
  const Tag = esDesktop ? 'h1' : 'p'
  return <Tag className={CLASE}>{children}</Tag>
}
