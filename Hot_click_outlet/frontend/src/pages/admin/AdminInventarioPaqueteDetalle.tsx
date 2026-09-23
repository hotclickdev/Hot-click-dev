import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import LineaEditForm from '@/components/inventario/LineaEditForm'
import {
  inventarioPaqueteService,
  type LineaRequest,
  type PaqueteInventario,
} from '@/services/inventarioPaqueteService'
import { adminService } from '@/services/orderService'
import { exportExcel, parseFile } from '@/utils/importExport'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import { useToast } from '@/components/ui/Toast'
import { listaEmpresasDesdeRespuesta, type EmpresaLista } from './empresas/empresasHelpers'
import type { Id } from '@/types/api'

function toastApiError(e: unknown, fallback: string): string {
  return mensajeErrorApi(e, fallback)
}

const COLS_EXPORT = [
  'barcode', 'sku', 'nombre', 'precio_compra', 'precio_venta',
  'stock', 'marca', 'categoria', 'descripcion',
]

/** Detalle tablet: asignar empresa, export/import Excel, ver conflictos. */
export default function AdminInventarioPaqueteDetalle() {
  const { id } = useParams()
  const toast = useToast()
  const paqueteId = id ? Number(id) : NaN
  const [paquete, setPaquete] = useState<PaqueteInventario | null>(null)
  const [empresas, setEmpresas] = useState<EmpresaLista[]>([])
  const [empresaId, setEmpresaId] = useState<Id | ''>('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<{ ok: number; errores: string[] } | null>(null)
  const [pendingImport, setPendingImport] = useState<LineaRequest[] | null>(null)
  const [editingLineaId, setEditingLineaId] = useState<Id | null>(null)

  const cargar = useCallback(async () => {
    if (!Number.isFinite(paqueteId)) return
    const { data } = await inventarioPaqueteService.obtener(paqueteId)
    setPaquete(data)
    if (data.empresaId) setEmpresaId(data.empresaId)
  }, [paqueteId])

  useEffect(() => {
    void cargar().catch((e) => toast({ message: toastApiError(e, 'No se pudo cargar'), type: 'error' }))
  }, [cargar, toast])

  useEffect(() => {
    adminService.getEmpresas()
      .then((res) => setEmpresas(listaEmpresasDesdeRespuesta(res.data)))
      .catch(() => undefined)
  }, [])

  function exportar() {
    if (!paquete?.lineas?.length) {
      toast({ message: 'No hay líneas para exportar', type: 'error' })
      return
    }
    const rows = paquete.lineas.map((l) => ({
      barcode: l.barcode ?? '',
      sku: l.sku ?? '',
      nombre: l.nombre,
      precio_compra: l.precioCompra,
      precio_venta: l.precioVenta,
      stock: l.stock,
      marca: l.marcaTexto ?? '',
      categoria: l.categoriaTexto ?? '',
      descripcion: '',
    }))
    exportExcel(rows, `paquete-${paquete.codigo}`, COLS_EXPORT, 'Paquete')
  }

  function descargarPlantilla() {
    const filaVacia = Object.fromEntries(COLS_EXPORT.map((c) => [c, '']))
    exportExcel([filaVacia], 'plantilla-paquete-inventario', COLS_EXPORT, 'Plantilla')
  }

  async function onImportFile(file: File) {
    try {
      const rows = await parseFile(file)
      const lineas: LineaRequest[] = rows.map((r) => ({
        barcode: String(r.barcode ?? r.Barcode ?? '').trim() || null,
        sku: String(r.sku ?? '').trim() || null,
        nombre: String(r.nombre ?? r.Nombre ?? '').trim(),
        precioCompra: Number(r.precio_compra ?? r.precioCompra ?? 0) || 0,
        precioVenta: Number(r.precio_venta ?? r.precioVenta ?? 1) || 1,
        stock: Number(r.stock ?? 0) || 0,
        marcaTexto: String(r.marca ?? '').trim() || null,
        categoriaTexto: String(r.categoria ?? '').trim() || null,
      })).filter((l) => l.nombre)

      const { data } = await inventarioPaqueteService.importarPreview(paqueteId, lineas)
      setPreview({ ok: data.validas ?? 0, errores: data.errores ?? [] })
      setPendingImport(lineas)
      toast({ message: `Preview: ${data.validas ?? 0} válidas, ${data.errores?.length ?? 0} con error`, type: 'info' })
    } catch (e: unknown) {
      toast({ message: toastApiError(e, 'Error leyendo archivo'), type: 'error' })
    }
  }

  async function confirmarImport() {
    if (!pendingImport) return
    setBusy(true)
    try {
      await inventarioPaqueteService.importarConfirmar(paqueteId, pendingImport)
      toast({ message: 'Importación aplicada', type: 'success' })
      setPreview(null)
      setPendingImport(null)
      await cargar()
    } catch (e: unknown) {
      toast({ message: toastApiError(e, 'Error al importar'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function reabrir() {
    setBusy(true)
    try {
      await inventarioPaqueteService.reabrir(paqueteId)
      toast({ message: 'Paquete reabierto', type: 'success' })
      await cargar()
    } catch (e: unknown) {
      toast({ message: toastApiError(e, 'No se pudo reabrir'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function asignar() {
    if (!empresaId) {
      toast({ message: 'Elegí una empresa', type: 'error' })
      return
    }
    setBusy(true)
    try {
      if (paquete?.estado === 'ABIERTO') {
        await inventarioPaqueteService.cerrar(paqueteId)
      }
      await inventarioPaqueteService.asignar(paqueteId, empresaId)
      toast({ message: 'Productos asignados al negocio', type: 'success' })
      await cargar()
    } catch (e: unknown) {
      toast({ message: toastApiError(e, 'Error al asignar'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function guardarLinea(lineaId: Id, body: LineaRequest) {
    setBusy(true)
    try {
      await inventarioPaqueteService.actualizarLinea(paqueteId, lineaId, body)
      toast({ message: 'Línea actualizada', type: 'success' })
      setEditingLineaId(null)
      await cargar()
    } catch (e: unknown) {
      toast({ message: toastApiError(e, 'No se pudo guardar'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function borrarLinea(lineaId: Id) {
    if (paquete?.estado !== 'ABIERTO') return
    setBusy(true)
    try {
      await inventarioPaqueteService.eliminarLinea(paqueteId, lineaId)
      toast({ message: 'Línea eliminada', type: 'success' })
      if (editingLineaId === lineaId) setEditingLineaId(null)
      await cargar()
    } catch (e: unknown) {
      toast({ message: toastApiError(e, 'No se pudo eliminar'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  if (!paquete) {
    return <p className="p-6 text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</p>
  }

  const sinLineas = !(paquete.lineas?.length) || paquete.totalLineas === 0

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link to="/admin/inventario/paquetes" className="text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>
            ← Paquetes
          </Link>
          <h1 className="text-2xl font-black font-mono" style={{ color: 'var(--hc-text)' }}>{paquete.codigo}</h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {paquete.estado} · {paquete.empresaNombre ?? paquete.nombreNegocioTemporal ?? 'Sin negocio'} · {paquete.totalLineas} ítems
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {paquete.estado === 'CERRADO' && (
            <button type="button" onClick={() => void reabrir()} disabled={busy}
              className="rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
              {busy ? 'Reabriendo…' : 'Reabrir'}
            </button>
          )}
          <button type="button" onClick={exportar}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            Exportar Excel
          </button>
          <button type="button" onClick={descargarPlantilla}
            className="rounded-xl px-3 py-2 text-sm font-semibold"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            Plantilla Excel
          </button>
          <label className="rounded-xl px-3 py-2 text-sm font-semibold cursor-pointer"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            Importar Excel
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImportFile(f) }} />
          </label>
        </div>
      </div>

      {paquete.estado !== 'ASIGNADO' && (
        <div className="rounded-2xl p-4 flex flex-wrap items-end gap-3"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--hc-muted)' }}>Asignar a empresa</label>
            <select value={String(empresaId)} onChange={(e) => setEmpresaId(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
              <option value="">Elegí negocio…</option>
              {empresas.map((e) => (
                <option key={String(e.id)} value={String(e.id)}>
                  {e.nombreEmpresa ?? `Empresa ${e.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-start gap-1">
            <button type="button" onClick={asignar} disabled={busy || sinLineas}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--hc-accent)' }}>
              {busy ? 'Asignando…' : 'Asignar y crear productos'}
            </button>
            {sinLineas && (
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                Agregá al menos una línea al paquete antes de asignar.
              </p>
            )}
          </div>
        </div>
      )}

      {preview && (
        <div className="rounded-2xl p-4 space-y-2"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
            Preview import: {preview.ok} válidas
          </p>
          {(preview.errores ?? []).slice(0, 5).map((err) => (
            <p key={err} className="text-xs" style={{ color: '#f87171' }}>{err}</p>
          ))}
          <button type="button" onClick={confirmarImport}
            disabled={busy || (preview.errores?.length ?? 0) > 0}
            className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--hc-accent)' }}>
            Confirmar importación
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {(paquete.lineas ?? []).map((l) => (
          <li key={String(l.id)} className="rounded-xl px-4 py-3 flex justify-between gap-3"
            style={{
              backgroundColor: 'var(--hc-surface)',
              border: `1px solid ${l.estado === 'CONFLICTO' ? '#f87171' : 'var(--hc-border)'}`,
            }}>
            {paquete.estado === 'ABIERTO' && editingLineaId === l.id ? (
              <LineaEditForm
                linea={l}
                busy={busy}
                onSave={(body) => guardarLinea(l.id, body)}
                onCancel={() => setEditingLineaId(null)}
              />
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{l.nombre}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--hc-muted)' }}>
                    {l.barcode ?? 'sin BC'} · stock {l.stock} · ₡{l.precioVenta} · {l.estado}
                  </p>
                  {l.notasConflicto && (
                    <p className="text-xs mt-1" style={{ color: '#f87171' }}>{l.notasConflicto}</p>
                  )}
                </div>
                <div className="flex items-start gap-2 shrink-0">
                  {l.imagenUrl && (
                    <img src={l.imagenUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  {paquete.estado === 'ABIERTO' && (
                    <>
                      <button type="button" onClick={() => setEditingLineaId(l.id)} disabled={busy}
                        className="text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-accent)' }}>
                        Editar
                      </button>
                      <button type="button" onClick={() => void borrarLinea(l.id)} disabled={busy}
                        className="text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ border: '1px solid var(--hc-border)', color: '#f87171' }}>
                        Borrar
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
