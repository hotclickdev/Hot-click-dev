import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { rutaProductoEnTienda, tiendaEsPublica } from '@/utils/rutaTienda'

/** Slug y si /tienda/{slug} responde (negocio activo y visible). */
export function useTiendaPublica() {
  const slug = useAuthStore((s) => s.empresaSlug)
  const estadoEmpresa = useTenantStore((s) => s.estadoEmpresa)
  const visibilidadPublica = useTenantStore((s) => s.visibilidadPublica)
  const tiendaPublica = tiendaEsPublica({ estadoEmpresa, visibilidadPublica })
  return {
    slug,
    estadoEmpresa,
    visibilidadPublica,
    tiendaPublica,
    rutaTienda: slug ? `/tienda/${slug}` : null,
    rutaProducto: (productoId) => rutaProductoEnTienda(slug, productoId),
  }
}
