import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Seo from '@/components/seo/Seo'
import PaginaInformativa from '@/components/comprador/PaginaInformativa'

/** Ícono de trazo 22px dentro del mosaico de 44px (Figma `28:1441`). */
function Trazo({ children }: { children: ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

const IconoBuscar = () => (
  <Trazo><circle cx="10.08" cy="10.08" r="6.42" /><path d="m18.33 18.33-3.2-3.2" /></Trazo>
)
const IconoGarantia = () => (
  <Trazo><path d="M11 2.75 3.67 5.5V11c0 4.58 3.2 7.33 7.33 8.25 4.13-.92 7.33-3.67 7.33-8.25V5.5z" /><path d="m8.25 11 1.83 1.83 3.67-3.66" /></Trazo>
)
const IconoEnvios = () => (
  <Trazo><rect x="1" y="3.5" width="13" height="11" rx="1.5" /><path d="M14 7.5h3.5l3 4v3H14z" /><circle cx="5" cy="17" r="1.8" /><circle cx="17" cy="17" r="1.8" /></Trazo>
)
const IconoPreguntas = () => (
  <Trazo><circle cx="11" cy="11" r="8.25" /><path d="M8.7 8.25a2.3 2.3 0 1 1 3.2 2.1c-.55.28-.9.83-.9 1.47v.43M11 15.6h.01" /></Trazo>
)
const IconoContacto = () => (
  <Trazo><path d="M19.25 10.54a7.7 7.7 0 0 1-11.3 6.8L2.75 19.25l1.9-5.2a7.7 7.7 0 1 1 14.6-3.5z" /></Trazo>
)

/** Fondo y color del mosaico, en el mismo orden que las opciones del Figma `28:1438`. */
const TONOS = {
  azul: 'bg-hc-blue-50 text-hc-blue-600',
  verde: 'bg-hc-green-50 text-hc-green-600',
  ambar: 'bg-hc-warning-bg text-hc-warning',
  rojo: 'bg-hc-red-50 text-hc-red-600',
} as const

type Opcion = { to: string; titulo: string; detalle: string; icono: ReactNode; tono: keyof typeof TONOS }

/** Tarjeta de opción (Figma `28:1439`): mosaico de ícono, título, detalle y flecha. */
function TarjetaOpcion({ opcion }: { opcion: Opcion }) {
  return (
    <li>
      <Link
        to={opcion.to}
        className="flex items-center gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-[14px] text-left hover:bg-hc-n-50"
      >
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${TONOS[opcion.tono]}`}>
          {opcion.icono}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-hc-n-900">{opcion.titulo}</span>
          <span className="text-[12px] leading-4 text-hc-n-600">{opcion.detalle}</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-hc-n-600" aria-hidden="true">
          <path d="M6.75 13.5 11.25 9 6.75 4.5" />
        </svg>
      </Link>
    </li>
  )
}

/**
 * Centro de ayuda del comprador. No hay frame propio en el Figma: el diseño
 * más cercano es "Servicios HOT · inicio · móvil" (`28:1429`, sección
 * "06 · Servicios y ayuda"), del que se toman las tarjetas de opción
 * (`28:1438`). Cada tarjeta enlaza a una página que ya existe en el sitio
 * (`/servicios`, `/informacion`, `/envios`, `/contacto`).
 */
export default function AyudaPage() {
  const { t } = useTranslation()

  const opciones: Opcion[] = [
    { to: '/servicios', titulo: t('ayudaPage.serviciosTitle'), detalle: t('ayudaPage.serviciosDetalle'), icono: <IconoBuscar />, tono: 'azul' },
    { to: '/informacion', titulo: t('ayudaPage.garantiaTitle'), detalle: t('ayudaPage.garantiaDetalle'), icono: <IconoGarantia />, tono: 'verde' },
    { to: '/envios', titulo: t('ayudaPage.enviosTitle'), detalle: t('ayudaPage.enviosDetalle'), icono: <IconoEnvios />, tono: 'ambar' },
    { to: '/informacion#faq', titulo: t('ayudaPage.faqTitle'), detalle: t('ayudaPage.faqDetalle'), icono: <IconoPreguntas />, tono: 'rojo' },
    { to: '/contacto', titulo: t('ayudaPage.contactoTitle'), detalle: t('ayudaPage.contactoDetalle'), icono: <IconoContacto />, tono: 'azul' },
  ]

  return (
    <>
      <Seo
        title="Centro de ayuda — HotClick"
        description="Servicios HOT, garantía, devoluciones, envíos y contacto: todo lo que necesitás para comprar en HotClick."
        url="https://hotclick.lat/ayuda"
      />
      <PaginaInformativa titulo={t('ayudaPage.title')} subtitulo={t('ayudaPage.subtitle')}>
        <nav aria-label={t('ayudaPage.title')} className="px-4 pb-6 pt-4 lg:px-0">
          <ul className="flex flex-col gap-3">
            {opciones.map((o) => <TarjetaOpcion key={o.to} opcion={o} />)}
          </ul>
        </nav>
      </PaginaInformativa>
    </>
  )
}
