import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { adminService, orderService } from '@/services/orderService'
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
  const [savingPedidoId, setSavingPedidoId] = useState<Id | null>(null)
  const [savingMiembroId, setSavingMiembroId] = useState<Id | null>(null)
  const [invitandoMiembro, setInvitandoMiembro] = useState(false)
  const [busquedaProducto, setBusquedaProducto] = useState('')

  const recargarProductos = useCallback(async (empresaId: Id) => {
    const { data } = await adminService.getEmpresaTab(empresaId, 'productos', {
      page: 0,
      size: TAB_PRODUCTOS_SIZE,
    })
    setTabProductos(listaTabDesdeRespuesta(data) as EmpresaProductoTab[])
  }, [])

  const recargarEquipo = useCallback(async (empresaId: Id) => {
    const { data } = await adminService.getEmpresaTab(empresaId, 'equipo')
    setTabEquipo(listaTabDesdeRespuesta(data) as EmpresaMiembroTab[])
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

  async function cambiarEstadoPedido(pedidoId: Id, estado: string) {
    setSavingPedidoId(pedidoId)
    try {
      await orderService.updateStatus(pedidoId, estado)
      setTabPedidos((prev) => prev?.map((p) => (
        p.id === pedidoId ? { ...p, estado } : p
      )) ?? null)
      toast({ message: `Estado del pedido actualizado a ${estado}`, type: 'success' })
    } catch {
      toast({ message: 'No se pudo actualizar el estado del pedido', type: 'error' })
    } finally {
      setSavingPedidoId(null)
    }
  }

  async function asignarGuiaPedido(pedidoId: Id, numeroGuia: string) {
    setSavingPedidoId(pedidoId)
    try {
      await orderService.asignarGuia(pedidoId, numeroGuia)
      toast({ message: 'Guía asignada y cliente notificado', type: 'success' })
    } catch {
      toast({ message: 'No se pudo asignar la guía', type: 'error' })
    } finally {
      setSavingPedidoId(null)
    }
  }

  async function invitarMiembro(datos: { nombre: string; correo: string; telefono: string; rolEnEmpresa: string }) {
    if (!selected) return false
    setInvitandoMiembro(true)
    try {
      await adminService.invitarMiembroEmpresa(selected.id, datos)
      toast({ message: 'Invitación enviada — el nuevo miembro recibió su contraseña temporal por correo', type: 'success' })
      await recargarEquipo(selected.id)
      return true
    } catch {
      toast({ message: 'No se pudo enviar la invitación', type: 'error' })
      return false
    } finally {
      setInvitandoMiembro(false)
    }
  }

  async function cambiarRolMiembro(miembroId: Id, rolEnEmpresa: string) {
    if (!selected) return
    setSavingMiembroId(miembroId)
    try {
      await adminService.cambiarRolMiembroEmpresa(selected.id, miembroId, rolEnEmpresa)
      setTabEquipo((prev) => prev?.map((m) => (
        m.id === miembroId ? { ...m, rol: rolEnEmpresa } : m
      )) ?? null)
      toast({ message: `Rol actualizado a ${rolEnEmpresa}`, type: 'success' })
    } catch {
      toast({ message: 'No se pudo actualizar el rol', type: 'error' })
    } finally {
      setSavingMiembroId(null)
    }
  }

  async function eliminarMiembro(miembroId: Id) {
    if (!selected) return
    setSavingMiembroId(miembroId)
    try {
      await adminService.eliminarMiembroEmpresa(selected.id, miembroId)
      setTabEquipo((prev) => prev?.filter((m) => m.id !== miembroId) ?? null)
      toast({ message: 'Miembro eliminado del equipo', type: 'success' })
    } catch {
      toast({ message: 'No se pudo eliminar al miembro', type: 'error' })
    } finally {
      setSavingMiembroId(null)
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
    savingPedidoId,
    savingMiembroId,
    invitandoMiembro,
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
    cambiarEstadoPedido,
    asignarGuiaPedido,
    invitarMiembro,
    cambiarRolMiembro,
    eliminarMiembro,
  }
}
