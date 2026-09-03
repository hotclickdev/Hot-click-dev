import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { listaDesdeRespuesta } from './aprobaciones/aprobacionesHelpers'
import { MOTIVOS_REPORTE, reporteProductoService, type ReporteProductoItem } from '@/services/moderacionService'
import type { Id } from '@/types/api'

function etiquetaMotivo(motivo?: string): string {
  return MOTIVOS_REPORTE.find((m) => m.id === motivo)?.label ?? motivo ?? '—'
}

export default function AdminReportesProducto() {
  const toast = useToast()
  const [items, setItems] = useState<ReporteProductoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<Id | null>(null)
  const [notas, setNotas] = useState('')
  const [pausarProducto, setPausarProducto] = useState(false)

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await reporteProductoService.listarPendientes()
      setItems(listaDesdeRespuesta<ReporteProductoItem>(data))
    } catch {
      toast({ message: 'No se pudieron cargar los reportes', type: 'error' })
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje
  }, [])

  async function resolver(id: Id, estado: 'RESUELTO' | 'DESCARTADO') {
    setBusyId(id)
    try {
      await reporteProductoService.resolver(
        id,
        estado,
        notas.trim() || undefined,
        estado === 'RESUELTO' && pausarProducto,
      )
      toast({
        message: estado === 'RESUELTO'
          ? (pausarProducto ? 'Resuelto y producto pausado' : 'Reporte marcado como resuelto')
          : 'Reporte descartado',
        type: 'success',
      })
      setNotas('')
      setPausarProducto(false)
      await cargar()
    } catch {
      toast({ message: 'No se pudo actualizar el reporte', type: 'error' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 pb-8 md:max-w-3xl">
      <div>
        <Link to="/admin/aprobaciones" className="text-sm font-semibold text-hc-accent">Volvé a Moderación</Link>
        <h1 className="mt-2 font-display text-[22px] font-bold text-hc-text">Productos reportados</h1>
        <p className="mt-0.5 text-xs text-hc-muted">
          Reportes de clientes. Pausar oculta del catálogo; no es rechazo del negocio ni revisión de alta.
        </p>
      </div>

      <label className="block text-xs font-semibold text-hc-muted">
        Notas (se envían al vendedor si resolvés o pausás)
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border border-hc-border bg-hc-surface px-3 py-2 text-sm text-hc-text"
        />
      </label>

      <label className="flex items-start gap-2 text-sm text-hc-text min-h-11">
        <input
          type="checkbox"
          checked={pausarProducto}
          onChange={(e) => setPausarProducto(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-semibold">Pausar producto al resolver</span>
          <span className="block text-xs text-hc-muted">
            Misma acción que Pausar en Empresas (`visibleCatalogo`). No es cola de revisión.
          </span>
        </span>
      </label>

      {loading ? (
        <p className="text-sm text-hc-muted py-8 text-center">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-hc-muted py-8 text-center">No hay reportes pendientes.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((r) => (
            <li key={String(r.id)} className="rounded-[14px] border border-hc-border p-3.5 space-y-3">
              <div className="flex gap-3">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-hc-surface-2">
                  {r.imagenUrl ? <img src={r.imagenUrl} alt="" className="size-full object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-hc-text">{r.productoNombre ?? `Producto #${r.productoId}`}</p>
                  <p className="text-[11px] text-hc-muted">{etiquetaMotivo(r.motivo)}</p>
                  {r.detalle && <p className="mt-1 text-xs text-hc-text">{r.detalle}</p>}
                  <p className="mt-1 text-[11px] text-hc-muted">{r.usuarioNombre || r.usuarioCorreo || 'Anónimo'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  to={r.productoId ? `/productos/${r.productoId}` : '/admin/aprobaciones'}
                  className="min-h-11 flex-1 inline-flex items-center justify-center rounded-xl border border-hc-border text-sm font-bold"
                >
                  Ver producto
                </Link>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => resolver(r.id, 'RESUELTO')}
                  className="min-h-11 flex-1 rounded-xl bg-hc-primary text-white text-sm font-bold disabled:opacity-50"
                >
                  Resuelto
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => resolver(r.id, 'DESCARTADO')}
                  className="min-h-11 flex-1 rounded-xl border border-hc-border text-sm font-bold disabled:opacity-50"
                >
                  Descartar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
