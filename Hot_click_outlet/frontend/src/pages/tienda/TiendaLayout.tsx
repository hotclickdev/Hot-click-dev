import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation, useMatch, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import tiendaService from '@/services/tiendaService'
import useTiendaStore from '@/store/tiendaStore'
import Seo from '@/components/seo/Seo'
import { generateLocalBusinessJsonLd } from '@/utils/jsonLd'
import { estiloMarcaTienda } from './tiendaTheme'
import { contactoVisible } from './tiendaHelpers'
import TiendaHeader from './TiendaHeader'
import TiendaFooter from './TiendaFooter'
import TiendaBarraPedido from './TiendaBarraPedido'
import TiendaNoDisponible from './TiendaNoDisponible'
import TiendaInfoError from './TiendaInfoError'
import EsqueletoTiendaLayout from './EsqueletoTiendaLayout'
import type { EmpresaTiendaPublica } from '@/types/tienda'

type EmpresaTiendaLayout = EmpresaTiendaPublica & { footerTexto?: string | null; tagline?: string | null }

/**
 * Layout de /tienda/:slug. Theme del vendedor, carrito aislado, chrome que nombra HotClick.
 * Superficie Figma (`29:922`, `29:2308`, `51:2468`); las subpantallas son "derivado de Figma"
 * según docs/figma-migration/MANUAL_MARCA_FIGMA.
 */
export default function TiendaLayout() {
  const { slug } = useParams()
  const { pathname } = useLocation()
  const { empresa, setEmpresa, totalItems, totalImporte } = useTiendaStore()
  const [infoEstado, setInfoEstado] = useState('cargando')
  const cantidadCarrito = totalItems()
  const esPerfil = useMatch({ path: '/tienda/:slug', end: true }) !== null
  const esExito = useMatch({ path: '/tienda/:slug/checkout/exito', end: true }) !== null

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
  const descripcionSeo = empresaVista?.tagline || empresaVista?.descripcion
    || `Comprá en la tienda de ${nombre} dentro de HotClick, el marketplace de emprendedores de Costa Rica.`
  const productoEnRuta = pathname.match(/\/producto\/(\d+)/)
  const esTransaccional = pathname.includes('/carrito') || pathname.includes('/checkout')
  const urlCanonica = productoEnRuta
    ? `https://hotclick.lat/productos/${productoEnRuta[1]}`
    : `https://hotclick.lat/tienda/${slug}`

  return (
    <div className="hc-tenant-theme flex flex-col min-h-screen" style={estiloMarcaTienda(empresa)}>
      {esTransaccional ? (
        <Helmet><meta name="robots" content="noindex, follow" /></Helmet>
      ) : (
        <Seo
          title={`${nombre} · HotClick`}
          description={descripcionSeo}
          image={empresaVista?.ogImagenUrl || empresaVista?.logoUrl || undefined}
          url={urlCanonica}
        />
      )}
      {empresa && !esTransaccional && !productoEnRuta && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(generateLocalBusinessJsonLd({
              slug: slug as string,
              nombreComercial: nombre,
              descripcion: empresaVista?.descripcion,
              logoUrl: empresaVista?.logoUrl,
              categoriaNegocio: empresaVista?.categoriaNegocio,
              whatsapp: contactoVisible(empresaVista).whatsapp || null,
              retiro: empresaVista?.retiro,
            }))}
          </script>
        </Helmet>
      )}
      <TiendaHeader
        slug={slug as string}
        nombre={nombre}
        logoUrl={empresaVista?.logoUrl}
        cantidadCarrito={cantidadCarrito}
        soloEscritorio={esPerfil}
        conAtras={!esPerfil && !esExito}
      />
      <main className={`flex-1 ${esPerfil && cantidadCarrito > 0 ? 'pb-24 md:pb-0' : ''}`}>
        <Outlet />
      </main>
      <TiendaFooter nombre={nombre} footerTexto={empresaVista?.footerTexto} />
      {esPerfil && <TiendaBarraPedido slug={slug as string} cantidad={cantidadCarrito} total={totalImporte()} />}
    </div>
  )
}

function estadoTrasFalloInfo(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return 'error'
  const status = (err as { response?: { status?: number } }).response?.status
  return status === 404 ? 'noDisponible' : 'error'
}
