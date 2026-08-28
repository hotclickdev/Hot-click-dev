import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { orderService } from '@/services/orderService'
import { adminService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import {
  ESTILO_INPUT_PEDIDO,
  FORM_PEDIDO_INICIAL,
  agregarItemPedido,
  mensajeErrorPedido,
  payloadPedidoManual,
  subtotalItemsPedido,
  type FormPedidoManual,
  type ItemFormPedido,
  type ProductoCrearPedido,
  type UsuarioCrearPedido,
} from './ordenesHelpers'

/**
 * Estado y handlers del modal crear pedido — bit-idéntico al original.
 */
export function useCrearPedido({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (newOrder: unknown) => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [users, setUsers] = useState<UsuarioCrearPedido[]>([])
  const [products, setProducts] = useState<ProductoCrearPedido[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [showUserDrop, setShowUserDrop] = useState(false)
  const [showProdDrop, setShowProdDrop] = useState(false)
  const prodRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState(FORM_PEDIDO_INICIAL)

  useEffect(() => {
    let cancelado = false
    Promise.all([adminService.getUsers(), productService.adminGetAll()])
      .then(([ur, pr]) => {
        if (cancelado) return
        const ud = (ur.data as { data?: unknown } | undefined)?.data ?? ur.data ?? []
        setUsers(Array.isArray(ud) ? ud as UsuarioCrearPedido[] : [])
        const pd = (pr.data as { content?: unknown } | undefined)?.content ?? pr.data ?? []
        setProducts(Array.isArray(pd) ? pd as ProductoCrearPedido[] : [])
      })
      .catch(() => { if (!cancelado) toast({ message: t('adminOrders.errorLoading'), type: 'error' }) })
      .finally(() => { if (!cancelado) setLoadingData(false) })
    return () => { cancelado = true }
  }, [toast, t])

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (prodRef.current && !prodRef.current.contains(e.target as Node)) setShowProdDrop(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const setCampo = <K extends keyof FormPedidoManual>(k: K, v: FormPedidoManual[K]) => setForm((f) => ({ ...f, [k]: v }))

  const addProduct = (prod: ProductoCrearPedido) => {
    setForm((f) => ({ ...f, items: agregarItemPedido(f.items, prod) }))
    setProdSearch('')
    setShowProdDrop(false)
  }

  const removeItem = (id: ItemFormPedido['productoId']) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.productoId !== id) }))
  const updateItem = (id: ItemFormPedido['productoId'], field: 'cantidad' | 'precioUnitario', val: string) =>
    setForm((f) => ({ ...f, items: f.items.map((i) => i.productoId === id ? { ...i, [field]: val } : i) }))

  const costoEnvioNum = form.metodoEnvio === 'ENVIO_A_DOMICILIO' ? (Number.parseInt(form.costoEnvio) || 0) : 0
  const subtotal = subtotalItemsPedido(form.items)
  const total = subtotal + costoEnvioNum

  const filteredUsers = users.filter((u) =>
    (u.nombre ?? '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.correo ?? '').toLowerCase().includes(userSearch.toLowerCase())
  ).slice(0, 6)

  const filteredProds = prodSearch.length > 1
    ? products.filter((p) =>
        (p.nombre ?? p.nombreProducto ?? '').toLowerCase().includes(prodSearch.toLowerCase())
      ).slice(0, 6)
    : []

  const selectedUser = users.find((u) => u.id === Number(form.usuarioId))
  const canSubmit = form.usuarioId && form.items.length > 0

  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const res = await orderService.createManual(payloadPedidoManual(form, costoEnvioNum))
      const newOrd = (res.data as { data?: unknown } | null)?.data ?? res.data
      toast({ message: t('adminOrders.orderCreated'), type: 'success' })
      onCreated(newOrd)
      onClose()
    } catch (err: unknown) {
      toast({ message: mensajeErrorPedido(err) ?? t('adminOrders.errorCreate'), type: 'error' })
    } finally { setSaving(false) }
  }

  return {
    t,
    saving,
    loadingData,
    form,
    inp: ESTILO_INPUT_PEDIDO,
    selectedUser,
    userSearch,
    showUserDrop,
    filteredUsers,
    prodRef,
    prodSearch,
    showProdDrop,
    filteredProds,
    subtotal,
    costoEnvioNum,
    total,
    canSubmit,
    setCampo,
    addProduct,
    removeItem,
    updateItem,
    setUserSearch,
    setShowUserDrop,
    setProdSearch,
    setShowProdDrop,
    submit,
  }
}
