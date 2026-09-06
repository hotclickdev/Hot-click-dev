import { Link } from 'react-router-dom'
import { EyeIcon, EyeOffIcon, ImpersonarIcon } from './empresasIcons'
import EstadoEmpresaChips from './EstadoEmpresaChips'
import {
  ESTADO_COLOR,
  PLAN_COLOR,
  nombreVisibleEmpresa,
  tabsDetalle,
  type EmpresaDetalle,
  type EmpresaLista,
  type EmpresaMiembroTab,
  type EmpresaPedidoTab,
  type EmpresaProductoTab,
} from './empresasHelpers'
import TabEquipo from './TabEquipo'
import TabPedidos from './TabPedidos'
import TabProductos, { TabProductosToolbar } from './TabProductos'
import TabResumen from './TabResumen'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { Id } from '@/types/api'

function DetailHeader({
  selected,
  saving,
  impersonarLoading,
  onCambiarEstado,
  onImpersonar,
}: {
  selected: EmpresaLista
  saving: boolean
  impersonarLoading: boolean
  onCambiarEstado: (id: Id, estadoEmpresa: string) => void
  onImpersonar: (id: Id) => void
}) {
  const visible = selected.visibilidadPublica
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-lg truncate" style={{ color: 'var(--hc-text)' }}>
          {nombreVisibleEmpresa(selected)}
        </h1>
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
        <button type="button"
          onClick={() => onImpersonar(selected.id)}
          disabled={impersonarLoading}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
          style={{ color: 'var(--hc-accent)', border: '1px solid var(--hc-border)' }}
        >
          <ImpersonarIcon />
          {impersonarLoading ? 'Ingresando…' : 'Ver como esta empresa'}
        </button>
      </div>
    </div>
  )
}

function DetailTabs({ tab, detail, onTab }: {
  tab: string
  detail: EmpresaDetalle | null
  onTab: (id: string) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid var(--hc-border)' }}>
      {tabsDetalle(detail).filter((t) => t.id !== 'uso').map((t) => (
        <button type="button"
          key={t.id}
          onClick={() => onTab(t.id)}
          className="px-4 py-2.5 text-sm font-medium transition-colors relative shrink-0"
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
  impersonarLoading: boolean
  tab: string
  tabProductos: EmpresaProductoTab[] | null
  tabPedidos: EmpresaPedidoTab[] | null
  tabEquipo: EmpresaMiembroTab[] | null
  tabLoading: boolean
  busquedaProducto: string
  onBusquedaProducto: (valor: string) => void
  onTab: (t: string) => void
  onCambiarPlan: (id: Id, plan: string) => void
  onCambiarEstado: (id: Id, estadoEmpresa: string) => void
  onToggleVisibilidad: (id: Id, visibilidadPublica: boolean) => void
  onImpersonar: (id: Id) => void
  savingProductoId: Id | null
  onToggleVisibilidadProducto: (producto: EmpresaProductoTab) => void
  onEditarProducto: (producto: EmpresaProductoTab) => void
  onNuevoProducto: () => void
  savingPedidoId: Id | null
  onCambiarEstadoPedido: (id: Id, estado: string) => void
  onAsignarGuiaPedido: (id: Id, numeroGuia: string) => void
  savingMiembroId: Id | null
  invitandoMiembro: boolean
  onInvitarMiembro: (datos: { nombre: string; correo: string; telefono: string; rolEnEmpresa: string }) => Promise<boolean>
  onCambiarRolMiembro: (id: Id, rolEnEmpresa: string) => void
  onEliminarMiembro: (id: Id) => void
}

export default function EmpresaDetail({
  selected,
  detail,
  saving,
  impersonarLoading,
  tab,
  tabProductos,
  tabPedidos,
  tabEquipo,
  tabLoading,
  busquedaProducto,
  onBusquedaProducto,
  onTab,
  onCambiarPlan,
  onCambiarEstado,
  onToggleVisibilidad,
  onImpersonar,
  savingProductoId,
  onToggleVisibilidadProducto,
  onEditarProducto,
  onNuevoProducto,
  savingPedidoId,
  onCambiarEstadoPedido,
  onAsignarGuiaPedido,
  savingMiembroId,
  invitandoMiembro,
  onInvitarMiembro,
  onCambiarRolMiembro,
  onEliminarMiembro,
}: EmpresaDetailProps) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-8">
      <Link to="/admin/empresas" className="text-sm font-semibold w-fit" style={{ color: 'var(--hc-accent)' }}>
        <TextoFlecha dir="atras">Volvé a tiendas</TextoFlecha>
      </Link>
      <DetailHeader
        selected={selected}
        saving={saving}
        impersonarLoading={impersonarLoading}
        onCambiarEstado={onCambiarEstado}
        onImpersonar={onImpersonar}
      />
      <DetailTabs tab={tab} detail={detail} onTab={onTab} />

      <div className="space-y-4">
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
          <>
            <TabProductosToolbar
              empresaId={selected.id}
              busqueda={busquedaProducto}
              onBusqueda={onBusquedaProducto}
              onNuevo={onNuevoProducto}
            />
            <TabProductos
              loading={tabLoading}
              productos={tabProductos}
              savingId={savingProductoId}
              busqueda={busquedaProducto}
              onEditar={onEditarProducto}
              onToggleVisibilidad={onToggleVisibilidadProducto}
            />
          </>
        )}
        {tab === 'pedidos' && (
          <TabPedidos
            loading={tabLoading}
            pedidos={tabPedidos}
            savingPedidoId={savingPedidoId}
            onCambiarEstadoPedido={onCambiarEstadoPedido}
            onAsignarGuiaPedido={onAsignarGuiaPedido}
          />
        )}
        {tab === 'equipo' && (
          <TabEquipo
            loading={tabLoading}
            equipo={tabEquipo}
            savingMiembroId={savingMiembroId}
            invitando={invitandoMiembro}
            onInvitarMiembro={onInvitarMiembro}
            onCambiarRolMiembro={onCambiarRolMiembro}
            onEliminarMiembro={onEliminarMiembro}
          />
        )}
      </div>
    </div>
  )
}
