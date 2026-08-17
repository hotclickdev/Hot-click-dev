import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { gastoService } from '@/services/gastoService'
import ImportExportBar from '@/components/admin/ImportExportBar'
import { useToast } from '@/components/ui/Toast'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import EgresosTab from './finanzas/EgresosTab'
import FinanzasResumen from './finanzas/FinanzasResumen'
import GastoModal from './finanzas/GastoModal'
import IngresosTab from './finanzas/IngresosTab'
import SaleDetailModal from './finanzas/SaleDetailModal'
import {
  COLUMNAS_EXPORT_INGRESOS,
  EMPTY_GASTO,
  QUICK_DAYS,
  QUICK_LABEL,
  envioDePedido,
  filasExportIngresos,
  listaPedidosDesdeRespuesta,
  pedidoEnPeriodo,
  rangoDesdeQuick,
  subtotalDePedido,
  totalDePedido,
} from './finanzas/finanzasHelpers'

export default function AdminFinanzas() {
  const { showToast } = useToast()

  const [tab, setTab] = useState('ingresos')
  const [quick, setQuick] = useState(30)
  const [desde, setDesde] = useState(() => rangoDesdeQuick(30).desde)
  const [hasta, setHasta] = useState(() => rangoDesdeQuick(30).hasta)

  const [pedidos, setPedidos] = useState([])
  const [loadingP, setLoadingP] = useState(true)

  const [gastos, setGastos] = useState([])
  const [loadingG, setLoadingG] = useState(false)
  const [gastoModal, setGastoModal] = useState(null)
  const [deleteGasto, setDeleteGasto] = useState(null)

  const [saleDetail, setSaleDetail] = useState(null)

  const applyQuick = (days) => {
    setQuick(days)
    const rango = rangoDesdeQuick(days)
    setDesde(rango.desde)
    setHasta(rango.hasta)
    if (tab === 'egresos' || tab === 'dashboard') setLoadingG(true)
  }

  useEffect(() => {
    let cancelado = false
    orderService.getAll()
      .then(({ data }) => { if (!cancelado) setPedidos(listaPedidosDesdeRespuesta(data)) })
      .catch(() => { if (!cancelado) showToast('Error al cargar ingresos', 'error') })
      .finally(() => { if (!cancelado) setLoadingP(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  const loadGastos = () => {
    setLoadingG(true)
    gastoService.listar(desde || undefined, hasta || undefined)
      .then(setGastos)
      .catch(() => showToast('Error al cargar gastos', 'error'))
      .finally(() => setLoadingG(false))
  }

  useEffect(() => {
    if (tab !== 'egresos' && tab !== 'dashboard') return
    let cancelado = false
    gastoService.listar(desde || undefined, hasta || undefined)
      .then((lista) => { if (!cancelado) setGastos(lista) })
      .catch(() => { if (!cancelado) showToast('Error al cargar gastos', 'error') })
      .finally(() => { if (!cancelado) setLoadingG(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab/fechas
  }, [tab, desde, hasta])

  const filteredP = useMemo(
    () => pedidos.filter((p) => pedidoEnPeriodo(p, desde, hasta)),
    [pedidos, desde, hasta],
  )

  const totalProductos = filteredP.reduce((s, p) => s + subtotalDePedido(p), 0)
  const totalEnvio = filteredP.reduce((s, p) => s + envioDePedido(p), 0)
  const totalIngresos = filteredP.reduce((s, p) => s + totalDePedido(p), 0)
  const totalEgresos = gastos.reduce((s, g) => s + (g.monto ?? 0), 0)
  const utilidadNeta = totalIngresos - totalEgresos

  const porOrigen = useMemo(() => {
    const acc = { ONLINE: 0, POS: 0, MANUAL: 0 }
    filteredP.forEach((p) => {
      const o = p.origen ?? 'ONLINE'
      acc[o] = (acc[o] ?? 0) + totalDePedido(p)
    })
    return acc
  }, [filteredP])

  const porMetodo = useMemo(() => {
    const acc = {}
    filteredP.forEach((p) => {
      const m = p.metodoPago ?? 'OTRO'
      acc[m] = (acc[m] ?? 0) + totalDePedido(p)
    })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [filteredP])

  const porCategoria = useMemo(() => {
    const acc = {}
    gastos.forEach((g) => {
      const c = g.categoria ?? 'OTRO'
      acc[c] = (acc[c] ?? 0) + g.monto
    })
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }, [gastos])

  const handleDeleteGasto = async () => {
    if (!deleteGasto) return
    try {
      await gastoService.eliminar(deleteGasto.id)
      showToast('Gasto eliminado', 'success')
      setDeleteGasto(null)
      loadGastos()
    } catch {
      showToast('Error al eliminar', 'error')
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#e8e8ed]">Finanzas</h1>
            <p className="text-sm text-[#8e8e9a] mt-1">Ingresos, egresos y flujo de caja</p>
            <Link to="/admin/finanzas/reporte-contador"
              className="inline-block text-xs text-[#4f7cff] hover:underline mt-1">
              Ver analítica financiera y reporte para el contador →
            </Link>
          </div>
          {tab === 'ingresos' && (
            <ImportExportBar exportOnly
              data={filasExportIngresos(filteredP)}
              columns={COLUMNAS_EXPORT_INGRESOS}
              filename="ingresos" sheetName="Ingresos"
            />
          )}
          {tab === 'egresos' && (
            <button onClick={() => setGastoModal(EMPTY_GASTO)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
              + Nuevo gasto
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
          {[['ingresos', 'Ingresos'], ['egresos', 'Egresos'], ['dashboard', 'Dashboard']].map(([k, l]) => (
            <button key={k} onClick={() => {
              setTab(k)
              if (k === 'egresos' || k === 'dashboard') setLoadingG(true)
            }}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === k ? 'bg-[#4f7cff] text-white' : 'text-[#8e8e9a] hover:text-white'
              }`}>{l}</button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_DAYS.map((days) => (
            <button key={days} onClick={() => applyQuick(days)}
              className="px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: quick === days ? 'var(--hc-accent)' : 'color-mix(in srgb,var(--hc-text) 5%,transparent)',
                color: quick === days ? 'white' : 'var(--hc-muted)',
                border: `1px solid ${quick === days ? 'color-mix(in srgb,var(--hc-accent) 40%,transparent)' : 'var(--hc-border)'}`,
              }}>{QUICK_LABEL[days]}</button>
          ))}
          <input type="date" value={desde} onChange={(e) => {
            setDesde(e.target.value)
            setQuick(-1)
            if (tab === 'egresos' || tab === 'dashboard') setLoadingG(true)
          }}
            className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none bg-[#111114] border border-white/10" />
          <input type="date" value={hasta} onChange={(e) => {
            setHasta(e.target.value)
            setQuick(-1)
            if (tab === 'egresos' || tab === 'dashboard') setLoadingG(true)
          }}
            className="h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none bg-[#111114] border border-white/10" />
        </div>

        {tab === 'ingresos' && (
          <IngresosTab
            loading={loadingP}
            filteredP={filteredP}
            totalProductos={totalProductos}
            totalEnvio={totalEnvio}
            totalIngresos={totalIngresos}
            onSelectPedido={setSaleDetail}
          />
        )}

        {tab === 'egresos' && (
          <EgresosTab
            loading={loadingG}
            gastos={gastos}
            totalEgresos={totalEgresos}
            onNuevo={setGastoModal}
            onEditar={setGastoModal}
            onEliminar={setDeleteGasto}
          />
        )}

        {tab === 'dashboard' && (
          <FinanzasResumen
            loading={loadingP || loadingG}
            totalIngresos={totalIngresos}
            totalEgresos={totalEgresos}
            utilidadNeta={utilidadNeta}
            porOrigen={porOrigen}
            porMetodo={porMetodo}
            porCategoria={porCategoria}
          />
        )}
      </div>

      {saleDetail && (
        <SaleDetailModal
          key={saleDetail}
          pedidoId={saleDetail}
          onClose={() => setSaleDetail(null)}
        />
      )}

      {gastoModal && (
        <GastoModal
          editing={gastoModal}
          onClose={() => setGastoModal(null)}
          onSaved={() => { setGastoModal(null); loadGastos() }}
        />
      )}

      <ConfirmModal
        open={!!deleteGasto}
        title="Eliminar gasto"
        message={`¿Eliminar "${deleteGasto?.concepto}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDeleteGasto}
        onCancel={() => setDeleteGasto(null)}
      />
    </>
  )
}
