import { useState, useEffect } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { productService } from '@/services/productService'
import { orderService, adminService } from '@/services/orderService'
import {
  F, Block, FormGroup, StyledInput, SectionHeader, DownloadIcon, TrashLiteIcon,
  PercentIcon, ZapIcon, BoxIcon, ShoppingIcon, UserIcon, date, mensajeErrorConfig,
} from './configUi'

type ToastFn = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void
type IconoCfg = ComponentType<SVGProps<SVGSVGElement>>
type DatosStats = { productos: number | string; pedidos: number | string; clientes: string }
type FilaCsv = Record<string, unknown>

function StatCard({ label, value, color, icon: Icon, loadingStats }: {
  label: string
  value?: number | string
  color: string
  icon: IconoCfg
  loadingStats: boolean
}) {
  return (
    <div style={{ padding: '16px', borderRadius: '12px', background: `color-mix(in srgb, ${color} 6%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 15%, transparent)`, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `color-mix(in srgb, ${color} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: '16px', height: '16px', color }} />
      </div>
      <div>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: '2px 0 0', lineHeight: 1 }}>
          {loadingStats ? '…' : value}
        </p>
      </div>
    </div>
  )
}

function ExportRow({ label, desc, loading, onExport, color }: {
  label: string
  desc: string
  loading: boolean
  onExport: () => void
  color: string
}) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body }}>{desc}</p>
      </div>
      <button type="button" onClick={onExport} disabled={loading} className="cfg-btn"
        style={{ flexShrink: 0, padding: '7px 14px', fontSize: '12px', fontWeight: 600, background: `color-mix(in srgb, ${color} 9%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 21%, transparent)`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, gap: '6px' }}>
        {loading ? <Spinner size={'xs' as 'sm'} /> : <DownloadIcon style={{ width: '13px', height: '13px' }} />}
        {t('adminConfig.datosExportBtn')}
      </button>
    </div>
  )
}

function CleanRow({ label, desc, loading, onAction, btnLabel }: {
  label: string
  desc: string
  loading: boolean
  onAction: () => void
  btnLabel: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body }}>{desc}</p>
      </div>
      <button type="button" onClick={onAction} disabled={loading} className="cfg-btn cfg-btn-danger" style={{ flexShrink: 0, fontSize: '12px', padding: '7px 14px' }}>
        {loading ? <Spinner size={'xs' as 'sm'} /> : <TrashLiteIcon style={{ width: '13px', height: '13px' }} />}
        {btnLabel}
      </button>
    </div>
  )
}

export default function SeccionDatos({ toast, isEmprendedor = false }: { toast: ToastFn; isEmprendedor?: boolean }) {
  const { t } = useTranslation()
  const [stats, setStats]   = useState<DatosStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [expProd, setExpProd]   = useState(false)
  const [expOrd,  setExpOrd]    = useState(false)
  const [expCli,  setExpCli]    = useState(false)

  const [cleanCancelled, setCleanCancelled] = useState(false)
  const [cleanInactive,  setCleanInactive]  = useState(false)

  const [pct,        setPct]        = useState('')
  const [applyingPct, setApplyingPct] = useState(false)

  useEffect(() => {
    // EMPRENDEDOR usa /admin/todos para productos de su empresa; ADMIN usa el catálogo global
    Promise.allSettled([
      isEmprendedor ? productService.adminGetAll(0, 1) : productService.getAll(0, 1),
      orderService.getAll(),
    ]).then(([p, o]) => {
      const totalProd = p.status === 'fulfilled' ? totalProductosDesde(p.value.data) : '—'
      const totalOrd  = o.status === 'fulfilled' ? totalPedidosDesde(o.value.data) : '—'
      setStats({ productos: totalProd, pedidos: totalOrd, clientes: '—' })
    }).finally(() => setLoadingStats(false))
  }, [isEmprendedor])

  const downloadCSV = (rows: FilaCsv[], filename: string) => {
    if (!rows.length) { toast({ message: 'Sin datos para exportar', type: 'error' }); return }
    const keys   = Object.keys(rows[0])
    const header = keys.join(',')
    const body   = rows.map(r => keys.map(k => {
      const v = String(r[k] ?? '').replaceAll('"', '""')
      return v.includes(',') || v.includes('\n') || v.includes('"') ? `"${v}"` : v
    }).join(','))
    const blob = new Blob(['﻿' + [header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: filename }).click()
    URL.revokeObjectURL(url)
  }

  const exportProductos = async () => {
    setExpProd(true)
    try {
      // EMPRENDEDOR: solo sus productos; ADMIN: todos
      const { data } = await (isEmprendedor ? productService.adminGetAll(0, 9999) : productService.getAll(0, 9999))
      const list = ((data as { data?: { content?: FilaCsv[] }; content?: FilaCsv[] })?.data?.content
        ?? (data as { content?: FilaCsv[] })?.content
        ?? (data as { data?: FilaCsv[] })?.data
        ?? []) as FilaCsv[]
      downloadCSV(list.map(p => ({ id: p.id, nombre: p.nombreProducto ?? p.nombre, precio: p.precioVenta ?? p.precio, stock: p.stockActual ?? p.stock, descripcion: p.descripcionCorta ?? p.descripcion ?? '', activo: p.estado === 1 })), `productos-${date()}.csv`)
      toast({ message: t('adminConfig.datosExportOk'), type: 'success' })
    } catch { toast({ message: t('adminConfig.datosExportError'), type: 'error' }) }
    finally { setExpProd(false) }
  }

  const exportPedidos = async () => {
    setExpOrd(true)
    try {
      const { data } = await orderService.getAll()
      const list = ((data as { data?: FilaCsv[] })?.data ?? data ?? []) as FilaCsv[]
      downloadCSV(list.map(p => ({ id: p.id, cliente: p.nombreCliente ?? '', email: p.emailCliente ?? '', estado: p.estado, total: p.total, fecha: p.fechaCreacion ?? '' })), `pedidos-${date()}.csv`)
      toast({ message: t('adminConfig.datosExportOk'), type: 'success' })
    } catch { toast({ message: t('adminConfig.datosExportError'), type: 'error' }) }
    finally { setExpOrd(false) }
  }

  const exportClientes = async () => {
    setExpCli(true)
    try {
      const { data } = await adminService.getUsers()
      const list = ((data as { data?: FilaCsv[] })?.data ?? data ?? []) as FilaCsv[]
      downloadCSV(list.map(u => ({ id: u.id, nombre: `${u.nombre ?? ''} ${u.apellidoPaterno ?? ''}`.trim(), email: u.email, telefono: u.telefono ?? '', rol: u.rol })), `clientes-${date()}.csv`)
      toast({ message: t('adminConfig.datosExportOk'), type: 'success' })
    } catch { toast({ message: t('adminConfig.datosExportError'), type: 'error' }) }
    finally { setExpCli(false) }
  }

  const eliminarCancelados = async () => {
    if (!confirm('¿Eliminar todos los pedidos CANCELADOS del historial? Esta acción no se puede deshacer.')) return
    setCleanCancelled(true)
    try {
      await adminService.borrarPedidosCancelados()
      toast({ message: t('adminConfig.datosCleanOk'), type: 'success' })
    } catch (err: unknown) { toast({ message: mensajeErrorConfig(err, t('adminConfig.datosCleanError')), type: 'error' }) }
    finally { setCleanCancelled(false) }
  }

  const archivarSinStock = async () => {
    if (!confirm('¿Desactivar todos los productos con stock = 0? Se pueden reactivar individualmente.')) return
    setCleanInactive(true)
    try {
      await productService.archivarSinStock()
      toast({ message: t('adminConfig.datosCleanOk'), type: 'success' })
    } catch (err: unknown) { toast({ message: mensajeErrorConfig(err, t('adminConfig.datosCleanError')), type: 'error' }) }
    finally { setCleanInactive(false) }
  }

  const aplicarAjustePrecio = async () => {
    const num = Number.parseFloat(pct)
    if (Number.isNaN(num) || num === 0) { toast({ message: 'Ingresá un porcentaje válido (ej: 10 o -5)', type: 'error' }); return }
    if (!confirm(`¿Aplicar ${num > 0 ? '+' : ''}${num}% a todos los precios activos?`)) return
    setApplyingPct(true)
    try {
      await productService.ajustarPrecios(num)
      toast({ message: t('adminConfig.datosBulkOk'), type: 'success' })
      setPct('')
    } catch (err: unknown) { toast({ message: mensajeErrorConfig(err, t('adminConfig.datosBulkError')), type: 'error' }) }
    finally { setApplyingPct(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.datosTitle')} desc={t('adminConfig.datosDesc')} />

      {/* Stats */}
      <div className={`grid gap-3 ${isEmprendedor ? 'grid-cols-2' : 'grid-cols-3'}`}>
        <StatCard label={t('adminConfig.datosStatsProducts')} value={stats?.productos} color="var(--hc-accent)" icon={BoxIcon} loadingStats={loadingStats} />
        <StatCard label={t('adminConfig.datosStatsOrders')}   value={stats?.pedidos}   color="#22c55e" icon={ShoppingIcon} loadingStats={loadingStats} />
        {!isEmprendedor && <StatCard label={t('adminConfig.datosStatsClients')} value={stats?.clientes} color="var(--hc-blue-300)" icon={UserIcon} loadingStats={loadingStats} />}
      </div>

      {/* Export */}
      <Block label={t('adminConfig.datosExportTitle')} sublabel={t('adminConfig.datosExportDesc')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ExportRow label={t('adminConfig.datosExportProductsLabel')} desc={t('adminConfig.datosExportProductsDesc')} loading={expProd} onExport={exportProductos} color="var(--hc-accent)" />
          <hr className="cfg-divider" />
          <ExportRow label={t('adminConfig.datosExportOrdersLabel')}   desc={t('adminConfig.datosExportOrdersDesc')}   loading={expOrd}  onExport={exportPedidos}  color="#22c55e" />
          {!isEmprendedor && <>
            <hr className="cfg-divider" />
            <ExportRow label={t('adminConfig.datosExportClientsLabel')} desc={t('adminConfig.datosExportClientsDesc')} loading={expCli} onExport={exportClientes} color="var(--hc-blue-300)" />
          </>}
        </div>
      </Block>

      {/* Bulk price — solo ADMIN, afecta precios de toda la tienda */}
      {!isEmprendedor && (
      <Block label={t('adminConfig.datosBulkTitle')} sublabel={t('adminConfig.datosBulkDesc')}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <FormGroup label="Porcentaje (+ subir / − bajar)">
              <div style={{ position: 'relative' }}>
                <PercentIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--hc-muted)', pointerEvents: 'none' }} />
                <StyledInput type="number" value={pct} onChange={e => setPct(e.target.value)} placeholder={t('adminConfig.datosBulkPh')} style={{ paddingRight: '36px' }} />
              </div>
            </FormGroup>
          </div>
          <button type="button" onClick={aplicarAjustePrecio} disabled={applyingPct || !pct} className="cfg-btn cfg-btn-primary" style={{ marginBottom: '1px', opacity: (!pct || applyingPct) ? 0.5 : 1 }}>
            {applyingPct ? <Spinner size={'xs' as 'sm'} /> : <ZapIcon style={{ width: '14px', height: '14px' }} />}
            {t('adminConfig.datosBulkBtn')}
          </button>
        </div>
        {pct && !Number.isNaN(Number.parseFloat(pct)) && (
          <p style={{ fontSize: '12px', color: Number.parseFloat(pct) >= 0 ? '#4ade80' : '#f87171', marginTop: '8px', fontFamily: F.body }}>
            {Number.parseFloat(pct) >= 0 ? '↑' : '↓'} Todos los precios {Number.parseFloat(pct) >= 0 ? 'subirán' : 'bajarán'} un {Math.abs(Number.parseFloat(pct))}%
          </p>
        )}
      </Block>
      )}

      {/* Cleanup */}
      <Block label={t('adminConfig.datosCleanTitle')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {!isEmprendedor && <>
            <CleanRow label={t('adminConfig.datosCleanCancelledLabel')} desc={t('adminConfig.datosCleanCancelledDesc')} loading={cleanCancelled} onAction={eliminarCancelados} btnLabel={t('adminConfig.datosCleanCancelledBtn')} />
            <hr className="cfg-divider" />
          </>}
          <CleanRow label={t('adminConfig.datosCleanInactiveLabel')} desc={t('adminConfig.datosCleanInactiveDesc')} loading={cleanInactive} onAction={archivarSinStock} btnLabel={t('adminConfig.datosCleanInactiveBtn')} />
        </div>
      </Block>
    </div>
  )
}

function totalProductosDesde(data: unknown) {
  const d = data as { data?: { totalElements?: number }; totalElements?: number } | undefined
  return d?.data?.totalElements ?? d?.totalElements ?? '—'
}

function totalPedidosDesde(data: unknown) {
  const d = data as { data?: unknown[] } | unknown[] | undefined
  if (Array.isArray((d as { data?: unknown[] })?.data)) return ((d as { data: unknown[] }).data).length
  if (Array.isArray(d)) return d.length
  return '—'
}
