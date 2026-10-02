import type { ReactNode } from 'react'
import IconoFigma from '@/components/comprador/IconoFigma'
import type { EmpresaTiendaPublica } from '@/types/tienda'
import { ICONOS_TIENDA } from './iconosTienda'
import { inicialesNegocio, mesAnioCorto, urlInstagram } from './tiendaHelpers'
import { useCompartirTienda } from './useCompartirTienda'

const CLASE_ACCION = 'flex flex-1 items-center justify-center gap-[6px] rounded-[11px] px-3 py-[11px] text-[13px] font-semibold leading-[normal] lg:flex-none lg:gap-2 lg:rounded-xl lg:px-4 lg:text-sm'
const CLASE_ACCION_SECUNDARIA = `${CLASE_ACCION} border border-[var(--t-border)] bg-[var(--t-surface)] text-hc-n-900`

function Dato({ icono, children }: { icono: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-[5px] text-xs leading-[normal] text-hc-n-600 lg:text-[13px]">
      <IconoFigma src={icono} size={14} className="lg:!size-[15px]" />
      {children}
    </span>
  )
}

function Logo({ nombre, logoUrl }: { nombre: string; logoUrl?: string | null }) {
  const base = 'absolute left-0 top-[-34px] flex size-[76px] items-center justify-center overflow-hidden rounded-[21.28px] border-[3px] border-[var(--t-surface)] lg:top-[-50px] lg:size-[120px] lg:rounded-[32px] lg:border-4'
  if (logoUrl) {
    return (
      <div className={`${base} bg-[var(--t-surface)] ring-1 ring-[var(--t-border)]`}>
        <img src={logoUrl} alt={`Logo de ${nombre}`} className="size-full object-contain p-2" />
      </div>
    )
  }
  return (
    <div className={base} style={{ backgroundColor: 'var(--t-secondary)' }} role="img" aria-label={`Logo de ${nombre}`}>
      <span className="font-display text-[27.36px] font-extrabold leading-[normal] text-white lg:text-[42px]">
        {inicialesNegocio(nombre)}
      </span>
    </div>
  )
}

/**
 * Encabezado del negocio (Figma `29:934` móvil, `29:2357` escritorio): logo flotante sobre la portada,
 * nombre, descripción corta, datos, sello de factura electrónica y acciones.
 */
export default function TiendaEncabezadoNegocio({ empresa, nombre }: { empresa: EmpresaTiendaPublica | null; nombre: string }) {
  const compartir = useCompartirTienda(nombre)
  const whatsapp = (empresa?.whatsapp ?? '').replace(/\D/g, '')
  const desde = mesAnioCorto(empresa?.enHotclickDesde)
  const instagram = empresa?.instagram
  const textoWhatsapp = encodeURIComponent(`Hola, escribo desde la tienda ${nombre} en HotClick.`)

  return (
    <section className="bg-[var(--t-surface)] lg:border-b lg:border-[var(--t-border)]">
      <div className="mx-auto flex max-w-[1232px] flex-col gap-[10px] px-4 pb-[18px] lg:flex-row lg:items-end lg:gap-6 lg:pb-6">
        <div className="relative h-11 w-full lg:h-[70px] lg:w-[120px] lg:shrink-0">
          <Logo nombre={nombre} logoUrl={empresa?.logoUrl} />
        </div>

        <div className="flex min-w-0 flex-col gap-[10px] lg:flex-1 lg:gap-2 lg:pt-4">
          <h1 className="font-display text-[22px] font-bold leading-7 text-hc-n-900 lg:text-[30px] lg:leading-[normal]">{nombre}</h1>
          {empresa?.tagline && (
            <p className="text-sm leading-5 text-hc-n-600 lg:text-[15px] lg:leading-[18px]">{empresa.tagline}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 lg:gap-4">
            {empresa?.categoriaNegocio && <Dato icono={ICONOS_TIENDA.metaCategoria}>{empresa.categoriaNegocio}</Dato>}
            {desde && <Dato icono={ICONOS_TIENDA.metaCalendario}>En HotClick desde {desde}</Dato>}
            {empresa?.zonaEnvio && <Dato icono={ICONOS_TIENDA.metaEnvio}>Envíos a {empresa.zonaEnvio}</Dato>}
          </div>
          {empresa?.facturaElectronica && (
            <span className="flex min-h-7 w-fit items-center gap-2 rounded-full bg-hc-green-50 py-[6px] pl-[10px] pr-[14px] text-xs font-semibold leading-[normal] text-hc-green-600">
              <IconoFigma src={ICONOS_TIENDA.selloFactura} size={15} />
              Emite factura electrónica
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-[10px]">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${textoWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${CLASE_ACCION} text-white`}
              style={{ backgroundColor: 'var(--t-accent)' }}
            >
              <IconoFigma src={ICONOS_TIENDA.accionWhatsapp} size={16} className="lg:!size-[18px]" />
              WhatsApp
            </a>
          )}
          {instagram && (
            <a href={urlInstagram(instagram)} target="_blank" rel="noopener noreferrer" className={CLASE_ACCION_SECUNDARIA}>
              <IconoFigma src={ICONOS_TIENDA.accionInstagram} size={16} className="lg:!size-[18px]" />
              Instagram
            </a>
          )}
          <button type="button" onClick={compartir} className={CLASE_ACCION_SECUNDARIA}>
            <IconoFigma src={ICONOS_TIENDA.accionCompartir} size={16} className="lg:!size-[18px]" />
            Compartir
          </button>
        </div>
      </div>
    </section>
  )
}
