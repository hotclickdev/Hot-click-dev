import { CloseIcon, EyeIcon, EyeOffIcon } from './empresasIcons'
import EstadoEmpresaChips from './EstadoEmpresaChips'
import { ESTADO_COLOR, PLAN_COLOR, nombreVisibleEmpresa, tabsDetalle, type EmpresaDetalle, type EmpresaLista, type EmpresaMiembroTab, type EmpresaPedidoTab, type EmpresaProductoTab } from './empresasHelpers'
import TabEquipo from './TabEquipo'
import TabPedidos from './TabPedidos'
import TabProductos from './TabProductos'
import TabResumen from './TabResumen'
import type { Id } from '@/types/api'

function DetailHeader({
  selected,
  saving,
  onClose,
  onCambiarEstado,
}: {
  selected: EmpresaLista
  saving: boolean
  onClose: () => void
  onCambiarEstado: (id: Id, estadoEmpresa: string) => void
}) {
  const visible = selected.visibilidadPublica
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h2 className="font-bold text-lg truncate" style={{ color: 'var(--hc-text)' }}>
          {nombreVisibleEmpresa(selected)}
        </h2>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>{selected.slug}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLOR[selected.plan as string] ?? ''}`}>{selected.plan || 'Sin plan'}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR[selected.estadoEmpresa as string] ?? ''}`}>{selected.estadoEmpresa}</span>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${visible ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
            {visible ? <><EyeIcon /> Visible</> : <><EyeOffIcon /> Oculto</>}
          </span>
        </div>
        <div className="mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--hc-muted)' }}>Estado del negocio</p>
          <EstadoEmpresaChips selected={selected} saving={saving} onCambiarEstado={onCambiarEstado} />
        </div>
      </div>
      <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hc-surface-2)] shrink-0" style={{ color: 'var(--hc-muted)' }}>
        <CloseIcon />
      </button>
    </div>
  )
}

function DetailTabs({ tab, detail, onTab }: {
  tab: string
  detail: EmpresaDetalle | null
  onTab: (id: string) => void
}) {
  return (
    <div className="flex gap-1" style={{ borderBottom: '1px solid var(--hc-border)' }}>
      {tabsDetalle(detail).map((t) => (
        <button type="button"
          key={t.id}
          onClick={() => onTab(t.id)}
          className="px-4 py-2.5 text-sm font-medium transition-colors relative"
          style={{
            color: tab === t.id ? 'var(--hc-accent)' : 'var(--hc-muted)',
            borderBottom: tab === t.id ? '2px solid var(--hc-accent)' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export type EmpresaDetailProps = {
  selected: EmpresaLista
  detail: EmpresaDetalle | null
  saving: boolean
  tab: string
  tabProductos: EmpresaProductoTab[] | null
  tabPedidos: EmpresaPedidoTab[] | null
  tabEquipo: EmpresaMiembroTab[] | null
  tabLoading: boolean
  onClose: () => void
  onTab: (t: string) => void
  onCambiarPlan: (id: Id, plan: string) => void
  onCambiarEstado: (id: Id, estadoEmpresa: string) => void
  onToggleVisibilidad: (id: Id, visibilidadPublica: boolean) => void
  savingProductoId: Id | null
  onToggleVisibilidadProducto: (producto: EmpresaProductoTab) => void
}

export default function EmpresaDetail({
  selected,
  detail,
  saving,
  tab,
  tabProductos,
  tabPedidos,
  tabEquipo,
  tabLoading,
  onClose,
  onTab,
  onCambiarPlan,
  onCambiarEstado,
  onToggleVisibilidad,
  savingProductoId,
  onToggleVisibilidadProducto,
}: EmpresaDetailProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl flex flex-col" style={{ backgroundColor: 'var(--hc-surface)', borderLeft: '1px solid var(--hc-border)' }}>
        <div className="px-5 pt-5 pb-0 shrink-0">
          <DetailHeader
            selected={selected}
            saving={saving}
            onClose={onClose}
            onCambiarEstado={onCambiarEstado}
          />
          <DetailTabs tab={tab} detail={detail} onTab={onTab} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'resumen' && (
            <TabResumen
              selected={selected}
              detail={detail}
              saving={saving}
              onToggleVisibilidad={onToggleVisibilidad}
              onCambiarPlan={onCambiarPlan}
              onCambiarEstado={onCambiarEstado}
            />
          )}
          {tab === 'productos' && (
            <TabProductos
              loading={tabLoading}
              productos={tabProductos}
              savingId={savingProductoId}
              onToggleVisibilidad={onToggleVisibilidadProducto}
            />
          )}
          {tab === 'pedidos' && <TabPedidos loading={tabLoading} pedidos={tabPedidos} />}
          {tab === 'equipo' && <TabEquipo loading={tabLoading} equipo={tabEquipo} />}
        </div>
      </div>
    </div>
  )
}
