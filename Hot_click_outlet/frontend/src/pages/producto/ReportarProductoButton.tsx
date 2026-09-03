import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { MOTIVOS_REPORTE, reporteProductoService } from '@/services/moderacionService'
import type { Id } from '@/types/api'

export default function ReportarProductoButton({ productoId }: { productoId: Id }) {
  const toast = useToast()
  const token = useAuthStore((s) => s.token)
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState<string>(MOTIVOS_REPORTE[0].id)
  const [detalle, setDetalle] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!token) return null

  async function enviar() {
    setEnviando(true)
    try {
      await reporteProductoService.crear(productoId, motivo, detalle.trim() || undefined)
      toast({ message: 'Gracias. Revisamos tu reporte.', type: 'success' })
      setAbierto(false)
      setDetalle('')
    } catch {
      toast({ message: 'No se pudo enviar el reporte', type: 'error' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pt-2 border-t border-[#ececf0]">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="text-xs font-semibold text-hc-muted underline underline-offset-2 min-h-11"
        >
          Reportar este producto
        </button>
      ) : (
        <div className="space-y-2 rounded-xl bg-[#f6f6f8] p-3">
          <p className="text-xs font-semibold text-hc-text">¿Qué pasó con este producto?</p>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full rounded-lg border border-hc-border bg-white px-2 py-2 text-sm"
          >
            {MOTIVOS_REPORTE.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={2}
            placeholder="Detalle opcional"
            className="w-full rounded-lg border border-hc-border bg-white px-2 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={enviando}
              onClick={enviar}
              className="min-h-11 flex-1 rounded-xl bg-hc-primary text-white text-xs font-bold disabled:opacity-50"
            >
              Enviar
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="min-h-11 flex-1 rounded-xl border border-hc-border text-xs font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
