import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { ventaService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { formatPrice } from '@/utils/format'
import useTenantStore from '@/store/tenantStore'
import TabFinanzas from './sistema-reportes/TabFinanzas'
import TabAnalisis from './sistema-reportes/TabAnalisis'
import TabAlertas from './sistema-reportes/TabAlertas'
import {
  TABS_SISTEMA,
  CARD_SHADOW,
  construirDias7,
  filtrarVentasSemana,
  totalesPorDia,
  costoDeVentas,
  productosEstrellaDe,
  stockEnRiesgo,
} from './sistema-reportes/sistemaReportesHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'

export default function SistemaReportes() {
  const hasFeature = useTenantStore((s) => s.hasFeature)
  const tenantLoaded = useTenantStore((s) => s.loaded)
  const vistaPrevia = tenantLoaded && !hasFeature('reportes')
  const toast = useToast()

  const [tab, setTab] = useState('finanzas')
  const [ventas, setVentas] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let fallos = 0
    Promise.all([
      ventaService.getAll().catch((err) => {
        console.error('[SistemaReportes] ventas', err)
        fallos += 1
        return { data: [] }
      }),
      productService.adminGetAll(0, 500).catch((err) => {
        console.error('[SistemaReportes] productos', err)
        fallos += 1
        return { data: [] }
      }),
    ]).then(([{ data: vs }, { data: ps }]) => {
      setVentas(Array.isArray(vs) ? vs : vs?.content ?? [])
      const lista = ps?.content ?? (Array.isArray(ps) ? ps : [])
      setProductos(Array.isArray(lista) ? lista : [])
      if (fallos > 0) {
        toast({ message: 'No se pudieron cargar todos los datos de reportes', type: 'error' })
      }
    }).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- carga única al montar
  }, [])

  const dias7 = useMemo(() => construirDias7(), [])
  const ventasSemana = useMemo(() => filtrarVentasSemana(ventas, dias7), [ventas, dias7])
  const porDia = useMemo(() => totalesPorDia(dias7, ventasSemana), [ventasSemana, dias7])
  const totalSemana = porDia.reduce((s, d) => s + d.total, 0)
  const maxDia = Math.max(...porDia.map(d => d.total), 1)
  const mejorDia = porDia.reduce((max, d) => d.total > max.total ? d : max, porDia[0] ?? { total: 0, label: '—' })
  const mejorDiaPct = totalSemana > 0 ? Math.round((mejorDia.total / totalSemana) * 100) : 0
  const costoSemana = useMemo(() => costoDeVentas(ventasSemana), [ventasSemana])
  const ingresoNeto = totalSemana - costoSemana
  const productosEstrella = useMemo(() => productosEstrellaDe(ventasSemana, totalSemana), [ventasSemana, totalSemana])
  const stockRiesgo = useMemo(() => stockEnRiesgo(productos), [productos])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4 max-w-[1060px]">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        <TextoFlecha dir="atras">Inicio</TextoFlecha>
      </Link>

      <header>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, letterSpacing: '-0.5px', color: 'var(--hc-text)' }}>Reportes</h1>
        <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--hc-muted)' }}>
          Esta semana: ventas {formatPrice(totalSemana)}
          {costoSemana > 0 ? ` · costo ${formatPrice(costoSemana)}` : ''}
          {stockRiesgo.length > 0 ? ` · ${stockRiesgo.length} con stock bajo` : ''}.
        </p>
      </header>

      {vistaPrevia && <BannerVistaPrevia />}

      <div className="inline-flex gap-1 rounded-xl p-1 w-fit flex-wrap" style={{ backgroundColor: 'var(--hc-surface)' }}>
        {TABS_SISTEMA.map(({ key, label }) => (
          <button type="button" key={key} onClick={() => setTab(key)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5"
            style={tab === key ? { backgroundColor: 'var(--hc-accent)', color: '#fff' } : { color: 'var(--hc-muted)' }}>
            {label}
            {key === 'alertas' && stockRiesgo.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f7ead2', color: '#8a5a00' }}>
                {stockRiesgo.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'finanzas' && (
        <TabFinanzas
          porDia={porDia}
          totalSemana={totalSemana}
          maxDia={maxDia}
          mejorDia={mejorDia}
          mejorDiaPct={mejorDiaPct}
          ingresoNeto={ingresoNeto}
          costoSemana={costoSemana}
        />
      )}
      {tab === 'analisis' && (
        <TabAnalisis
          productosEstrella={productosEstrella}
          totalSemana={totalSemana}
          mejorDia={mejorDia}
          mejorDiaPct={mejorDiaPct}
        />
      )}
      {tab === 'alertas' && <TabAlertas stockRiesgo={stockRiesgo} />}

      {vistaPrevia && <CtaPlanPyme />}
    </div>
  )
}

function BannerVistaPrevia() {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
      <p className="text-sm" style={{ color: 'var(--hc-text)' }}>
        Estás viendo esta semana con tus datos. El plan PYME trae más historial y detalle.
      </p>
    </div>
  )
}

function CtaPlanPyme() {
  return (
    <section className="rounded-2xl flex items-center gap-5 flex-wrap" style={{ backgroundColor: 'var(--hc-surface)', boxShadow: CARD_SHADOW, padding: '24px 28px' }}>
      <div className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(23,71,168,0.08)' }}>
        <svg className="w-6 h-6" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <rect x="4" y="10" width="16" height="10" rx="2"/><path strokeLinecap="round" d="M8 10V7a4 4 0 118 0v3"/>
        </svg>
      </div>
      <div className="flex-1 min-w-[200px]">
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--hc-text)' }}>Más historial con PYME</p>
        <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--hc-muted)' }}>
          Acá ves la semana. El plan PYME suma meses atrás y más detalle.
        </p>
      </div>
      <Link to="/admin/billing/planes"
        className="whitespace-nowrap transition-opacity hover:opacity-90"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--hc-primary)', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 10 }}>
        Mejorá tu plan
      </Link>
    </section>
  )
}
