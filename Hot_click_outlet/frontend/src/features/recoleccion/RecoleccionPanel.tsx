import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { recoleccionService } from '@/services/recoleccionService'
import RecoleccionFormulario from './RecoleccionFormulario'
import RecoleccionLista from './RecoleccionLista'
import { useRecolecciones } from './useRecolecciones'
import type { RecoleccionCreatePayload } from './recoleccionTipos'

export default function RecoleccionPanel() {
  const toast = useToast()
  const qc = useQueryClient()
  const { data: solicitudes = [], isLoading } = useRecolecciones()
  const [enviando, setEnviando] = useState(false)
  const [cancelandoId, setCancelandoId] = useState<number | null>(null)

  async function enviar(payload: RecoleccionCreatePayload) {
    setEnviando(true)
    try {
      await recoleccionService.crear(payload)
      toast({ message: 'Solicitud enviada. HOTCLICK te indica la tarifa.', type: 'success' })
      await qc.invalidateQueries({ queryKey: ['recolecciones'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo enviar la solicitud', type: 'error' })
    } finally {
      setEnviando(false)
    }
  }

  async function cancelar(id: number) {
    setCancelandoId(id)
    try {
      await recoleccionService.cancelar(id)
      toast({ message: 'Solicitud cancelada', type: 'success' })
      await qc.invalidateQueries({ queryKey: ['recolecciones'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast({ message: msg || 'No se pudo cancelar', type: 'error' })
    } finally {
      setCancelandoId(null)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-base font-bold">Nueva solicitud</h2>
        <p className="mb-4 text-xs text-hc-muted">
          Pedí que pasemos a recolectar y entreguemos a tu cliente. Por ahora solo en la GAM.
        </p>
        <RecoleccionFormulario enviando={enviando} onEnviar={enviar} />
      </section>
      <section>
        <h2 className="mb-3 text-base font-bold">Tus solicitudes</h2>
        {isLoading ? (
          <p className="text-sm text-hc-muted">Cargando…</p>
        ) : (
          <RecoleccionLista solicitudes={solicitudes} onCancelar={cancelar} cancelandoId={cancelandoId} />
        )}
      </section>
    </div>
  )
}
