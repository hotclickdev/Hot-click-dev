import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import { mensajeErrorProducto } from '../productos/productosHelpers'
import {
  TAB_PRODUCTOS_SIZE,
  detalleEmpresaDesdeRespuesta,
  esProductoVisibleEnCatalogo,
  listaTabDesdeRespuesta,
  type EmpresaDetalle,
  type EmpresaLista,
  type EmpresaMiembroTab,
  type EmpresaPedidoTab,
  type EmpresaProductoTab,
} from './empresasHelpers'
import type { Id } from '@/types/api'

async function cargarEmpresa(id: Id) {
  const { data } = await adminService.getEmpresa(id)
  return detalleEmpresaDesdeRespuesta(data)
}

export function useEmpresaWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [selected, setSelected] = useState<EmpresaLista | null>(null)
  const [detail, setDetail] = useState<EmpresaDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [impersonarLoading, setImpersonarLoading] = useState(false)
  const [tab, setTab] = useState('productos')
  const [tabProductos, setTabProductos] = useState<EmpresaProductoTab[] | null>(null)
  const [tabPedidos, setTabPedidos] = useState<EmpresaPedidoTab[] | null>(null)
  const [tabEquipo, setTabEquipo] = useState<EmpresaMiembroTab[] | null>(null)
  const [tabLoading, setTabLoading] = useState(false)
  const [savingProductoId, setSavingProductoId] = useState<Id | null>(null)
  const [busquedaProducto, setBusquedaProducto] = useState('')

  const recargarProductos = useCallback(async (empresaId: Id) => {
    const { data } = await adminService.getEmpresaTab(empresaId, 'productos', {
      page: 0,
      size: TAB_PRODUCTOS_SIZE,
    })
    setTabProductos(listaTabDesdeRespuesta(data) as EmpresaProductoTab[])
  }, [])

  useEffect(() => {
    if (!id) return
    let vivo = true
    setLoading(true)
    cargarEmpresa(id)
      .then((emp) => {
        if (!vivo) return
        setSelected(emp)
        setDetail(emp)
        setTab('productos')
        setTabProductos(null)
        setTabPedidos(null)
        setTabEquipo(null)
        setBusquedaProducto('')
        return recargarProductos(emp.id)
      })
      .catch(() => {
        if (!vivo) return
        toast({ message: 'No se pudo cargar el negocio', type: 'error' })
        navigate('/admin/empresas')
      })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [id, navigate, recargarProductos, toast])

  const cargarTab = useCallback(async (t: string, empresaId: Id) => {
    if (t === 'resumen') return
    if (t === 'productos') {
      setTabLoading(true)
      try { await recargarProductos(empresaId) }
      catch { setTabProductos([]) }
      finally { setTabLoading(false) }
      return
    }
    setTabLoading(true)
    try {
      const { data } = await adminService.getEmpresaTab(empresaId, t)
      const lista = listaTabDesdeRespuesta(data)
      if (t === 'pedidos') setTabPedidos(lista as EmpresaPedidoTab[])
      else setTabEquipo(lista as EmpresaMiembroTab[])
    } catch {
      if (t === 'pedidos') setTabPedidos([])
      else setTabEquipo([])
    } finally {
      setTabLoading(false)
    }
  }, [recargarProductos])

  async function cambiarEstado(empresaId: Id, estadoEmpresa: string) {
    setSaving(true)
    try {
      await adminService.setEmpresaEstado(empresaId, estadoEmpresa)
      toast({ message: `Estado actualizado a ${estadoEmpresa}`, type: 'success' })
      setSelected((s) => (s ? { ...s, estadoEmpresa } : s))
    } catch {
      toast({ message: 'Error al actualizar estado', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarPlan(empresaId: Id, plan: string) {
    setSaving(true)
    try {
      await adminService.setEmpresaPlan(empresaId, plan)
      toast({ message: `Plan actualizado a ${plan}`, type: 'success' })
      setSelected((s) => (s ? { ...s, plan } : s))
    } catch {
      toast({ message: 'Error al actualizar plan', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisibilidad(empresaId: Id, visibilidadPublica: boolean) {
    setSaving(true)
    try {
      await adminService.setEmpresaVisibilidad(empresaId, visibilidadPublica)
      toast({
        message: visibilidadPublica ? 'Negocio visible al público' : 'Negocio oculto — catálogo invisible',
        type: 'success',
      })
      setSelected((s) => (s ? { ...s, visibilidadPublica } : s))
    } catch {
      toast({ message: 'Error al cambiar visibilidad', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function impersonar(empresaId: Id) {
    setImpersonarLoading(true)
    try {
      const { data } = await adminService.impersonarEmpresa(empresaId)
      useAuthStore.getState().impersonar(data)
      navigate('/admin')
    } catch {
      toast({ message: 'No se pudo iniciar la sesión de soporte', type: 'error' })
    } finally {
      setImpersonarLoading(false)
    }
  }

  async function toggleVisibilidadProducto(producto: EmpresaProductoTab) {
    const visible = esProductoVisibleEnCatalogo(producto.visibleCatalogo)
    setSavingProductoId(producto.id)
    try {
      await productService.toggleVisibleCatalogo(producto.id, !visible)
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

  return {
    selected,
    detail,
    loading,
    saving,
    impersonarLoading,
    tab,
    tabProductos,
    tabPedidos,
    tabEquipo,
    tabLoading,
    savingProductoId,
    busquedaProducto,
    setBusquedaProducto,
    recargarProductos: () => selected ? recargarProductos(selected.id) : Promise.resolve(),
    onTab: (t: string) => {
      if (!selected) return
      setTab(t)
      void cargarTab(t, selected.id)
    },
    cambiarEstado,
    cambiarPlan,
    toggleVisibilidad,
    impersonar,
    toggleVisibilidadProducto,
  }
}
