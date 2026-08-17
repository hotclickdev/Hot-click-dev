import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'
import { aprobacionService } from '@/services/aprobacionService'
import { adminService } from '@/services/orderService'
import EmpresasPendientes from './aprobaciones/EmpresasPendientes'
import OfertasPendientes from './aprobaciones/OfertasPendientes'
import ProductosPendientes from './aprobaciones/ProductosPendientes'
import {
  SUBTITULO_TAB,
  listaDesdeRespuesta,
  solicitudesPendientes,
  statsDesdeEmpresas,
  tabsAprobacion,
} from './aprobaciones/aprobacionesHelpers'

export default function AdminAprobaciones() {
  const toast = useToast()
  const [tab, setTab] = useState('empresas')
  const [solicitudes, setSolicitudes] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [ofertas, setOfertas] = useState([])
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
      setProductos(listaDesdeRespuesta(data))
    } catch {
      toast({ message: 'Error al cargar productos pendientes', type: 'error' })
    } finally {
      setLoadingProductos(false)
    }
  }

  async function aprobarProducto(id) {
    try {
      await aprobacionService.aprobarProducto(id)
      toast({ message: 'Producto aprobado y publicado', type: 'success' })
      cargarProductos()
    } catch {
      toast({ message: 'Error al aprobar el producto', type: 'error' })
      throw new Error('aprobar-producto-failed')
    }
  }

  async function rechazarProducto(id, comentario) {
    try {
      await aprobacionService.rechazarProducto(id, comentario)
      toast({ message: 'Producto rechazado', type: 'success' })
      cargarProductos()
    } catch {
      toast({ message: 'Error al rechazar el producto', type: 'error' })
      throw new Error('rechazar-producto-failed')
    }
  }

  async function cargarOfertas() {
    try {
      setLoadingOfertas(true)
      const { data } = await aprobacionService.listOfertas()
      setOfertas(listaDesdeRespuesta(data))
    } catch {
      toast({ message: 'Error al cargar promociones pendientes', type: 'error' })
    } finally {
      setLoadingOfertas(false)
    }
  }

  async function aprobarOferta(id) {
    try {
      await aprobacionService.aprobarOferta(id)
      toast({ message: 'Promoción aprobada y aplicada', type: 'success' })
      cargarOfertas()
    } catch {
      toast({ message: 'Error al aprobar la promoción', type: 'error' })
      throw new Error('aprobar-oferta-failed')
    }
  }

  async function rechazarOferta(id, comentario) {
    try {
      await aprobacionService.rechazarOferta(id, comentario)
      toast({ message: 'Promoción rechazada', type: 'success' })
      cargarOfertas()
    } catch {
      toast({ message: 'Error al rechazar la promoción', type: 'error' })
      throw new Error('rechazar-oferta-failed')
    }
  }

  async function cargar() {
    try {
      setLoading(true)
      const { data: sol } = await aprobacionService.listEmpresas()
      setSolicitudes(solicitudesPendientes(listaDesdeRespuesta(sol)))
      const { data: todas } = await adminService.getEmpresas()
      setStats(statsDesdeEmpresas(listaDesdeRespuesta(todas)))
    } catch {
      toast({ message: 'Error al cargar solicitudes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function aprobarEmpresa(id) {
    try {
      await aprobacionService.aprobarEmpresa(id)
      toast({ message: 'Negocio aprobado correctamente', type: 'success' })
      cargar()
    } catch {
      toast({ message: 'Error al aprobar', type: 'error' })
      throw new Error('aprobar-empresa-failed')
    }
  }

  async function rechazarEmpresa(id) {
    try {
      await aprobacionService.rechazarEmpresa(id)
      toast({ message: 'Solicitud rechazada', type: 'success' })
      cargar()
    } catch {
      toast({ message: 'Error al rechazar', type: 'error' })
      throw new Error('rechazar-empresa-failed')
    }
  }

  const tabs = tabsAprobacion({
    pendientes: stats.pendientes,
    productos: productos.length,
    ofertas: ofertas.length,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Solicitudes pendientes</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{SUBTITULO_TAB[tab]}</p>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        {tabs.map((item) => (
          <button key={item.id} onClick={() => setTab(item.id)}
            className="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === item.id ? 'var(--hc-accent)' : 'transparent',
              color: tab === item.id ? 'var(--hc-text)' : 'var(--hc-muted)',
            }}>
            {item.label} {item.count > 0 && <span className="ml-1 text-xs">({item.count})</span>}
          </button>
        ))}
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
