import { useEffect, useState } from 'react'
import { adminService } from '@/services/orderService'
import {
  listaSinUbicacionDesdeRespuesta,
  type EmpresaSinUbicacion,
} from './empresasSinUbicacionHelpers'

/**
 * Negocios activos sin ubicación de despacho. Si la consulta falla queda la
 * lista vacía (no se avisa) y el error se registra en consola.
 */
export function useEmpresasSinUbicacion() {
  const [empresas, setEmpresas] = useState<EmpresaSinUbicacion[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    adminService.getEmpresasSinUbicacion()
      .then(({ data }) => {
        if (vivo) setEmpresas(listaSinUbicacionDesdeRespuesta(data))
      })
      .catch((err: unknown) => {
        console.error('[empresasSinUbicacion]', err)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  return { empresas, cargando }
}
