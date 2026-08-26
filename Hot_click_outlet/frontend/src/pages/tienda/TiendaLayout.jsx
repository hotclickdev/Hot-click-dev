import { useEffect, useState, useCallback } from 'react'
import { Outlet, useParams } from 'react-router-dom'
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

/**
 * Layout de /tienda/:slug. Theme del vendedor, carrito aislado,
 * chrome que nombra HotClick.
 */
export default function TiendaLayout() {
  const { slug } = useParams()
  const { empresa, setEmpresa, totalItems } = useTiendaStore()
  const [infoEstado, setInfoEstado] = useState('cargando')
  const cantidadCarrito = totalItems()

  const cargarInfo = useCallback(() => {
    setInfoEstado('cargando')
    tiendaService.getInfo(slug)
      .then((data) => {
        setEmpresa(slug, data)
        setInfoEstado('lista')
      })
      .catch((err) => {
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

  const nombre = empresa?.nombreComercial ?? slug

  return (
    <div className="hc-tenant-theme flex flex-col min-h-screen" style={estiloMarcaTienda(empresa)}>
      <TiendaHeader
        slug={slug}
        nombre={nombre}
        logoUrl={empresa?.logoUrl}
        cantidadCarrito={cantidadCarrito}
      />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <TiendaFooter nombre={nombre} footerTexto={empresa?.footerTexto} />
      <TiendaBottomNav slug={slug} cantidadCarrito={cantidadCarrito} />
      <TiendaWhatsAppFab nombre={nombre} whatsapp={empresa?.whatsapp} />
    </div>
  )
}

function estadoTrasFalloInfo(err) {
  return err.response?.status === 404 ? 'noDisponible' : 'error'
}
