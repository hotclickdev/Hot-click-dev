import { useState, useEffect } from 'react'
import { adminService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import EmpresaList from './empresas/EmpresaList'
import {
  listaEmpresasDesdeRespuesta,
  type EmpresaLista,
} from './empresas/empresasHelpers'
import type { Id } from '@/types/api'

async function obtenerListaEmpresas() {
  const { data } = await adminService.getEmpresas()
  return listaEmpresasDesdeRespuesta(data)
}

export default function AdminEmpresas() {
  const toast = useToast()
  const [empresas, setEmpresas] = useState<EmpresaLista[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelado = false
    obtenerListaEmpresas()
      .then((lista) => { if (!cancelado) setEmpresas(lista) })
      .catch(() => { if (!cancelado) toast({ message: 'Error al cargar empresas', type: 'error' }) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  async function toggleVisibilidad(id: Id, visibilidadPublica: boolean) {
    setSaving(true)
    try {
      await adminService.setEmpresaVisibilidad(id, visibilidadPublica)
      toast({ message: visibilidadPublica ? 'Negocio visible al público' : 'Negocio oculto — catálogo invisible', type: 'success' })
      setEmpresas((prev) => prev.map((e) => e.id === id ? { ...e, visibilidadPublica } : e))
    } catch {
      toast({ message: 'Error al cambiar visibilidad', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <EmpresaList
      empresas={empresas}
      loading={loading}
      saving={saving}
      onToggleVisibilidad={toggleVisibilidad}
    />
  )
}
