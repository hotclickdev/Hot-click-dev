import { useEffect, useState } from 'react'
import { Boton } from '@/prototipo/compartido/ui'
import { EmprendedorCard } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'
import PantallaExitoWizard from '@/prototipo/compartido/motion/PantallaExitoWizard'

/**
 * Plan actualizado — confirma pago ONVO vía suscripción + tenant.
 */
export default function PlanActualizadoPage() {
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
        const info = data as { estado?: string }
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
      <main className="flex flex-col px-5 py-8 md:max-w-[760px] md:px-16 md:py-12">
        <EmprendedorCard className="flex flex-col items-center gap-4 text-center">
          <div className="size-20 animate-pulse rounded-full bg-hc-surface-2" aria-hidden />
          <h1 className="font-display text-lg font-bold md:text-[22px]">Confirmando tu pago…</h1>
          <p className="text-[13px] text-hc-muted md:text-sm">
            Estamos esperando la confirmación de ONVO.
          </p>
        </EmprendedorCard>
      </main>
    )
  }

  return (
    <main className="flex flex-col px-5 py-8 md:max-w-[760px] md:px-16 md:py-12">
      <EmprendedorCard>
        <PantallaExitoWizard
          titulo={error ? 'No pudimos confirmar del todo' : '¡Listo! Tu plan fue actualizado'}
          mensaje={
            error
              ? error
              : `Plan activo: ${planNombre || '—'}. Ya podés usar las funciones nuevas.`
          }
          accion={<Boton to={`${RUTA_EMPRENDEDOR}/opciones`}>Volver a Opciones</Boton>}
        />
      </EmprendedorCard>
    </main>
  )
}
