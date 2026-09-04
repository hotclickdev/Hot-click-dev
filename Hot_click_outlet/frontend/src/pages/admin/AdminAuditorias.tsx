import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import TextoFlecha from '@/components/ui/TextoFlecha'
import {
  auditoriaAdminService,
  type AuditoriaAdminEvento,
} from '@/services/auditoriaAdminService'
import { adminService } from '@/services/orderService'
import {
  DIAS_RETENCION_AUDITORIA,
  etiquetaAccion,
  fmtFechaAuditoria,
  listaTipos,
  paginaAuditoria,
} from './auditorias/auditoriasHelpers'

type EmpresaOpt = { id: number; nombre: string }

function nombreEmpresaOpt(raw: Record<string, unknown>): string {
  const comercial = typeof raw.nombreComercial === 'string' ? raw.nombreComercial : ''
  const empresa = typeof raw.nombreEmpresa === 'string' ? raw.nombreEmpresa : ''
  return comercial || empresa || `Empresa #${raw.id ?? '?'}`
}

function opcionesEmpresa(data: unknown): EmpresaOpt[] {
  const payload = data && typeof data === 'object' && 'data' in data
    ? (data as { data: unknown }).data
    : data
  const list = Array.isArray(payload)
    ? payload
    : (payload && typeof payload === 'object' && Array.isArray((payload as { content?: unknown }).content)
      ? (payload as { content: unknown[] }).content
      : [])
  return list.map((e) => {
    const r = e as Record<string, unknown>
    const id = Number(r.id ?? r.idEmpresa)
    return { id, nombre: nombreEmpresaOpt(r) }
  }).filter((e) => Number.isFinite(e.id))
}

/**
 * Auditoría visible — eventos reales de hot_click_auditoria_admin_tb.
 * Solo lectura; retención 90 días.
 */
export default function AdminAuditorias() {
  const toast = useToast()
  const [accion, setAccion] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tipos, setTipos] = useState<string[]>([])
  const [empresas, setEmpresas] = useState<EmpresaOpt[]>([])
  const [filas, setFilas] = useState<AuditoriaAdminEvento[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [diasRetencion, setDiasRetencion] = useState(DIAS_RETENCION_AUDITORIA)

  useEffect(() => {
    auditoriaAdminService.tipos()
      .then(({ data }) => setTipos(listaTipos(data)))
      .catch(() => setTipos([]))
    adminService.getEmpresas()
      .then(({ data }) => setEmpresas(opcionesEmpresa(data)))
      .catch(() => setEmpresas([]))
  }, [])

  const cargar = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await auditoriaAdminService.listar({
        accion: accion || undefined,
        adminEmail: adminEmail.trim() || undefined,
        empresaId: empresaId ? Number(empresaId) : undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page: p,
        size: 20,
      })
      const pagina = paginaAuditoria(data)
      setFilas(pagina.content as AuditoriaAdminEvento[])
      setTotalElements(pagina.totalElements)
      setTotalPages(pagina.totalPages)
      setPage(pagina.page)
      setDiasRetencion(pagina.diasRetencion)
    } catch {
      toast({ message: 'No se pudieron cargar las auditorías', type: 'error' })
      setFilas([])
    } finally {
      setLoading(false)
    }
  }, [accion, adminEmail, empresaId, desde, hasta, toast])

  useEffect(() => {
    cargar(0)
  }, [cargar])

  return (
    <div className="mx-auto max-w-md space-y-4 pb-10 md:max-w-4xl">
      <AdminPageHeader
        titulo="Auditorías"
        subtitulo={`Eventos de plataforma · retención ${diasRetencion} días`}
        atras="/admin/herramientas"
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block text-xs font-semibold text-hc-muted">
          Tipo de evento
          <select
            value={accion}
            onChange={(e) => setAccion(e.target.value)}
            className="mt-1 w-full rounded-xl border border-hc-border bg-hc-surface px-3 py-2 text-sm text-hc-text"
          >
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{etiquetaAccion(t)}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-hc-muted">
          Usuario (email)
          <input
            type="search"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@…"
            className="mt-1 w-full rounded-xl border border-hc-border bg-hc-surface px-3 py-2 text-sm text-hc-text"
          />
        </label>
        <label className="block text-xs font-semibold text-hc-muted">
          Empresa
          <select
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-hc-border bg-hc-surface px-3 py-2 text-sm text-hc-text"
          >
            <option value="">Todas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-hc-muted">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 w-full rounded-xl border border-hc-border bg-hc-surface px-3 py-2 text-sm text-hc-text"
          />
        </label>
        <label className="block text-xs font-semibold text-hc-muted">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 w-full rounded-xl border border-hc-border bg-hc-surface px-3 py-2 text-sm text-hc-text"
          />
        </label>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-hc-muted">Cargando eventos…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-hc-border">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-hc-border text-hc-muted">
                  <th className="px-3 py-2.5 font-semibold">Cuándo</th>
                  <th className="px-3 py-2.5 font-semibold">Quién</th>
                  <th className="px-3 py-2.5 font-semibold">Qué</th>
                  <th className="px-3 py-2.5 font-semibold">Empresa</th>
                  <th className="px-3 py-2.5 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((ev) => (
                  <tr key={ev.id} className="border-b border-hc-border last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-hc-muted">
                      {fmtFechaAuditoria(ev.fecha)}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-hc-text">
                      {ev.adminEmail || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-hc-text">
                      <span className="font-medium">{etiquetaAccion(ev.accion)}</span>
                      <span className="mt-0.5 block text-[10px] text-hc-muted">
                        {ev.entidad}{ev.entidadId != null ? ` #${ev.entidadId}` : ''}
                      </span>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-hc-muted">
                      {ev.empresaNombre || (ev.empresaId != null ? `#${ev.empresaId}` : '—')}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 text-hc-muted" title={ev.detalle ?? ''}>
                      {ev.detalle || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filas.length === 0 && (
              <p className="py-8 text-center text-sm text-hc-muted">Sin eventos en este rango</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-hc-muted">
              {totalElements} evento{totalElements === 1 ? '' : 's'}
              {totalPages > 0 ? ` · pág ${page + 1} de ${totalPages}` : ''}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0 || loading}
                onClick={() => cargar(page - 1)}
                className="rounded-lg border border-hc-border bg-hc-surface px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <TextoFlecha dir="atras">Anterior</TextoFlecha>
              </button>
              <button
                type="button"
                disabled={page >= totalPages - 1 || totalPages === 0 || loading}
                onClick={() => cargar(page + 1)}
                className="rounded-lg border border-hc-border bg-hc-surface px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <TextoFlecha>Siguiente</TextoFlecha>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
