import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '@/components/ui/Spinner'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { AdminMenuRow } from '@/prototipo/admin/AdminUi'
import { aprobacionService } from '@/services/aprobacionService'
import { listaDesdeRespuesta } from '../aprobaciones/aprobacionesHelpers'
import { alertasDesdeColas, type AlertaSistema } from './superAdminNotificacionesHelpers'

/**
 * Notificaciones del sistema (Figma 65:295) con colas reales.
 */
export default function SuperAdminNotificaciones() {
  const [alertas, setAlertas] = useState<AlertaSistema[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelado = false
    Promise.all([
      aprobacionService.listEmpresas().catch((err: unknown) => {
        console.error(err)
        return { data: [] }
      }),
      aprobacionService.listOfertas().catch((err: unknown) => {
        console.error(err)
        return { data: [] }
      }),
    ]).then(([{ data: empresas }, { data: ofertas }]) => {
      if (!cancelado) {
        setAlertas(alertasDesdeColas(empresas, listaDesdeRespuesta(ofertas).length))
      }
    }).finally(() => {
      if (!cancelado) setLoading(false)
    })
    return () => { cancelado = true }
  }, [])

  return (
    <div className="mx-auto max-w-md pb-10 md:max-w-xl">
      <AdminPageHeader titulo="Notificaciones" atras="/admin/configuracion" />
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : alertas.length === 0 ? (
        <p className="text-sm text-hc-muted">No hay alertas de moderación por ahora.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {alertas.map((alerta) => (
            <li key={alerta.id}>
              <Link
                to={alerta.to}
                className="flex gap-3 rounded-xl bg-hc-surface-2 p-3"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    alerta.tono === 'muted'
                      ? 'bg-[var(--hc-info-bg)] text-hc-accent'
                      : 'bg-[var(--hc-danger-bg)] text-hc-danger'
                  }`}
                  aria-hidden
                >
                  {alerta.tono === 'muted' ? 'i' : '!'}
                </span>
                <span>
                  <span className="block text-sm font-medium">{alerta.titulo}</span>
                  <span className="mt-1 block text-xs text-hc-muted">{alerta.cuerpo}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 border-t border-hc-border">
        <AdminMenuRow
          to="/admin/configuracion?seccion=notificaciones"
          label="Ajustes de alertas por email"
        />
      </div>
    </div>
  )
}
