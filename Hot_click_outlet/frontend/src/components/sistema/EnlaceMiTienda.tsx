import CopiarLinkTienda from '@/components/sistema/CopiarLinkTienda'
import { useTiendaPublica } from '@/hooks/useTiendaPublica'
import { estadoEnlaceTienda } from './enlaceMiTiendaHelpers'

/**
 * S1-20: la dirección completa de la tienda (hotclick.lat/tienda/<slug>) con «Copiar», en el inicio del
 * panel. Si la tienda está pendiente, se ve la dirección con el aviso de que todavía no es pública.
 * Tarjeta con los tokens del panel (borde `hc-border`, superficie `hc-surface`).
 */
export default function EnlaceMiTienda({ className = '' }: { className?: string }) {
  const { slug, tiendaPublica, estadoEmpresa } = useTiendaPublica()
  const estado = estadoEnlaceTienda(slug, tiendaPublica, estadoEmpresa)
  if (estado.tipo === 'ninguno') return null
  return (
    <section aria-label="Enlace de tu tienda" className={`flex w-full flex-col gap-2 rounded-[14px] border border-hc-border bg-hc-surface p-4 text-left ${className}`}>
      <p className="text-[12px] font-bold uppercase text-hc-muted">Tu tienda</p>
      <p className="break-all font-mono text-[13px] text-hc-text">{estado.url}</p>
      {estado.tipo === 'publica'
        ? <CopiarLinkTienda ruta={estado.ruta} />
        : <p role="status" className="text-[12px] text-hc-muted">{estado.aviso}</p>}
    </section>
  )
}
