import { useEffect, useState } from 'react'
import { Boton } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import PantallaExitoWizard from './motion/PantallaExitoWizard'
import { navegarConTransicion } from './motion/PantallaExitoWizard'
import { useNavigate } from 'react-router-dom'

/**
 * Plan actualizado — confirma con GET /billing/suscripcion + refresh tenant.
 */
export default function PlanActualizadoPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
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

  if (!listo) {
    return (
      <main className="px-5 pb-8 pt-32 text-center">
        <div className="mx-auto mb-6 size-20 animate-pulse rounded-full bg-hc-surface-2" aria-hidden />
        <h1 className="font-display text-xl font-bold">Confirmando tu pago…</h1>
        <p className="mt-2 text-sm text-hc-muted">
          Estamos esperando la confirmación de ONVO. Esto suele tardar unos segundos.
        </p>
      </main>
    )
  }

  return (
    <main className="px-5 pb-8 pt-20">
      <PantallaExitoWizard
        titulo={error ? 'No pudimos confirmar del todo' : 'Listo. Tu plan fue actualizado'}
        mensaje={
          error
            ? error
            : `Plan activo: ${planNombre || '—'}. Ya podés usar las funciones nuevas.`
        }
        accion={
          <Boton
            onClick={() => navegarConTransicion(() => navigate(ruta('opciones')))}
          >
            Volver a Opciones
          </Boton>
        }
      />
    </main>
  )
}
