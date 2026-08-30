import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { aprobacionService } from '@/services/aprobacionService'
import { adminService } from '@/services/orderService'
import type { Id } from '@/types/api'
import EmpresasPendientes from './aprobaciones/EmpresasPendientes'
import OfertasPendientes from './aprobaciones/OfertasPendientes'
import ProductosPendientes from './aprobaciones/ProductosPendientes'
import { AdminFilterChip } from '@/prototipo/admin/AdminUi'
import {
  listaDesdeRespuesta,
  solicitudesPendientes,
  statsDesdeEmpresas,
  tabsAprobacion,
  type EmpresaSolicitud,
  type OfertaPendiente,
  type ProductoPendiente,
  type StatsAprobacion,
  type TabAprobacion,
} from './aprobaciones/aprobacionesHelpers'

const TAB_LABEL_KEY: Record<TabAprobacion, string> = {
  empresas: 'adminAprobaciones.tabEmpresas',
  productos: 'adminAprobaciones.tabProductos',
  ofertas: 'adminAprobaciones.tabOfertas',
}

function subtituloModeracionI18n(
  t: (key: string, opts?: { count: number }) => string,
  tab: TabAprobacion,
  productos: number,
  empresas: number,
  ofertas: number,
): string {
  if (tab === 'productos') return t('adminAprobaciones.waitingProducts', { count: productos })
  if (tab === 'ofertas') return t('adminAprobaciones.waitingOffers', { count: ofertas })
  return t('adminAprobaciones.waitingStores', { count: empresas })
}

export default function AdminAprobaciones() {
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState<TabAprobacion>('productos')
  const [solicitudes, setSolicitudes] = useState<EmpresaSolicitud[]>([])
  const [stats, setStats] = useState<StatsAprobacion>({})
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState<ProductoPendiente[]>([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [ofertas, setOfertas] = useState<OfertaPendiente[]>([])
  const [loadingOfertas, setLoadingOfertas] = useState(true)

  useEffect(() => {
    cargar()
    cargarProductos()
    cargarOfertas()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  async function cargarProductos() {
    try {
      setLoadingProductos(true)
      const { data } = await aprobacionService.listProductos()
      setProductos(listaDesdeRespuesta<ProductoPendiente>(data))
    } catch {
      toast({ message: t('adminAprobaciones.errorLoadProducts'), type: 'error' })
    } finally {
      setLoadingProductos(false)
    }
  }

  async function aprobarProducto(id: Id) {
    try {
      await aprobacionService.aprobarProducto(id)
      toast({ message: t('adminAprobaciones.productApproved'), type: 'success' })
      cargarProductos()
    } catch {
      toast({ message: t('adminAprobaciones.errorApproveProduct'), type: 'error' })
      throw new Error('aprobar-producto-failed')
    }
  }

  async function rechazarProducto(id: Id, comentario: string) {
    try {
      await aprobacionService.rechazarProducto(id, comentario)
      toast({ message: t('adminAprobaciones.productRejected'), type: 'success' })
      cargarProductos()
    } catch {
      toast({ message: t('adminAprobaciones.errorRejectProduct'), type: 'error' })
      throw new Error('rechazar-producto-failed')
    }
  }

  async function cargarOfertas() {
    try {
      setLoadingOfertas(true)
      const { data } = await aprobacionService.listOfertas()
      setOfertas(listaDesdeRespuesta<OfertaPendiente>(data))
    } catch {
      toast({ message: t('adminAprobaciones.errorLoadOffers'), type: 'error' })
    } finally {
      setLoadingOfertas(false)
    }
  }

  async function aprobarOferta(id: Id) {
    try {
      await aprobacionService.aprobarOferta(id)
      toast({ message: t('adminAprobaciones.offerApproved'), type: 'success' })
      cargarOfertas()
    } catch {
      toast({ message: t('adminAprobaciones.errorApproveOffer'), type: 'error' })
      throw new Error('aprobar-oferta-failed')
    }
  }

  async function rechazarOferta(id: Id, comentario: string) {
    try {
      await aprobacionService.rechazarOferta(id, comentario)
      toast({ message: t('adminAprobaciones.offerRejected'), type: 'success' })
      cargarOfertas()
    } catch {
      toast({ message: t('adminAprobaciones.errorRejectOffer'), type: 'error' })
      throw new Error('rechazar-oferta-failed')
    }
  }

  async function cargar() {
    try {
      setLoading(true)
      const { data: sol } = await aprobacionService.listEmpresas()
      setSolicitudes(solicitudesPendientes(listaDesdeRespuesta<EmpresaSolicitud>(sol)))
      const { data: todas } = await adminService.getEmpresas()
      setStats(statsDesdeEmpresas(listaDesdeRespuesta<EmpresaSolicitud>(todas)))
    } catch {
      toast({ message: t('adminAprobaciones.errorLoadRequests'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function aprobarEmpresa(id: Id) {
    try {
      await aprobacionService.aprobarEmpresa(id)
      toast({ message: t('adminAprobaciones.companyApproved'), type: 'success' })
      cargar()
    } catch {
      toast({ message: t('adminAprobaciones.errorApprove'), type: 'error' })
      throw new Error('aprobar-empresa-failed')
    }
  }

  async function rechazarEmpresa(id: Id) {
    try {
      await aprobacionService.rechazarEmpresa(id)
      toast({ message: t('adminAprobaciones.requestRejected'), type: 'success' })
      cargar()
    } catch {
      toast({ message: t('adminAprobaciones.errorReject'), type: 'error' })
      throw new Error('rechazar-empresa-failed')
    }
  }

  const tabs = tabsAprobacion({
    pendientes: stats.pendientes,
    productos: productos.length,
    ofertas: ofertas.length,
  })

  return (
    <div className="mx-auto max-w-md space-y-5 pb-8 md:max-w-4xl">
      <div>
        <h1 className="font-display text-[22px] font-bold text-hc-text">{t('adminAprobaciones.title')}</h1>
        <p className="mt-0.5 text-xs text-hc-muted">
          {subtituloModeracionI18n(t, tab, productos.length, solicitudes.length, ofertas.length)}
        </p>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {tabs.map((item) => {
          const label = t(TAB_LABEL_KEY[item.id])
          return (
            <AdminFilterChip
              key={item.id}
              activo={tab === item.id}
              onClick={() => setTab(item.id)}
              dataMm={item.id === 'productos' ? 'tab-productos' : undefined}
            >
              {item.count > 0 ? `${label} (${item.count})` : label}
            </AdminFilterChip>
          )
        })}
      </div>

      {tab === 'productos' ? (
        <ProductosPendientes
          productos={productos}
          loading={loadingProductos}
          aprobar={aprobarProducto}
          rechazar={rechazarProducto}
        />
      ) : tab === 'ofertas' ? (
        <OfertasPendientes
          ofertas={ofertas}
          loading={loadingOfertas}
          aprobar={aprobarOferta}
          rechazar={rechazarOferta}
        />
      ) : (
        <EmpresasPendientes
          solicitudes={solicitudes}
          loading={loading}
          stats={stats}
          aprobar={aprobarEmpresa}
          rechazar={rechazarEmpresa}
        />
      )}
    </div>
  )
}
