import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import AdminLayout from '@/layouts/AdminLayout'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import { formatPrice } from '@/utils/format'
import {
  encargoService,
  listaEncargosDesdeRespuesta,
  type Encargo,
} from '@/services/encargoService'
import { useToast } from '@/components/ui/Toast'

const FILTROS = ['TODOS', 'PENDIENTE', 'APROBADO', 'PENDIENTE_PAGO', 'PAGADO', 'RECHAZADO', 'VENCIDO'] as const

export default function AdminEncargos() {
  const toast = useToast()
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState<string>('PENDIENTE')
  const [selected, setSelected] = useState<Encargo | null>(null)
  const [precio, setPrecio] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busy, setBusy] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['encargos', filtro],
    queryFn: () => encargoService.listar(filtro === 'TODOS' ? undefined : filtro)
      .then(r => listaEncargosDesdeRespuesta(r.data)),
  })

  const lista = useMemo(() => data ?? [], [data])

  async function aprobar() {
    if (!selected) return
    const monto = Number(precio)
    if (!monto || monto < 1) {
      toast({ message: 'Indicá un precio válido', type: 'warning' })
      return
    }
    setBusy(true)
    try {
      await encargoService.aprobar(selected.id, monto)
      toast({ message: 'Encargo aprobado. El cliente recibió el link de pago.', type: 'success' })
      setSelected(null)
      setPrecio('')
      await qc.invalidateQueries({ queryKey: ['encargos'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo aprobar', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function rechazar() {
    if (!selected || !motivo.trim()) {
      toast({ message: 'Escribí el motivo del rechazo', type: 'warning' })
      return
    }
    setBusy(true)
    try {
      await encargoService.rechazar(selected.id, motivo.trim())
      toast({ message: 'Encargo rechazado', type: 'success' })
      setSelected(null)
      setMotivo('')
      await qc.invalidateQueries({ queryKey: ['encargos'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo rechazar', type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Encargos personalizados</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Revisá imágenes de referencia, aprobá con precio o rechazá con motivo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTROS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className="text-xs px-3 py-1.5 rounded-full border"
              style={{
                borderColor: filtro === f ? 'var(--hc-accent)' : 'var(--hc-border)',
                background: filtro === f ? 'rgba(231,59,51,0.08)' : 'transparent',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : lista.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>No hay encargos en este filtro.</p>
        ) : (
          <div className="space-y-2">
            {lista.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => { setSelected(e); setPrecio(e.precioCotizado ? String(e.precioCotizado) : ''); setMotivo('') }}
                className="w-full text-left rounded-xl border p-3 hover:bg-black/5 transition"
                style={{ borderColor: 'var(--hc-border)' }}
              >
                <div className="flex justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{e.productoNombre || `Producto #${e.productoId}`}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
                      {e.nombreCliente} · {e.email} · {e.estado}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {[e.imagenUrl1, e.imagenUrl2, e.imagenUrl3].filter(Boolean).slice(0, 3).map(url => (
                      <img key={url as string} src={url as string} alt="" className="w-10 h-10 rounded object-cover" />
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-[#111114] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h2 className="font-semibold">{selected.productoNombre}</h2>
                  <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                    {selected.nombreCliente} · {selected.email}
                    {selected.telefono ? ` · ${selected.telefono}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="text-sm">Cerrar</button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[selected.imagenUrl1, selected.imagenUrl2, selected.imagenUrl3].filter(Boolean).map(url => (
                  <img key={url as string} src={url as string} alt="Referencia" className="aspect-square rounded-xl object-cover" />
                ))}
              </div>

              {selected.notas && (
                <div className="text-sm rounded-xl border p-3" style={{ borderColor: 'var(--hc-border)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--hc-muted)' }}>Notas del cliente</p>
                  {selected.notas}
                </div>
              )}

              {selected.tallaSeleccionada && (
                <p className="text-sm">Medida/talla: <strong>{selected.tallaSeleccionada}</strong></p>
              )}

              {selected.estado === 'PENDIENTE' && (
                <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--hc-border)' }}>
                  <div>
                    <label htmlFor="encargo-precio-aprobar" className="text-xs">Precio a cobrar (₡)</label>
                    <input
                      id="encargo-precio-aprobar"
                      type="number"
                      min={1}
                      className="w-full mt-1 rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--hc-border)' }}
                      value={precio}
                      onChange={e => setPrecio(e.target.value)}
                    />
                  </div>
                  <Button variant="primary" className="w-full" disabled={busy} onClick={() => void aprobar()}>
                    Aprobar y enviar link de pago
                  </Button>
                  <div>
                    <label htmlFor="encargo-motivo-rechazo" className="text-xs">O rechazar con motivo</label>
                    <textarea
                      id="encargo-motivo-rechazo"
                      className="w-full mt-1 rounded-xl border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--hc-border)', minHeight: 64 }}
                      value={motivo}
                      onChange={e => setMotivo(e.target.value)}
                    />
                    <Button className="w-full mt-2" disabled={busy} onClick={() => void rechazar()}>
                      Rechazar
                    </Button>
                  </div>
                </div>
              )}

              {selected.precioCotizado != null && selected.estado !== 'PENDIENTE' && (
                <p className="text-sm">Precio cotizado: {formatPrice(selected.precioCotizado)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
