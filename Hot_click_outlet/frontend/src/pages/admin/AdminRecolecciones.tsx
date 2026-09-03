import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Spinner from '@/components/ui/Spinner'
import { useRecolecciones } from '@/features/recoleccion/useRecolecciones'
import { ETIQUETA_ESTADO, type SolicitudRecoleccion } from '@/features/recoleccion/recoleccionTipos'
import { formatoTarifa } from '@/features/recoleccion/recoleccionHelpers'
import AdminRecoleccionDrawer from './recoleccion/AdminRecoleccionDrawer'

export default function AdminRecolecciones() {
  const qc = useQueryClient()
  const { data: solicitudes = [], isLoading } = useRecolecciones()
  const [seleccion, setSeleccion] = useState<SolicitudRecoleccion | null>(null)
  const pendientes = solicitudes.filter((s) => s.estado === 'PENDIENTE').length

  async function alGuardar() {
    setSeleccion(null)
    await qc.invalidateQueries({ queryKey: ['recolecciones'] })
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Recolección y entrega</h1>
          <p className="mt-0.5 text-sm text-hc-muted">Solicitudes de vendedores. Indicá la tarifa (solo GAM).</p>
        </div>
        {pendientes > 0 ? (
          <span className="rounded-full px-3 py-1.5 text-sm font-bold" style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            {pendientes} pendientes
          </span>
        ) : null}
      </div>
      {isLoading ? <Spinner /> : (
        <ul className="space-y-3">
          {solicitudes.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSeleccion(s)}
                className="w-full rounded-xl border border-hc-border bg-hc-surface p-4 text-left"
              >
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-bold">{s.empresaNombre || 'Negocio'}</p>
                  <span className="text-xs font-semibold">{ETIQUETA_ESTADO[s.estado] ?? s.estado}</span>
                </div>
                <p className="mt-1 text-xs text-hc-muted">De: {s.direccionRecoleccion}</p>
                <p className="text-xs text-hc-muted">A: {s.direccionEntrega}</p>
                <p className="mt-1 text-sm font-semibold text-hc-primary">{formatoTarifa(s.tarifaColones)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!isLoading && solicitudes.length === 0 ? (
        <p className="text-sm text-hc-muted">No hay solicitudes todavía.</p>
      ) : null}
      {seleccion ? (
        <AdminRecoleccionDrawer seleccion={seleccion} onCerrar={() => setSeleccion(null)} onOk={alGuardar} />
      ) : null}
    </div>
  )
}
