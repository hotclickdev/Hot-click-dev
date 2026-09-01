import { useEffect, useMemo, useState } from 'react'
import { unwrapEmpresa } from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import { leerExtrasNegocio } from '../data/negocioExtras'

export type CuentaVendedor = {
  usuario: string
  nombre: string
  tienda: string
  correo: string
  telefono: string
  instagram: string
  inicial: string
}

/**
 * Perfil del vendedor logueado: authStore + empresa/perfil.
 */
export function useCuentaVendedor() {
  const userName = useAuthStore((s) => s.userName)
  const userEmail = useAuthStore((s) => s.userEmail)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const [tiendaApi, setTiendaApi] = useState<string | null>(null)
  const [telefonoApi, setTelefonoApi] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    empresaService.getPerfil()
      .then(({ data }) => {
        if (!vivo) return
        const empresa = unwrapEmpresa(data)
        if (!empresa) return
        setTiendaApi(empresa.nombreComercial ?? empresa.nombreEmpresa ?? null)
        setTelefonoApi(empresa.numeroWhatsapp ?? empresa.telefonoEmpresa ?? null)
      })
      .catch((err: unknown) => {
        console.error('[cuentaVendedor]', err)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  return useMemo(() => {
    const nombre = userName ?? ''
    const correo = userEmail ?? ''
    const usuario = correo.split('@')[0] || nombre.toLowerCase().replace(/\s+/g, '.') || 'vendedor'
    const tienda = tiendaApi ?? empresaNombre ?? (nombre || 'Mi tienda')
    const telefono = telefonoApi ?? ''
    const instagram = leerExtrasNegocio().instagram
    const inicial = (tienda || nombre || 'T').slice(0, 1).toUpperCase()
    return { usuario, nombre, tienda, correo, telefono, instagram, inicial, cargando } satisfies CuentaVendedor & { cargando: boolean }
  }, [cargando, empresaNombre, telefonoApi, tiendaApi, userEmail, userName])
}
