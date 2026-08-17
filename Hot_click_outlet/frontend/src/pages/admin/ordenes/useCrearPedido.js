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
  payloadPedidoManual,
  subtotalItemsPedido,
} from './ordenesHelpers'

/**
 * Estado y handlers del modal crear pedido — bit-idéntico al original.
 * @param {object} args
 */
export function useCrearPedido({ onClose, onCreated }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [prodSearch, setProdSearch] = useState('')
  const [showUserDrop, setShowUserDrop] = useState(false)
  const [showProdDrop, setShowProdDrop] = useState(false)
  const prodRef = useRef(null)
  const [form, setForm] = useState(FORM_PEDIDO_INICIAL)

  useEffect(() => {
    let cancelado = false
    Promise.all([adminService.getUsers(), productService.adminGetAll()])
      .then(([ur, pr]) => {
        if (cancelado) return
        const ud = ur.data?.data ?? ur.data ?? []
        setUsers(Array.isArray(ud) ? ud : [])
        const pd = pr.data?.content ?? pr.data ?? []
        setProducts(Array.isArray(pd) ? pd : [])
      })
      .catch(() => { if (!cancelado) toast({ message: t('adminOrders.errorLoading'), type: 'error' }) })
      .finally(() => { if (!cancelado) setLoadingData(false) })
    return () => { cancelado = true }
  }, [toast, t])

  useEffect(() => {
    function outside(e) {
      if (prodRef.current && !prodRef.current.contains(e.target)) setShowProdDrop(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const setCampo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addProduct = (prod) => {
    setForm((f) => ({ ...f, items: agregarItemPedido(f.items, prod) }))
    setProdSearch('')
    setShowProdDrop(false)
  }

  const removeItem = (id) => setForm((f) => ({ ...f, items: f.items.filter((i) => i.productoId !== id) }))
  const updateItem = (id, field, val) =>
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
      const newOrd = res.data?.data ?? res.data
      toast({ message: t('adminOrders.orderCreated'), type: 'success' })
      onCreated(newOrd)
      onClose()
    } catch (e) {
      toast({ message: e.response?.data?.message ?? t('adminOrders.errorCreate'), type: 'error' })
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
