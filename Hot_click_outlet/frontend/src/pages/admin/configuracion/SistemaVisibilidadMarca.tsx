import { empresaService } from '@/services/empresaService'
import { useToast } from '@/components/ui/Toast'
import useTenantStore from '@/store/tenantStore'
import VisibilidadCard from '@/pages/admin/mi-empresa/VisibilidadCard'
import { mensajeErrorConfig } from './configUi'

/** Interruptor de catálogo en Configuración → Marca (Sistema). No reactiva la cuenta HotClick. */
export default function SistemaVisibilidadMarca() {
  const toast = useToast()
  const estadoEmpresa = useTenantStore((s) => s.estadoEmpresa)
  const visibilidadPublica = useTenantStore((s) => s.visibilidadPublica)
  const setEmpresaStatus = useTenantStore((s) => s.setEmpresaStatus)

  const cuentaActiva = estadoEmpresa === 'ACTIVO'
  const motivoBloqueo = motivoBloqueoCuenta(estadoEmpresa)

  async function cambiar(val: boolean) {
    try {
      const { data } = await empresaService.setVisibilidad(val)
      const raw = data as { estadoEmpresa?: string; visibilidadPublica?: boolean; data?: { estadoEmpresa?: string; visibilidadPublica?: boolean } } | undefined
      const actual = raw?.estadoEmpresa ? raw : (raw?.data ?? raw)
      setEmpresaStatus({
        estadoEmpresa: actual?.estadoEmpresa ?? estadoEmpresa,
        visibilidadPublica: actual?.visibilidadPublica ?? val,
      })
      toast({
        message: val ? 'Tu tienda ya aparece en el catálogo' : 'Tu tienda quedó pausada en el catálogo',
        type: 'success',
      })
    } catch (err: unknown) {
      console.error('[SistemaVisibilidadMarca]', err)
      toast({
        message: mensajeErrorConfig(err, 'No se pudo cambiar la publicación de la tienda'),
        type: 'error',
      })
      throw err
    }
  }

  return (
    <div className="mb-4">
      <VisibilidadCard
        visible={cuentaActiva && visibilidadPublica === true}
        onChange={cambiar}
        puedePublicar={cuentaActiva}
        motivoBloqueo={motivoBloqueo}
      />
    </div>
  )
}

function motivoBloqueoCuenta(estado: string | null): string | undefined {
  if (estado === 'PENDIENTE_APROBACION') {
    return 'HotClick todavía no aprobó el negocio. La tienda no se puede publicar todavía.'
  }
  if (estado === 'SUSPENDIDO') {
    return 'HotClick suspendió la cuenta. No podés publicar la tienda desde acá.'
  }
  if (estado === 'INACTIVO') {
    return 'HotClick desactivó la cuenta. No podés publicar la tienda desde acá.'
  }
  if (estado && estado !== 'ACTIVO') {
    return 'HotClick apagó la cuenta de este negocio. No podés publicar la tienda desde acá.'
  }
  return undefined
}
