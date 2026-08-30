import { useCallback, type Dispatch, type SetStateAction } from 'react'
import { crmService } from '@/services/crmService'
import { ventaService } from '@/services/orderService'
import type { JsonBody } from '@/types/api'
import type { PedidoCreate } from '@/types/pedido'
import type { Producto } from '@/types/producto'
import {
  WHATSAPP,
  actualizarCantidadCarrito,
  agregarItemCarrito,
  buildCotizacionTemplates,
  filtrarProductosConStock,
  mensajeErrorVenta,
  type ClienteVenta,
  type CotizacionTemplates,
  type CreatedOrderVenta,
  type ItemCarritoVenta,
  type TabVentaId,
  type WaTabKey,
} from './nuevaVentaHelpers'

type ToastNuevaVenta = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void

export type AdminNewSaleActionsDeps = {
  toast: ToastNuevaVenta
  items: ItemCarritoVenta[]
  clientId: string
  clientName: string
  newClientName: string
  newClientPhone: string
  paymentMethod: string
  tipoEntrega: string
  estadoInicial: string
  envioNum: number
  subtotal: number
  total: number
  cotNombre: string
  cotTelefono: string
  cotNota: string
  waTexts: CotizacionTemplates | null
  waTab: WaTabKey
  products: Producto[]
  search: string
  setTab: Dispatch<SetStateAction<TabVentaId>>
  setClients: Dispatch<SetStateAction<ClienteVenta[]>>
  setClientId: Dispatch<SetStateAction<string>>
  setClientName: Dispatch<SetStateAction<string>>
  setShowNewClient: Dispatch<SetStateAction<boolean>>
  setNewClientName: Dispatch<SetStateAction<string>>
  setNewClientPhone: Dispatch<SetStateAction<string>>
  setCreatingClient: Dispatch<SetStateAction<boolean>>
  setSaving: Dispatch<SetStateAction<boolean>>
  setCreatedOrder: Dispatch<SetStateAction<CreatedOrderVenta | null>>
  setItems: Dispatch<SetStateAction<ItemCarritoVenta[]>>
  setCostoEnvio: Dispatch<SetStateAction<string>>
  setTipoEntrega: Dispatch<SetStateAction<string>>
  setEstadoInicial: Dispatch<SetStateAction<string>>
  setWaTexts: Dispatch<SetStateAction<CotizacionTemplates | null>>
  setWaTab: Dispatch<SetStateAction<WaTabKey>>
  setWaPreviewOpen: Dispatch<SetStateAction<boolean>>
}

/**
 * Handlers nueva venta admin — bit-idéntico al original.
 */
export function useAdminNewSaleActions(deps: AdminNewSaleActionsDeps) {
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

  const switchTab = useCallback((id: TabVentaId) => {
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
      const nuevo = await crmService.crearCliente({ nombre: newClientName.trim(), telefono: newClientPhone } as JsonBody) as ClienteVenta
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
  const addProduct = useCallback((p: Producto) => setItems((prev) => agregarItemCarrito(prev, p)), [setItems])
  const removeItem = useCallback((id: Producto['id']) => setItems((prev) => prev.filter((i) => i.id !== id)), [setItems])
  const updateQty = useCallback((id: Producto['id'], val: string) => setItems((prev) => actualizarCantidadCarrito(prev, id, val)), [setItems])

  const handleSave = useCallback(async (withClient: boolean) => {
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
      await ventaService.create(payload as PedidoCreate)
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
    } catch (err: unknown) {
      toast({ message: mensajeErrorVenta(err, 'Error al registrar venta'), type: 'error' })
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
