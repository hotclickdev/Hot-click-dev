import { useState, useEffect, useCallback } from 'react'
import { adminService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import EmpresaDetail from './empresas/EmpresaDetail'
import EmpresaList from './empresas/EmpresaList'
import {
  detalleEmpresaDesdeRespuesta,
  listaEmpresasDesdeRespuesta,
  listaTabDesdeRespuesta,
} from './empresas/empresasHelpers'

async function obtenerListaEmpresas() {
  const { data } = await adminService.getEmpresas()
  return listaEmpresasDesdeRespuesta(data)
}

export default function AdminEmpresas() {
  const toast = useToast()
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('resumen')
  const [tabProductos, setTabProductos] = useState(null)
  const [tabPedidos, setTabPedidos] = useState(null)
  const [tabEquipo, setTabEquipo] = useState(null)
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    let cancelado = false
    obtenerListaEmpresas()
      .then((lista) => { if (!cancelado) setEmpresas(lista) })
      .catch(() => { if (!cancelado) toast({ message: 'Error al cargar empresas', type: 'error' }) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  function recargarEmpresas() {
    setLoading(true)
    obtenerListaEmpresas()
      .then(setEmpresas)
      .catch(() => toast({ message: 'Error al cargar empresas', type: 'error' }))
      .finally(() => setLoading(false))
  }

  async function abrirDetalle(emp) {
    setSelected(emp)
    setDetail(null)
    setTab('resumen')
    setTabProductos(null)
    setTabPedidos(null)
    setTabEquipo(null)
    try {
      const { data } = await adminService.getEmpresa(emp.id)
      setDetail(detalleEmpresaDesdeRespuesta(data))
    } catch { /* detail panel shows empty gracefully */ }
  }

  const cargarTab = useCallback(async (t, id) => {
    if (t === 'resumen') return
    const setter = t === 'productos' ? setTabProductos : t === 'pedidos' ? setTabPedidos : setTabEquipo
    const current = t === 'productos' ? tabProductos : t === 'pedidos' ? tabPedidos : tabEquipo
    if (current !== null) return
    setTabLoading(true)
    try {
      const { data } = await adminService.getEmpresaTab(id, t)
      setter(listaTabDesdeRespuesta(data))
    } catch {
      setter([])
    } finally {
      setTabLoading(false)
    }
  }, [tabProductos, tabPedidos, tabEquipo])

  async function cambiarEstado(id, estadoEmpresa) {
    setSaving(true)
    try {
      await adminService.setEmpresaEstado(id, estadoEmpresa)
      toast({ message: `Estado actualizado a ${estadoEmpresa}`, type: 'success' })
      recargarEmpresas()
      if (selected?.id === id) setSelected((s) => ({ ...s, estadoEmpresa }))
    } catch {
      toast({ message: 'Error al actualizar estado', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarPlan(id, plan) {
    setSaving(true)
    try {
      await adminService.setEmpresaPlan(id, plan)
      toast({ message: `Plan actualizado a ${plan}`, type: 'success' })
      recargarEmpresas()
      if (selected?.id === id) setSelected((s) => ({ ...s, plan }))
    } catch {
      toast({ message: 'Error al actualizar plan', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisibilidad(id, visibilidadPublica) {
    setSaving(true)
    try {
      await adminService.setEmpresaVisibilidad(id, visibilidadPublica)
      toast({ message: visibilidadPublica ? 'Negocio visible al público' : 'Negocio oculto — catálogo invisible', type: 'success' })
      setEmpresas((prev) => prev.map((e) => e.id === id ? { ...e, visibilidadPublica } : e))
      if (selected?.id === id) setSelected((s) => ({ ...s, visibilidadPublica }))
    } catch {
      toast({ message: 'Error al cambiar visibilidad', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <EmpresaList
        empresas={empresas}
        loading={loading}
        saving={saving}
        onToggleVisibilidad={toggleVisibilidad}
        onAbrirDetalle={abrirDetalle}
      />
      {selected && (
        <EmpresaDetail
          selected={selected}
          detail={detail}
          saving={saving}
          tab={tab}
          tabProductos={tabProductos}
          tabPedidos={tabPedidos}
          tabEquipo={tabEquipo}
          tabLoading={tabLoading}
          onClose={() => setSelected(null)}
          onTab={(t) => { setTab(t); cargarTab(t, selected.id) }}
          onCambiarPlan={cambiarPlan}
          onCambiarEstado={cambiarEstado}
          onToggleVisibilidad={toggleVisibilidad}
        />
      )}
    </>
  )
}
