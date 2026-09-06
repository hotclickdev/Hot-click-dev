import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import AccesoTiendaPublica from '@/components/sistema/AccesoTiendaPublica'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import { RUTA_SISTEMA_VISIBILIDAD } from '@/utils/rutaTienda'

/**
 * Banners de aprobación / visibilidad en el shell Figma del vendedor.
 */
export default function VendedorAvisos() {
  const userRole = useAuthStore((s) => s.userRole)
  const empresaId = useAuthStore((s) => s.empresaId)
  const estadoEmpresa = useTenantStore((s) => s.estadoEmpresa)
  const visibilidadPublica = useTenantStore((s) => s.visibilidadPublica)

  useEffect(() => {
    if (!esUsuarioSistema(userRole) || !empresaId) return
    import('@/services/api').then(({ default: api }) => {
      api.get<unknown>('/empresa/perfil')
        .then(({ data }) => aplicarPerfil(data))
        .catch((err: unknown) => console.error('[VendedorAvisos] perfil', err))
    })
  }, [userRole, empresaId])

  if (estadoEmpresa === 'PENDIENTE_APROBACION') {
    return (
      <div
        className="mx-5 mb-4 rounded-xl px-4 py-3 text-sm"
        style={{ background: 'var(--hc-warning-bg)', color: 'var(--hc-warning)', border: '1px solid var(--hc-border)' }}
      >
        <p className="font-semibold">Tu negocio está pendiente de aprobación</p>
        <AccesoTiendaPublica variante="muted" conCopiar={false} />
      </div>
    )
  }
  if (estadoEmpresa === 'SUSPENDIDO' || estadoEmpresa === 'INACTIVO') {
    return (
      <div
        className="mx-5 mb-4 rounded-xl px-4 py-3 text-sm"
        style={{ background: 'var(--hc-danger-bg)', color: 'var(--hc-danger)', border: '1px solid var(--hc-border)' }}
      >
        <p className="font-semibold">
          {estadoEmpresa === 'SUSPENDIDO' ? 'Tu cuenta está suspendida' : 'Tu cuenta está desactivada'}
        </p>
        <p className="mt-1 text-xs opacity-90">
          HotClick apagó la cuenta de este negocio. No podés publicar la tienda desde acá.
        </p>
      </div>
    )
  }
  if (estadoEmpresa === 'ACTIVO' && visibilidadPublica === false) {
    return (
      <div
        className="mx-5 mb-4 rounded-xl px-4 py-3 text-sm"
        style={{ background: 'var(--hc-info-bg)', color: 'var(--hc-info)', border: '1px solid var(--hc-border)' }}
      >
        <p className="font-semibold">Tu tienda está pausada en el catálogo</p>
        <Link to={RUTA_SISTEMA_VISIBILIDAD} className="mt-1 inline-flex min-h-11 items-center font-semibold underline">
          Configuración
        </Link>
      </div>
    )
  }
  return null
}

function aplicarPerfil(data: unknown) {
  const root = data && typeof data === 'object' ? data as Record<string, unknown> : null
  const innerRaw: unknown = root?.id ? root : (root?.data ?? data)
  const e = innerRaw && typeof innerRaw === 'object' ? innerRaw as Record<string, unknown> : null
  if (!e?.id) return
  useTenantStore.getState().setEmpresaStatus({
    estadoEmpresa: typeof e.estadoEmpresa === 'string' ? e.estadoEmpresa : undefined,
    visibilidadPublica: e.visibilidadPublica === true,
  })
}
