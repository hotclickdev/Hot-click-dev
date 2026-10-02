import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import IconoFigma from '@/components/comprador/IconoFigma'
import type { EmpresaTiendaPublica } from '@/types/tienda'
import { ICONOS_TIENDA } from './iconosTienda'
import { direccionRetiro, horarioRetiro } from './tiendaHelpers'

const CLASE_FILA = 'flex items-center gap-3 border-t border-[var(--t-border)] px-[14px] py-3 first:border-t-0 lg:px-4 lg:py-[13px]'

function Fila({ icono, titulo, detalle, tituloAlto = false, children }: { icono: string; titulo: string; detalle: string; tituloAlto?: boolean; children?: ReactNode }) {
  return (
    <>
      <IconoFigma src={icono} size={20} className="text-[var(--t-accent)]" />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={`text-[13px] font-semibold leading-[normal] text-hc-n-900 lg:text-sm ${tituloAlto ? "min-h-4" : ""}`}>{titulo}</span>
        <span className="truncate text-xs leading-[normal] text-hc-n-500 lg:overflow-visible lg:whitespace-normal lg:leading-4">{detalle}</span>
      </span>
      {children}
    </>
  )
}

const Chevron = () => <IconoFigma src={ICONOS_TIENDA.comoChevron} size={16} className="text-[var(--hc-n-400)]" />

/**
 * "Cómo comprarle" (Figma `29:1114`, `29:2410`): envío, retiro en tienda (solo si el negocio lo ofrece)
 * y política de cambios. El retiro sale de `empresa.retiro`; el envío y las devoluciones son texto fijo del diseño.
 */
export default function TiendaComoComprarle({ empresa }: { empresa: EmpresaTiendaPublica | null }) {
  const retiro = empresa?.retiro
  const horario = retiro ? horarioRetiro(retiro) : ''
  const direccion = retiro ? direccionRetiro(retiro) : ''
  const zona = retiro?.canton || retiro?.provincia
  const urlMapa = direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : null

  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--t-border)] bg-[var(--t-surface)]">
      <Link to="/envios" className={CLASE_FILA}>
        <Fila
          icono={ICONOS_TIENDA.comoEnvio}
          titulo={`Envío a ${empresa?.zonaEnvio || 'todo Costa Rica'}`}
          detalle="Desde ₡4.000 con Correos de Costa Rica o por encomienda"
        >
          <Chevron />
        </Fila>
      </Link>
      {retiro && (
        urlMapa ? (
          <a href={urlMapa} target="_blank" rel="noopener noreferrer" className={CLASE_FILA}>
            <Fila tituloAlto icono={ICONOS_TIENDA.comoRetiro} titulo={`Retiro en tienda${zona ? ` · ${zona}` : ''}`} detalle={horario || direccion}>
              <Chevron />
            </Fila>
          </a>
        ) : (
          <div className={CLASE_FILA}>
            <Fila tituloAlto icono={ICONOS_TIENDA.comoRetiro} titulo={`Retiro en tienda${zona ? ` · ${zona}` : ''}`} detalle={horario || 'Coordiná con la tienda'} />
          </div>
        )
      )}
      <div className={CLASE_FILA}>
        <Fila icono={ICONOS_TIENDA.comoDevoluciones} titulo="Cambios y devoluciones" detalle="Según la política de HotClick" />
      </div>
    </div>
  )
}
