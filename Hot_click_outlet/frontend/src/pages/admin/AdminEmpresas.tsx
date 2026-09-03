import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'
import { adminService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorProducto } from './productos/productosHelpers'
import EmpresaDetail from './empresas/EmpresaDetail'
import EmpresaList from './empresas/EmpresaList'
import {
  detalleEmpresaDesdeRespuesta,
  listaEmpresasDesdeRespuesta,
  listaTabDesdeRespuesta,
  esProductoVisibleEnCatalogo,
  type EmpresaDetalle,
  type EmpresaLista,
  type EmpresaMiembroTab,
  type EmpresaPedidoTab,
  type EmpresaProductoTab,
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
  const [selected, setSelected] = useState<EmpresaLista | null>(null)
  const [detail, setDetail] = useState<EmpresaDetalle | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('resumen')
  const [tabProductos, setTabProductos] = useState<EmpresaProductoTab[] | null>(null)
  const [tabPedidos, setTabPedidos] = useState<EmpresaPedidoTab[] | null>(null)
  const [tabEquipo, setTabEquipo] = useState<EmpresaMiembroTab[] | null>(null)
  const [tabLoading, setTabLoading] = useState(false)
  const [savingProductoId, setSavingProductoId] = useState<Id | null>(null)

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

  async function abrirDetalle(emp: EmpresaLista) {
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

  const cargarTab = useCallback(async (t: string, id: Id) => {
    if (t === 'resumen') return
    const setter = (t === 'productos' ? setTabProductos : t === 'pedidos' ? setTabPedidos : setTabEquipo) as Dispatch<SetStateAction<unknown[] | null>>
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

  async function cambiarEstado(id: Id, estadoEmpresa: string) {
    setSaving(true)
    try {
      await adminService.setEmpresaEstado(id, estadoEmpresa)
      toast({ message: `Estado actualizado a ${estadoEmpresa}`, type: 'success' })
      recargarEmpresas()
      if (selected?.id === id) setSelected((s) => ({ ...s!, estadoEmpresa }))
    } catch {
      toast({ message: 'Error al actualizar estado', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarPlan(id: Id, plan: string) {
    setSaving(true)
    try {
      await adminService.setEmpresaPlan(id, plan)
      toast({ message: `Plan actualizado a ${plan}`, type: 'success' })
      recargarEmpresas()
      if (selected?.id === id) setSelected((s) => ({ ...s!, plan }))
    } catch {
      toast({ message: 'Error al actualizar plan', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisibilidadProducto(producto: EmpresaProductoTab) {
    const visible = esProductoVisibleEnCatalogo(producto.visibleCatalogo)
    setSavingProductoId(producto.id)
    try {
      await productService.update(producto.id, { visibleCatalogo: !visible })
      setTabProductos((prev) => prev?.map((p) => (
        p.id === producto.id ? { ...p, visibleCatalogo: !visible } : p
      )) ?? null)
      toast({ message: visible ? 'Producto pausado' : 'Producto publicado de nuevo', type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorProducto(err, 'No se pudo cambiar la visibilidad'), type: 'error' })
    } finally {
      setSavingProductoId(null)
    }
  }

  async function toggleVisibilidad(id: Id, visibilidadPublica: boolean) {
    setSaving(true)
    try {
      await adminService.setEmpresaVisibilidad(id, visibilidadPublica)
      toast({ message: visibilidadPublica ? 'Negocio visible al público' : 'Negocio oculto — catálogo invisible', type: 'success' })
      setEmpresas((prev) => prev.map((e) => e.id === id ? { ...e, visibilidadPublica } : e))
      if (selected?.id === id) setSelected((s) => ({ ...s!, visibilidadPublica }))
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
          savingProductoId={savingProductoId}
          onToggleVisibilidadProducto={toggleVisibilidadProducto}
        />
      )}
    </>
  )
}
