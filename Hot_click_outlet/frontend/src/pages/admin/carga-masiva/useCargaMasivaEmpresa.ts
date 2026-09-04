import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { idEmpresaOpcional } from '../empresas/EmpresaDestinoSelect'
import {
  empresaIdDesdeParam,
  listaEmpresasDesdeRespuesta,
  rutaEspacioEmpresa,
  rutaImportarEmpresa,
  type EmpresaLista,
} from '../empresas/empresasHelpers'

const MSG_ELEGIR_EMPRESA = 'Elegí el negocio al que se van a asignar los productos.'

export function useCargaMasivaEmpresa() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const esAdminIT = useAuthStore((s) => s.userRole === 'ADMIN')
  const [empresas, setEmpresas] = useState<EmpresaLista[]>([])
  const [empresaId, setEmpresaId] = useState(() => empresaIdDesdeParam(searchParams.get('empresaId')))

  useEffect(() => {
    if (!esAdminIT) return
    let vivo = true
    adminService.getEmpresas()
      .then(({ data }) => { if (vivo) setEmpresas(listaEmpresasDesdeRespuesta(data)) })
      .catch(() => { if (vivo) toast({ message: 'No se pudieron cargar los negocios', type: 'error' }) })
    return () => { vivo = false }
  }, [esAdminIT, toast])

  const destinoOk = !esAdminIT || Boolean(empresaId)

  function exigirDestino(): boolean {
    if (destinoOk) return true
    toast({ message: MSG_ELEGIR_EMPRESA, type: 'error' })
    return false
  }

  return {
    esAdminIT,
    empresas,
    empresaId,
    setEmpresaId,
    empresaParam: idEmpresaOpcional(empresaId),
    rutaVolver: empresaId ? rutaEspacioEmpresa(empresaId) : '/admin',
    rutaTrasGuardar: empresaId ? rutaEspacioEmpresa(empresaId) : '/admin/productos',
    rutaCsv: empresaId ? rutaImportarEmpresa(empresaId) : '/admin/productos/importar',
    exigirDestino,
  }
}
