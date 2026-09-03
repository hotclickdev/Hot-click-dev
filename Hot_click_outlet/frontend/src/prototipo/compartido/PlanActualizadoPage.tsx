import { useEffect, useState } from 'react'
import { Boton, IconoEstado } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'

/**
 * Plan actualizado — confirma con GET /billing/suscripcion + refresh tenant.
 */
export default function PlanActualizadoPage() {
  const ruta = useSellerRuta()
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const planNombre = useTenantStore((s) => s.planNombre)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    let intentos = 0
    const MAX = 8

    const poll = async () => {
      try {
        await loadTenantInfo()
        const { data } = await billingService.getSuscripcion()
        const info = data as { estado?: string; planNombre?: string }
        if (cancelado) return
        if (info.estado === 'ACTIVO' || intentos >= MAX) {
          setListo(true)
          return
        }
        intentos += 1
        window.setTimeout(() => { void poll() }, 1500)
      } catch {
        if (!cancelado) {
          setError('No pudimos confirmar el plan. Revisá en Opciones → Tu plan.')
          setListo(true)
        }
      }
    }

    void poll()
    return () => { cancelado = true }
  }, [loadTenantInfo])

  return (
    <main className="px-5 pb-8 pt-32 text-center">
      <IconoEstado variante="ok" />
      <h1 className="font-display text-xl font-bold">
        {listo ? 'Listo. Tu plan fue actualizado' : 'Confirmando tu pago…'}
      </h1>
      <p className="mt-2 text-sm text-hc-muted">
        {error
          ? error
          : listo
            ? `Plan activo: ${planNombre || '—'}. Ya podés usar las funciones nuevas.`
            : 'Estamos esperando la confirmación de ONVO. Esto suele tardar unos segundos.'}
      </p>
      <div className="mt-8">
        <Boton to={ruta('opciones')}>Volver a Opciones</Boton>
      </div>
    </main>
  )
}
