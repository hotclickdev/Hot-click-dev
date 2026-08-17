import { useCallback } from 'react'
import { crmService } from '@/services/crmService'
import { ventaService } from '@/services/orderService'
import {
  WHATSAPP,
  actualizarCantidadCarrito,
  agregarItemCarrito,
  buildCotizacionTemplates,
  filtrarProductosConStock,
} from './nuevaVentaHelpers'

/**
 * Handlers nueva venta admin — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminNewSaleActions(deps) {
  const {
    toast,
    items,
    clientId,
    clientName,
    newClientName,
    newClientPhone,
    paymentMethod,
    tipoEntrega,
    estadoInicial,
    envioNum,
    subtotal,
    total,
    cotNombre,
    cotTelefono,
    cotNota,
    waTexts,
    waTab,
    products,
    search,
    setTab,
    setClients,
    setClientId,
    setClientName,
    setShowNewClient,
    setNewClientName,
    setNewClientPhone,
    setCreatingClient,
    setSaving,
    setCreatedOrder,
    setItems,
    setCostoEnvio,
    setTipoEntrega,
    setEstadoInicial,
    setWaTexts,
    setWaTab,
    setWaPreviewOpen,
  } = deps

  const switchTab = useCallback((id) => {
    setTab(id)
    setItems([])
    setCostoEnvio('')
    setTipoEntrega('LOCAL')
    setEstadoInicial('COMPLETADO')
  }, [setCostoEnvio, setEstadoInicial, setItems, setTab, setTipoEntrega])

  const handleCreateClient = useCallback(async () => {
    if (!newClientName.trim()) {
      toast({ message: 'Indica el nombre del cliente', type: 'error' }); return
    }
    setCreatingClient(true)
    try {
      const nuevo = await crmService.crearCliente({ nombre: newClientName.trim(), telefono: newClientPhone })
      setClients((prev) => [nuevo, ...prev])
      setClientId(String(nuevo.id))
      setClientName('')
      setShowNewClient(false)
      setNewClientName('')
      setNewClientPhone('')
      toast({ message: 'Cliente creado', type: 'success' })
    } catch {
      toast({ message: 'No se pudo crear el cliente', type: 'error' })
    } finally {
      setCreatingClient(false)
    }
  }, [
    newClientName,
    newClientPhone,
    setClientId,
    setClientName,
    setClients,
    setCreatingClient,
    setNewClientName,
    setNewClientPhone,
    setShowNewClient,
    toast,
  ])

  const filteredProducts = filtrarProductosConStock(products, search)
  const addProduct = useCallback((p) => setItems((prev) => agregarItemCarrito(prev, p)), [setItems])
  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), [setItems])
  const updateQty = useCallback((id, val) => setItems((prev) => actualizarCantidadCarrito(prev, id, val)), [setItems])

  const handleSave = useCallback(async (withClient) => {
    if (items.length === 0) { toast({ message: 'Agrega al menos un producto', type: 'error' }); return }
    if (withClient && !clientId && !clientName.trim()) {
      toast({ message: 'Indica el cliente o su nombre', type: 'error' }); return
    }
    setSaving(true)
    try {
      const payload = {
        clienteId: withClient ? (clientId || null) : null,
        nombreCliente: withClient ? clientName : 'Venta rápida',
        metodoPago: paymentMethod,
        tipoEntrega,
        estadoInicial,
        items: items.map((i) => ({ productoId: i.id, cantidad: i.cantidad, precioUnitario: i.precio })),
        costoEnvio: envioNum,
        total,
      }
      await ventaService.create(payload)
      toast({ message: 'Venta registrada con éxito', type: 'success' })
      setCreatedOrder({
        estado: estadoInicial,
        esRetiro: tipoEntrega === 'LOCAL',
        nombreCliente: withClient ? clientName || 'Cliente' : 'Venta rápida',
        metodoPago: paymentMethod,
        items: [...items],
        subtotal,
        costoEnvio: envioNum,
        total,
      })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al registrar venta', type: 'error' })
    } finally { setSaving(false) }
  }, [
    clientId,
    clientName,
    envioNum,
    estadoInicial,
    items,
    paymentMethod,
    setCreatedOrder,
    setSaving,
    subtotal,
    tipoEntrega,
    toast,
    total,
  ])

  const openCotizacionPreview = useCallback(() => {
    if (items.length === 0) { toast({ message: 'Agrega al menos un producto', type: 'error' }); return }
    setWaTexts(buildCotizacionTemplates({ items, cotNombre, cotTelefono, cotNota, subtotal, envioNum, total }))
    setWaTab('formal')
    setWaPreviewOpen(true)
  }, [cotNombre, cotNota, cotTelefono, envioNum, items, setWaPreviewOpen, setWaTab, setWaTexts, subtotal, toast, total])

  const enviarCotizacionWhatsapp = useCallback(() => {
    const texto = waTexts?.[waTab] ?? ''
    globalThis.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank')
    setWaPreviewOpen(false)
  }, [setWaPreviewOpen, waTab, waTexts])

  const resetNuevaVenta = useCallback(() => {
    setCreatedOrder(null)
    setItems([])
    setCostoEnvio('')
    setClientId('')
    setClientName('')
    setTipoEntrega('LOCAL')
  }, [setClientId, setClientName, setCostoEnvio, setCreatedOrder, setItems, setTipoEntrega])

  return {
    switchTab,
    handleCreateClient,
    filteredProducts,
    addProduct,
    removeItem,
    updateQty,
    handleSave,
    openCotizacionPreview,
    enviarCotizacionWhatsapp,
    resetNuevaVenta,
  }
}
