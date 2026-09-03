import { useEffect, useState } from 'react'
import IconoExito from '../ui/IconoExito'
import EnlacePrimario from '../ui/EnlacePrimario'
import { EmprendedorCard } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { billingService } from '@/services/billingService'
import useTenantStore from '@/store/tenantStore'

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

  return (
    <main className="flex flex-col px-5 py-8 md:max-w-[760px] md:px-16 md:py-12">
      <EmprendedorCard className="flex flex-col items-center gap-4 text-center">
        <IconoExito />
        <h1 className="font-display text-lg font-bold md:text-[22px]">
          {listo ? '¡Listo! Tu plan fue actualizado' : 'Confirmando tu pago…'}
        </h1>
        <p className="text-[13px] text-hc-muted md:text-sm">
          {error
            ? error
            : listo
              ? `Plan activo: ${planNombre || '—'}. Ya podés usar las funciones nuevas.`
              : 'Estamos esperando la confirmación de ONVO.'}
        </p>
        <EnlacePrimario to={`${RUTA_EMPRENDEDOR}/opciones`}>Volver a Opciones</EnlacePrimario>
      </EmprendedorCard>
    </main>
  )
}
