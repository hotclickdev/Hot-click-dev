import { useEffect, useState, useCallback } from 'react'
import { Outlet, useParams, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'
import { estiloMarcaTienda } from './tiendaTheme'
import TiendaHeader from './TiendaHeader'
import TiendaFooter from './TiendaFooter'
import TiendaBottomNav from './TiendaBottomNav'
import TiendaWhatsAppFab from './TiendaWhatsAppFab'
import TiendaNoDisponible from './TiendaNoDisponible'
import TiendaInfoError from './TiendaInfoError'
import EsqueletoTiendaLayout from './EsqueletoTiendaLayout'
import type { EmpresaTiendaPublica } from '@/types/tienda'

type EmpresaTiendaLayout = EmpresaTiendaPublica & { footerTexto?: string | null; tagline?: string | null }

/**
 * Layout de /tienda/:slug. Theme del vendedor, carrito aislado,
 * chrome que nombra HotClick.
 */
export default function TiendaLayout() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const { empresa, setEmpresa, totalItems } = useTiendaStore()
  const [infoEstado, setInfoEstado] = useState('cargando')
  const cantidadCarrito = totalItems()

  const cargarInfo = useCallback(() => {
    setInfoEstado('cargando')
    tiendaService.getInfo(slug as string)
      .then((data: unknown) => {
        setEmpresa(slug as string, data as EmpresaTiendaPublica)
        setInfoEstado('lista')
      })
      .catch((err: unknown) => {
        console.error('[TiendaLayout] getInfo', err)
        setInfoEstado(estadoTrasFalloInfo(err))
      })
  }, [slug, setEmpresa])

  useEffect(() => {
    cargarInfo()
  }, [cargarInfo])

  if (infoEstado === 'cargando') return <EsqueletoTiendaLayout />
  if (infoEstado === 'noDisponible') return <TiendaNoDisponible />
  if (infoEstado === 'error') return <TiendaInfoError onRetry={cargarInfo} />

  const empresaVista = empresa as EmpresaTiendaLayout | null
  const nombre = empresaVista?.nombreComercial ?? (slug as string)

  return (
    <div className="hc-tenant-theme flex flex-col min-h-screen" style={estiloMarcaTienda(empresa)}>
      <MetaTienda slug={slug as string} nombre={nombre} pathname={pathname} tagline={empresaVista?.tagline} />
      <TiendaHeader
        slug={slug as string}
        nombre={nombre}
        logoUrl={empresaVista?.logoUrl}
        cantidadCarrito={cantidadCarrito}
      />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <TiendaFooter nombre={nombre} footerTexto={empresaVista?.footerTexto} />
      <TiendaBottomNav slug={slug as string} cantidadCarrito={cantidadCarrito} />
      <TiendaWhatsAppFab nombre={nombre} whatsapp={empresaVista?.whatsapp} />
    </div>
  )
}

function MetaTienda({
  slug, nombre, pathname, tagline,
}: {
  slug: string
  nombre: string
  pathname: string
  tagline?: string | null
}) {
  const producto = pathname.match(/\/producto\/(\d+)/)
  if (producto) {
    const url = `https://hotclick.lat/productos/${producto[1]}`
    return (
      <Helmet>
        <link rel="canonical" href={url} />
        <meta property="og:url" content={url} />
      </Helmet>
    )
  }
  if (pathname.includes('/carrito') || pathname.includes('/checkout')) {
    return <Helmet><meta name="robots" content="noindex, follow" /></Helmet>
  }
  const title = `${nombre} — tienda en línea en Costa Rica`
  const description = tagline?.trim()
    || `Comprá en ${nombre}, tienda en línea en Costa Rica. Envío a todo el país por HotClick.`
  const url = `https://hotclick.lat/tienda/${slug}`
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
    </Helmet>
  )
}

function estadoTrasFalloInfo(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return 'error'
  const status = (err as { response?: { status?: number } }).response?.status
  return status === 404 ? 'noDisponible' : 'error'
}
