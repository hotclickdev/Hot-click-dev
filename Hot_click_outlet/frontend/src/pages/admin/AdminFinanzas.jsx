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
import TextoFlecha from '@/components/ui/TextoFlecha'
import TextoMas from '@/components/ui/TextoMas'
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

const TABS_FINANZAS = [
  ['ingresos', 'Ingresos'],
  ['egresos', 'Egresos'],
  ['dashboard', 'Dashboard'],
]
const CLASE_FECHA = 'h-9 px-3 rounded-xl text-sm text-[#e8e8ed] focus:outline-none bg-[#111114] border border-white/10'

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
    if (tabCargaGastos(tab)) setLoadingG(true)
  }

  useEffect(() => {
    let cancelado = false
    orderService.getAll()
      .then(({ data }) => { if (!cancelado) setPedidos(listaPedidosDesdeRespuesta(data)) })
      .catch((err) => {
        console.error('[AdminFinanzas] ingresos', err)
        if (!cancelado) showToast('Error al cargar ingresos', 'error')
      })
      .finally(() => { if (!cancelado) setLoadingP(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  const loadGastos = () => {
    setLoadingG(true)
    gastoService.listar(desde || undefined, hasta || undefined)
      .then(setGastos)
      .catch((err) => {
        console.error('[AdminFinanzas] gastos', err)
        showToast('Error al cargar gastos', 'error')
      })
      .finally(() => setLoadingG(false))
  }

  useEffect(() => {
    if (!tabCargaGastos(tab)) return
    let cancelado = false
    gastoService.listar(desde || undefined, hasta || undefined)
      .then((lista) => { if (!cancelado) setGastos(lista) })
      .catch((err) => {
        console.error('[AdminFinanzas] gastos', err)
        if (!cancelado) showToast('Error al cargar gastos', 'error')
      })
      .finally(() => { if (!cancelado) setLoadingG(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab/fechas
  }, [tab, desde, hasta])

  const filteredP = useMemo(
    () => pedidos.filter((p) => pedidoEnPeriodo(p, desde, hasta)),
    [pedidos, desde, hasta],
  )
  const kpis = kpisPeriodo(filteredP, gastos)
  const porOrigen = useMemo(() => agruparPorOrigen(filteredP), [filteredP])
  const porMetodo = useMemo(() => agruparPorMetodo(filteredP), [filteredP])
  const porCategoria = useMemo(() => agruparPorCategoria(gastos), [gastos])

  const marcarRangoManual = (setter, valor) => {
    setter(valor)
    setQuick(-1)
    if (tabCargaGastos(tab)) setLoadingG(true)
  }

  const handleDeleteGasto = async () => {
    if (!deleteGasto) return
    try {
      await gastoService.eliminar(deleteGasto.id)
      showToast('Gasto eliminado', 'success')
      setDeleteGasto(null)
      loadGastos()
    } catch (err) {
      console.error('[AdminFinanzas] eliminar gasto', err)
      showToast('Error al eliminar', 'error')
    }
  }

  return (
    <>
      <div className="space-y-6">
        <FinanzasCabecera tab={tab} filteredP={filteredP} onNuevoGasto={() => setGastoModal(EMPTY_GASTO)} />
        <FinanzasTabs tab={tab} onTab={(k) => { setTab(k); if (tabCargaGastos(k)) setLoadingG(true) }} />
        <FinanzasPeriodo
          quick={quick}
          desde={desde}
          hasta={hasta}
          onQuick={applyQuick}
          onDesde={(v) => marcarRangoManual(setDesde, v)}
          onHasta={(v) => marcarRangoManual(setHasta, v)}
        />

        {tab === 'ingresos' && (
          <IngresosTab
            loading={loadingP}
            filteredP={filteredP}
            totalProductos={kpis.totalProductos}
            totalEnvio={kpis.totalEnvio}
            totalIngresos={kpis.totalIngresos}
            onSelectPedido={setSaleDetail}
          />
        )}

        {tab === 'egresos' && (
          <EgresosTab
            loading={loadingG}
            gastos={gastos}
            totalEgresos={kpis.totalEgresos}
            onNuevo={setGastoModal}
            onEditar={setGastoModal}
            onEliminar={setDeleteGasto}
          />
        )}

        {tab === 'dashboard' && (
          <FinanzasResumen
            loading={loadingP || loadingG}
            totalIngresos={kpis.totalIngresos}
            totalEgresos={kpis.totalEgresos}
            utilidadNeta={kpis.utilidadNeta}
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

function tabCargaGastos(tab) {
  return tab === 'egresos' || tab === 'dashboard'
}

function kpisPeriodo(filteredP, gastos) {
  const totalProductos = filteredP.reduce((s, p) => s + subtotalDePedido(p), 0)
  const totalEnvio = filteredP.reduce((s, p) => s + envioDePedido(p), 0)
  const totalIngresos = filteredP.reduce((s, p) => s + totalDePedido(p), 0)
  const totalEgresos = gastos.reduce((s, g) => s + (g.monto ?? 0), 0)
  return { totalProductos, totalEnvio, totalIngresos, totalEgresos, utilidadNeta: totalIngresos - totalEgresos }
}

function agruparPorOrigen(filteredP) {
  const acc = { ONLINE: 0, POS: 0, MANUAL: 0 }
  filteredP.forEach((p) => {
    const o = p.origen ?? 'ONLINE'
    acc[o] = (acc[o] ?? 0) + totalDePedido(p)
  })
  return acc
}

function agruparPorMetodo(filteredP) {
  const acc = {}
  filteredP.forEach((p) => {
    const m = p.metodoPago ?? 'OTRO'
    acc[m] = (acc[m] ?? 0) + totalDePedido(p)
  })
  return Object.entries(acc).sort((a, b) => b[1] - a[1])
}

function agruparPorCategoria(gastos) {
  const acc = {}
  gastos.forEach((g) => {
    const c = g.categoria ?? 'OTRO'
    acc[c] = (acc[c] ?? 0) + g.monto
  })
  return Object.entries(acc).sort((a, b) => b[1] - a[1])
}

function claseTabFinanzas(activa) {
  const base = 'px-4 py-1.5 rounded-lg text-xs font-medium transition-all '
  if (activa) return `${base}bg-[#4f7cff] text-white`
  return `${base}text-[#8e8e9a] hover:text-white`
}

function estiloQuickPildora(activa) {
  if (activa) {
    return {
      backgroundColor: 'var(--hc-accent)',
      color: 'white',
      border: '1px solid color-mix(in srgb,var(--hc-accent) 40%,transparent)',
    }
  }
  return {
    backgroundColor: 'color-mix(in srgb,var(--hc-text) 5%,transparent)',
    color: 'var(--hc-muted)',
    border: '1px solid var(--hc-border)',
  }
}

function FinanzasCabecera({ tab, filteredP, onNuevoGasto }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-[#e8e8ed]">Finanzas</h1>
        <p className="text-sm text-[#8e8e9a] mt-1">Ingresos, egresos y flujo de caja</p>
        <Link to="/admin/finanzas/reporte-contador"
          className="inline-block text-xs text-[#4f7cff] hover:underline mt-1">
          <TextoFlecha>Ver analítica financiera y reporte para el contador</TextoFlecha>
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
        <button type="button" onClick={onNuevoGasto}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 inline-flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          <TextoMas>Nuevo gasto</TextoMas>
        </button>
      )}
    </div>
  )
}

function FinanzasTabs({ tab, onTab }) {
  return (
    <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
      {TABS_FINANZAS.map(([k, l]) => (
        <button type="button" key={k} onClick={() => onTab(k)}
          className={claseTabFinanzas(tab === k)}>{l}</button>
      ))}
    </div>
  )
}

function FinanzasPeriodo({ quick, desde, hasta, onQuick, onDesde, onHasta }) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_DAYS.map((days) => (
        <button type="button" key={days} onClick={() => onQuick(days)}
          className="px-3 py-1.5 rounded-lg text-sm transition-all"
          style={estiloQuickPildora(quick === days)}>{QUICK_LABEL[days]}</button>
      ))}
      <input id="finanzas-desde" type="date" aria-label="Desde" value={desde}
        onChange={(e) => onDesde(e.target.value)}
        className={CLASE_FECHA} />
      <input id="finanzas-hasta" type="date" aria-label="Hasta" value={hasta}
        onChange={(e) => onHasta(e.target.value)}
        className={CLASE_FECHA} />
    </div>
  )
}
