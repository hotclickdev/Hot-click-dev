import { useState, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import type { Id } from '@/types/api'
import {
  COLUMNAS_EXPORT_INGRESOS,
  EMPTY_GASTO,
  QUICK_DAYS,
  envioDePedido,
  filasExportIngresos,
  listaPedidosDesdeRespuesta,
  pedidoEnPeriodo,
  rangoDesdeQuick,
  subtotalDePedido,
  totalDePedido,
  type GastoAdmin,
  type GastoForm,
  type PedidoFinanzas,
  type QuickDays,
} from './finanzas/finanzasHelpers'

type TabFinanzas = 'ingresos' | 'egresos' | 'dashboard'

const TAB_KEYS: [TabFinanzas, string][] = [
  ['ingresos', 'adminFinanzas.tabIngresos'],
  ['egresos', 'adminFinanzas.tabEgresos'],
  ['dashboard', 'adminFinanzas.tabDashboard'],
]

const QUICK_LABEL_KEY: Record<QuickDays, string> = {
  0: 'adminFinanzas.today',
  7: 'adminFinanzas.days7',
  30: 'adminFinanzas.days30',
  [-1]: 'adminFinanzas.all',
}

const CLASE_FECHA = 'h-9 px-3 rounded-xl text-sm text-hc-text focus:outline-none bg-hc-surface border border-hc-border'

function listaGastosDesdeRespuesta(data: unknown): GastoAdmin[] {
  return Array.isArray(data) ? data as GastoAdmin[] : []
}

export default function AdminFinanzas() {
  const { t } = useTranslation()
  const { showToast } = useToast()

  const [tab, setTab] = useState<TabFinanzas>('ingresos')
  const [quick, setQuick] = useState<number>(30)
  const [desde, setDesde] = useState(() => rangoDesdeQuick(30).desde)
  const [hasta, setHasta] = useState(() => rangoDesdeQuick(30).hasta)

  const [pedidos, setPedidos] = useState<PedidoFinanzas[]>([])
  const [loadingP, setLoadingP] = useState(true)

  const [gastos, setGastos] = useState<GastoAdmin[]>([])
  const [loadingG, setLoadingG] = useState(false)
  const [gastoModal, setGastoModal] = useState<GastoForm | null>(null)
  const [deleteGasto, setDeleteGasto] = useState<GastoAdmin | null>(null)

  const [saleDetail, setSaleDetail] = useState<Id | null>(null)

  const applyQuick = (days: number) => {
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
      .catch((err: unknown) => {
        console.error('[AdminFinanzas] ingresos', err)
        if (!cancelado) showToast(t('adminFinanzas.errorLoadIncome'), 'error')
      })
      .finally(() => { if (!cancelado) setLoadingP(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  const loadGastos = () => {
    setLoadingG(true)
    gastoService.listar(desde || undefined, hasta || undefined)
      .then((lista) => setGastos(listaGastosDesdeRespuesta(lista)))
      .catch((err: unknown) => {
        console.error('[AdminFinanzas] gastos', err)
        showToast(t('adminFinanzas.errorLoadExpenses'), 'error')
      })
      .finally(() => setLoadingG(false))
  }

  useEffect(() => {
    if (!tabCargaGastos(tab)) return
    let cancelado = false
    gastoService.listar(desde || undefined, hasta || undefined)
      .then((lista) => { if (!cancelado) setGastos(listaGastosDesdeRespuesta(lista)) })
      .catch((err: unknown) => {
        console.error('[AdminFinanzas] gastos', err)
        if (!cancelado) showToast(t('adminFinanzas.errorLoadExpenses'), 'error')
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

  const marcarRangoManual = (setter: Dispatch<SetStateAction<string>>, valor: string) => {
    setter(valor)
    setQuick(-1)
    if (tabCargaGastos(tab)) setLoadingG(true)
  }

  const handleDeleteGasto = async () => {
    if (!deleteGasto) return
    try {
      await gastoService.eliminar(deleteGasto.id)
      showToast(t('adminFinanzas.expenseDeleted'), 'success')
      setDeleteGasto(null)
      loadGastos()
    } catch (err: unknown) {
      console.error('[AdminFinanzas] eliminar gasto', err)
      showToast(t('adminFinanzas.errorDelete'), 'error')
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
        title={t('adminFinanzas.deleteExpense')}
        message={t('adminFinanzas.deleteExpenseMsg', { concepto: deleteGasto?.concepto ?? '' })}
        confirmLabel={t('adminFinanzas.delete')}
        onConfirm={handleDeleteGasto}
        onClose={() => setDeleteGasto(null)}
      />
    </>
  )
}

function tabCargaGastos(tab: TabFinanzas) {
  return tab === 'egresos' || tab === 'dashboard'
}

function kpisPeriodo(filteredP: PedidoFinanzas[], gastos: GastoAdmin[]) {
  const totalProductos = filteredP.reduce((s, p) => s + subtotalDePedido(p), 0)
  const totalEnvio = filteredP.reduce((s, p) => s + Number(envioDePedido(p)), 0)
  const totalIngresos = filteredP.reduce((s, p) => s + totalDePedido(p), 0)
  const totalEgresos = gastos.reduce((s, g) => s + Number(g.monto ?? 0), 0)
  return { totalProductos, totalEnvio, totalIngresos, totalEgresos, utilidadNeta: totalIngresos - totalEgresos }
}

function agruparPorOrigen(filteredP: PedidoFinanzas[]) {
  const acc: Record<string, number> = { ONLINE: 0, POS: 0, MANUAL: 0 }
  filteredP.forEach((p) => {
    const o = p.origen ?? 'ONLINE'
    acc[o] = (acc[o] ?? 0) + totalDePedido(p)
  })
  return acc
}

function agruparPorMetodo(filteredP: PedidoFinanzas[]) {
  const acc: Record<string, number> = {}
  filteredP.forEach((p) => {
    const m = p.metodoPago ?? 'OTRO'
    acc[m] = (acc[m] ?? 0) + totalDePedido(p)
  })
  return Object.entries(acc).sort((a, b) => b[1] - a[1])
}

function agruparPorCategoria(gastos: GastoAdmin[]) {
  const acc: Record<string, number> = {}
  gastos.forEach((g) => {
    const c = g.categoria ?? 'OTRO'
    acc[c] = (acc[c] ?? 0) + Number(g.monto)
  })
  return Object.entries(acc).sort((a, b) => b[1] - a[1])
}

function claseTabFinanzas(activa: boolean) {
  const base = 'px-4 py-1.5 rounded-lg text-xs font-medium transition-all '
  if (activa) return `${base}bg-hc-primary text-white`
  return `${base}text-hc-muted hover:text-hc-text`
}

function estiloQuickPildora(activa: boolean) {
  if (activa) {
    return {
      backgroundColor: 'var(--hc-primary)',
      color: 'white',
      border: '1px solid color-mix(in srgb,var(--hc-primary) 40%,transparent)',
    }
  }
  return {
    backgroundColor: 'color-mix(in srgb,var(--hc-text) 5%,transparent)',
    color: 'var(--hc-muted)',
    border: '1px solid var(--hc-border)',
  }
}

function FinanzasCabecera({ tab, filteredP, onNuevoGasto }: {
  tab: TabFinanzas
  filteredP: PedidoFinanzas[]
  onNuevoGasto: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-hc-text">{t('adminFinanzas.title')}</h1>
        <p className="text-sm text-hc-muted mt-1">{t('adminFinanzas.subtitleFlow')}</p>
        <Link to="/admin/finanzas/reporte-contador"
          className="inline-block text-xs text-hc-link hover:underline mt-1">
          <TextoFlecha>{t('adminFinanzas.linkContador')}</TextoFlecha>
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
          <TextoMas>{t('adminFinanzas.newExpense')}</TextoMas>
        </button>
      )}
    </div>
  )
}

function FinanzasTabs({ tab, onTab }: { tab: TabFinanzas; onTab: (k: TabFinanzas) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-1 bg-hc-surface-2 border border-hc-border rounded-xl p-1 w-fit">
      {TAB_KEYS.map(([k, key]) => (
        <button type="button" key={k} onClick={() => onTab(k)}
          className={claseTabFinanzas(tab === k)}>{t(key)}</button>
      ))}
    </div>
  )
}

function FinanzasPeriodo({ quick, desde, hasta, onQuick, onDesde, onHasta }: {
  quick: number
  desde: string
  hasta: string
  onQuick: (days: number) => void
  onDesde: (v: string) => void
  onHasta: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_DAYS.map((days) => (
        <button type="button" key={days} onClick={() => onQuick(days)}
          className="px-3 py-1.5 rounded-lg text-sm transition-all"
          style={estiloQuickPildora(quick === days)}>{t(QUICK_LABEL_KEY[days])}</button>
      ))}
      <input id="finanzas-desde" type="date" aria-label={t('adminFinanzas.from')} value={desde}
        onChange={(e) => onDesde(e.target.value)}
        className={CLASE_FECHA} />
      <input id="finanzas-hasta" type="date" aria-label={t('adminFinanzas.to')} value={hasta}
        onChange={(e) => onHasta(e.target.value)}
        className={CLASE_FECHA} />
    </div>
  )
}
