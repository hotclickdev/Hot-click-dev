import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { ventaService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { posService } from '@/services/posService'
import useTenantStore from '@/store/tenantStore'
import ReportesFilters from './reportes/ReportesFilters'
import VentasTab from './reportes/VentasTab'
import ProductosTab from './reportes/ProductosTab'
import PosTab from './reportes/PosTab'
import InventarioTab from './reportes/InventarioTab'
import {
  TABS,
  cardStyle,
  COLUMNAS_EXPORT_VENTAS,
  filasExportVentas,
  filtrarPos,
  filtrarVentas,
  kpisPos,
  kpisVentas,
  rangoQuick,
  toISO,
  topProductosDe,
  stockEnRiesgo,
  listaVentasDesdeRespuesta,
  listaProductosDesdeRespuesta,
  type ProductoReporte,
  type TabReportes,
  type VentaReporte,
} from './reportes/reportesHelpers'

export default function AdminReportes() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabReportes>('ventas')

  const hasFeature = useTenantStore((s) => s.hasFeature)
  const tenantLoaded = useTenantStore((s) => s.loaded)
  const vistaPrevia = tenantLoaded && !hasFeature('reportes')

  const [ventas,    setVentas]    = useState<VentaReporte[]>([])
  const [productos, setProductos] = useState<ProductoReporte[]>([])
  const [posVentas, setPosVentas] = useState<unknown[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadingP,  setLoadingP]  = useState(false)
  const [loadingPOS,setLoadingPOS]= useState(false)

  const [quick,      setQuick]      = useState(30)
  const [desde,      setDesde]      = useState('')
  const [hasta,      setHasta]      = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [estado,     setEstado]     = useState('')
  const [search,     setSearch]     = useState('')
  const [tablePage,  setTablePage]  = useState(0)

  function applyQuick(days: number) {
    setQuick(days)
    setTablePage(0)
    const rango = rangoQuick(days)
    setDesde(rango.desde)
    setHasta(rango.hasta)
  }

  function cambiarTab(key: TabReportes) {
    if (key === 'inventario' && productos.length === 0) setLoadingP(true)
    if (key === 'pos' && posVentas.length === 0) setLoadingPOS(true)
    setActiveTab(key)
  }

  function cambiarDesde(value: string) {
    setDesde(value)
    setQuick(-1)
    setTablePage(0)
  }

  function cambiarHasta(value: string) {
    setHasta(value)
    setQuick(-1)
    setTablePage(0)
  }

  function cambiarFiltro(setter: Dispatch<SetStateAction<string>>) {
    return (value: string) => {
      setter(value)
      setTablePage(0)
    }
  }

  useEffect(() => {
    ventaService.getAll()
      .then(({ data }) => setVentas(listaVentasDesdeRespuesta(data)))
      .catch((err: unknown) => { console.error('[AdminReportes] ventas', err) })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/set-state-in-effect -- init de fechas al montar (mismo applyQuick(30) original)
    applyQuick(30)
  }, [])

  useEffect(() => {
    if (activeTab === 'inventario' && productos.length === 0) {
      productService.adminGetAll(0, 500)
        .then(res => {
          const items = listaProductosDesdeRespuesta(res?.data)
          setProductos(Array.isArray(items) ? items : [])
        })
        .catch((err: unknown) => { console.error('[AdminReportes] productos', err) })
        .finally(() => setLoadingP(false))
    }
    if (activeTab === 'pos' && posVentas.length === 0) {
      posService.historial()
        .then(res => setPosVentas((res as { data?: unknown[] })?.data ?? []))
        .catch(() => setPosVentas([]))
        .finally(() => setLoadingPOS(false))
    }
  }, [activeTab, productos.length, posVentas.length])

  const filtered = useMemo(
    () => filtrarVentas(ventas, { desde, hasta, metodoPago, estado, search }),
    [ventas, desde, hasta, metodoPago, estado, search],
  )

  const { completadas, totalIngresos, totalEnvios, totalProductos, ticketPromedio } = kpisVentas(filtered)

  const topProductos = useMemo(() => topProductosDe(completadas), [completadas])
  const stockRiesgo = useMemo(() => stockEnRiesgo(productos), [productos])
  const posFiltradas = useMemo(() => filtrarPos(posVentas, desde, hasta), [posVentas, desde, hasta])
  const { posTotal, posTx, posTicket } = kpisPos(posFiltradas)

  const exportTopProductos = () => {
    const h = 'Producto,Unidades,Ingreso,Costo,Utilidad,Margen%'
    const rows = topProductos.map(p => [p.nombre, p.cantidad, p.ingreso, p.costo, p.utilidad, p.margen].join(','))
    const a = document.createElement('a')
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent([h, ...rows].join('\n'))}`
    a.download = `top-productos-${toISO(new Date())}.csv`
    a.click()
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>{t('admin.reportes.title')}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{t('admin.reportes.generate')}</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'ventas' && (
              <ImportExportBar exportOnly
                data={filasExportVentas(filtered)}
                columns={COLUMNAS_EXPORT_VENTAS}
                filename={`ventas-${toISO(new Date())}`} sheetName="Ventas"
              />
            )}
            {activeTab === 'productos' && topProductos.length > 0 && (
              <button type="button" onClick={exportTopProductos}
                className="px-4 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {vistaPrevia && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
            <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <rect x="4" y="10" width="16" height="10" rx="2"/><path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
            </svg>
            <p className="text-sm" style={{ color: 'var(--hc-text)' }}>
              <strong>Estás viendo una vista previa</strong> con tus datos actuales. Con el plan PYME, estos reportes
              se actualizan con más historial y detalle todos los días.
            </p>
          </div>
        )}

        <div className="flex gap-1 rounded-xl p-1 w-fit flex-wrap" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
          {TABS.map(({ key, label }) => (
            <button type="button" key={key} onClick={() => cambiarTab(key)}
              className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={activeTab === key
                ? { backgroundColor: 'var(--hc-accent)', color: '#fff' }
                : { color: 'var(--hc-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        <ReportesFilters
          quick={quick}
          desde={desde}
          hasta={hasta}
          onQuick={applyQuick}
          onDesde={cambiarDesde}
          onHasta={cambiarHasta}
        />

        {activeTab === 'ventas' && (
          <VentasTab
            search={search} onSearch={cambiarFiltro(setSearch)}
            metodoPago={metodoPago} onMetodoPago={cambiarFiltro(setMetodoPago)}
            estado={estado} onEstado={cambiarFiltro(setEstado)}
            ventas={ventas} filtered={filtered}
            totalIngresos={totalIngresos} totalEnvios={totalEnvios}
            totalProductos={totalProductos} ticketPromedio={ticketPromedio}
            completadas={completadas}
            loading={loading} tablePage={tablePage} onTablePage={setTablePage}
          />
        )}
        {activeTab === 'productos' && (
          <ProductosTab loading={loading} topProductos={topProductos} />
        )}
        {activeTab === 'pos' && (
          <PosTab
            loading={loadingPOS}
            posFiltradas={posFiltradas}
            posTx={posTx} posTotal={posTotal} posTicket={posTicket}
          />
        )}
        {activeTab === 'inventario' && (
          <InventarioTab loading={loadingP} productos={productos} stockRiesgo={stockRiesgo} />
        )}

        {vistaPrevia && (
          <div className="rounded-2xl p-6 flex items-center gap-5 flex-wrap" style={cardStyle}>
            <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
              <svg className="w-6 h-6" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <rect x="4" y="10" width="16" height="10" rx="2"/><path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
              </svg>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--hc-text)' }}>Activá tus reportes reales</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                Tu plan actual es <strong>Emprendedor (gratis)</strong>. Con el plan PYME sumás más historial, filtros y exportación.
              </p>
            </div>
            <Link to="/admin/billing/planes"
              className="px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}>
              Mejorá tu plan
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
