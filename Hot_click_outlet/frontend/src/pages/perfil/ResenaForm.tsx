import { useState, useEffect, type FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { testimonioService } from '@/services/testimonioService'
import ImagenPicker from './ImagenPicker'
import StarPicker from './StarPicker'
import useImageUpload from './useImageUpload'
import {
  MAX_RESENAS,
  RATING_LABELS,
  conteoResenasPorProducto,
  productosElegiblesParaResena,
  listaTestimoniosDesdeRespuesta,
  mensajeErrorApi,
} from './perfilHelpers'
import type { TestimonioUsuario } from './perfilHelpers'
import type { PedidoCliente } from '../pedidos/pedidoHelpers'
import EnvioOpinionOk from './EnvioOpinionOk'

export default function ResenaForm({
  orders = [], ordersLoading = false,
}: {
  orders?: PedidoCliente[]
  ordersLoading?: boolean
}) {
  const toast = useToast()
  const img = useImageUpload(toast)
  const [productoId, setProductoId] = useState('')
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [misResenas, setMisResenas] = useState<TestimonioUsuario[]>([])

  const productosComprados = productosElegiblesParaResena(orders)
  const conteoMap = conteoResenasPorProducto(misResenas)

  useEffect(() => {
    testimonioService.getMisTestimonios()
      .then(({ data }) => setMisResenas(listaTestimoniosDesdeRespuesta(data)))
      .catch(() => toast({ message: 'Error al cargar reseñas', type: 'error' }))
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps -- recarga al enviar

  const reset = () => {
    setProductoId(''); setCalificacion(0); setComentario(''); img.reset(); setDone(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!productoId || !comentario.trim()) return
    if (!calificacion) {
      toast({ message: 'Seleccioná una calificación de 1 a 5 estrellas.', type: 'error' })
      return
    }
    setSending(true)
    try {
      await testimonioService.crearResena({ productoId: Number(productoId), comentario, calificacion, imagenUrl: img.imagenUrl })
      setDone(true)
      toast({ message: '¡Reseña enviada! Aparecerá en el producto una vez aprobada.', type: 'success' })
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err)
      toast({ message: typeof msg === 'string' ? msg : 'No se pudo enviar. Intentá de nuevo.', type: 'error' })
    } finally {
      setSending(false)
    }
  }

  if (done) return (
    <EnvioOpinionOk
      titulo="¡Reseña enviada!"
      detalle="Aparecerá en el producto una vez que la aprobemos."
      onOtro={reset}
      otroLabel="Dejar otra reseña"
    />
  )

  if (ordersLoading) return <div className="flex justify-center py-6"><Spinner /></div>

  if (productosComprados.length === 0) return (
    <div className="px-5 py-6 text-center">
      <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
        Aún no tenés productos elegibles para reseñar. Solo podés reseñar productos que hayas comprado.
      </p>
    </div>
  )

  const productoSeleccionado = productoId ? productosComprados.find((p) => String(p.id) === String(productoId)) : null
  const resenasDelProducto = productoSeleccionado ? (conteoMap[productoSeleccionado.id] ?? 0) : 0
  const limiteAlcanzado = resenasDelProducto >= MAX_RESENAS

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        Podés dejar hasta <strong>{MAX_RESENAS} reseñas</strong> por producto comprado.
      </p>

      <div>
        <label htmlFor="profile-producto" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
          Producto <span style={{ color: 'var(--hc-accent)' }}>*</span>
        </label>
        <select id="profile-producto" value={productoId} onChange={(e) => { setProductoId(e.target.value); setCalificacion(0) }}
          required
          className="w-full rounded-xl px-3 py-2.5 text-sm"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
            color: productoId ? 'var(--hc-text)' : 'var(--hc-muted)', outline: 'none' }}>
          <option value="" disabled>Seleccioná el producto...</option>
          {productosComprados.map((p) => {
            const count = conteoMap[p.id] ?? 0
            const lleno = count >= MAX_RESENAS
            return (
              <option key={p.id} value={p.id} disabled={lleno}>
                {p.nombre}{sufijoResenaProducto(lleno, count)}
              </option>
            )
          })}
        </select>

        {productoSeleccionado && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {Array.from({ length: MAX_RESENAS }).map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full transition-colors"
                style={{ backgroundColor: i < resenasDelProducto ? 'var(--hc-accent)' : 'var(--hc-border)' }} />
            ))}
            <span className="text-[11px] ml-1" style={{ color: limiteAlcanzado ? '#ef4444' : 'var(--hc-muted)' }}>
              {limiteAlcanzado ? 'Límite alcanzado' : `${resenasDelProducto}/${MAX_RESENAS} reseñas`}
            </span>
          </div>
        )}
      </div>

      {limiteAlcanzado ? (
        <p className="text-xs text-center py-2" style={{ color: '#ef4444' }}>
          Ya enviaste {MAX_RESENAS} reseñas para este producto.
        </p>
      ) : (
        <>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Calificación <span style={{ color: 'var(--hc-accent)' }}>*</span>
            </label>
            <div className="flex items-center gap-3">
              <StarPicker value={calificacion} onChange={setCalificacion} />
              {calificacion > 0 && (
                <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>
                  {RATING_LABELS[calificacion]}
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="profile-resena" className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
              Tu reseña <span style={{ color: 'var(--hc-accent)' }}>*</span>
            </label>
            <textarea id="profile-resena" value={comentario} onChange={(e) => setComentario(e.target.value)}
              maxLength={500} rows={3}
              placeholder="¿Qué te pareció el producto? Tu experiencia ayuda a otros compradores…"
              required
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
              style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)', outline: 'none' }} />
            <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--hc-muted)' }}>{comentario.length}/500</p>
          </div>

          <ImagenPicker preview={img.preview} uploading={img.uploading}
            onRemove={img.reset} onFile={img.handleFile} />

          <Button type="submit" loading={sending}
            disabled={img.uploading || !productoId || !calificacion || !comentario.trim()}
            className="w-full">
            Enviar reseña
          </Button>
        </>
      )}
    </form>
  )
}

function sufijoResenaProducto(lleno: boolean, count: number): string {
  if (lleno) return ` (${MAX_RESENAS}/${MAX_RESENAS} reseñas)`
  if (count > 0) return ` (${count}/${MAX_RESENAS})`
  return ''
}
