import { empresaService } from '@/services/empresaService'
import { useToast } from '@/components/ui/Toast'
import useTenantStore from '@/store/tenantStore'
import VisibilidadCard from '@/pages/admin/mi-empresa/VisibilidadCard'

/** Interruptor de tienda pública en Configuración → Marca (Sistema). */
export default function SistemaVisibilidadMarca() {
  const toast = useToast()
  const estadoEmpresa = useTenantStore((s) => s.estadoEmpresa)
  const visibilidadPublica = useTenantStore((s) => s.visibilidadPublica)
  const setEmpresaStatus = useTenantStore((s) => s.setEmpresaStatus)

  if (estadoEmpresa === 'PENDIENTE_APROBACION') {
    return (
      <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>
        HotClick todavía no aprobó el negocio. La tienda no se puede publicar todavía.
      </p>
    )
  }
  if (estadoEmpresa !== 'ACTIVO') return null

  async function cambiar(val) {
    try {
      const { data } = await empresaService.setVisibilidad(val)
      const actual = data?.estadoEmpresa ? data : (data?.data ?? data)
      setEmpresaStatus({
        estadoEmpresa: actual?.estadoEmpresa ?? estadoEmpresa,
        visibilidadPublica: actual?.visibilidadPublica ?? val,
      })
      toast({
        message: val ? 'Tu tienda ya es visible al público' : 'Tu tienda quedó oculta',
        type: 'success',
      })
    } catch (err) {
      console.error('[SistemaVisibilidadMarca]', err)
      toast({
        message: err?.response?.data?.message ?? 'No se pudo cambiar la visibilidad',
        type: 'error',
      })
      throw err
    }
  }

  return (
    <div className="mb-4">
      <VisibilidadCard visible={visibilidadPublica === true} onChange={cambiar} />
    </div>
  )
}
