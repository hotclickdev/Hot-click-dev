import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { productService } from '@/services/productService'
import { ventaService } from '@/services/orderService'
import { crmService } from '@/services/crmService'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import CartItems from './nueva-venta/CartItems'
import NewSaleTabs from './nueva-venta/NewSaleTabs'
import ProductPicker from './nueva-venta/ProductPicker'
import SaleEntregaPago from './nueva-venta/SaleEntregaPago'
import SaleSuccess from './nueva-venta/SaleSuccess'
import TabCotizar from './nueva-venta/TabCotizar'
import TabVentaCliente from './nueva-venta/TabVentaCliente'
import TabVentaRapida from './nueva-venta/TabVentaRapida'
import { BoltIcon, WhatsAppIcon } from './nueva-venta/nuevaVentaIcons'
import {
  WHATSAPP,
  actualizarCantidadCarrito,
  agregarItemCarrito,
  buildCotizacionTemplates,
  filtrarProductosConStock,
} from './nueva-venta/nuevaVentaHelpers'

export default function AdminNewSale() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('cliente')
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)

  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO')

  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [showNewClient, setShowNewClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientPhone, setNewClientPhone] = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  const [cotNombre, setCotNombre] = useState('')
  const [cotTelefono, setCotTelefono] = useState('')
  const [cotNota, setCotNota] = useState('')

  const [costoEnvio, setCostoEnvio] = useState('')
  const [tipoEntrega, setTipoEntrega] = useState('LOCAL')
  const [estadoInicial, setEstadoInicial] = useState('COMPLETADO')

  const [waPreviewOpen, setWaPreviewOpen] = useState(false)
  const [waTab, setWaTab] = useState('formal')
  const [waTexts, setWaTexts] = useState(null)

  useEffect(() => {
    Promise.all([
      productService.adminGetAll(0, 500),
      ventaService.getClientes(),
    ]).then(([{ data: prods }, { data: cl }]) => {
      setProducts(prods.content ?? prods ?? [])
      setClients(Array.isArray(cl) ? cl : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const switchTab = (id) => { setTab(id); setItems([]); setCostoEnvio(''); setTipoEntrega('LOCAL'); setEstadoInicial('COMPLETADO') }

  const handleCreateClient = async () => {
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
  }

  const filteredProducts = filtrarProductosConStock(products, search)
  const addProduct = (p) => setItems((prev) => agregarItemCarrito(prev, p))
  const removeItem = (id) => setItems((prev) => prev.filter((i) => i.id !== id))
  const updateQty = (id, val) => setItems((prev) => actualizarCantidadCarrito(prev, id, val))

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const envioNum = Number(costoEnvio) || 0
  const total = subtotal + envioNum

  const handleSave = async (withClient) => {
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
  }

  const openCotizacionPreview = () => {
    if (items.length === 0) { toast({ message: 'Agrega al menos un producto', type: 'error' }); return }
    setWaTexts(buildCotizacionTemplates({ items, cotNombre, cotTelefono, cotNota, subtotal, envioNum, total }))
    setWaTab('formal')
    setWaPreviewOpen(true)
  }

  const enviarCotizacionWhatsapp = () => {
    const texto = waTexts?.[waTab] ?? ''
    globalThis.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`, '_blank')
    setWaPreviewOpen(false)
  }

  const resetNuevaVenta = () => {
    setCreatedOrder(null)
    setItems([])
    setCostoEnvio('')
    setClientId('')
    setClientName('')
    setTipoEntrega('LOCAL')
  }

  if (loading) return <><div className="flex justify-center py-20"><Spinner size="lg" /></div></>

  if (createdOrder) {
    return (
      <SaleSuccess
        createdOrder={createdOrder}
        onNuevaVenta={resetNuevaVenta}
        onVerPedidos={() => navigate('/admin/pedidos')}
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-[#e8e8ed]">{t('admin.sales.title')}</span>
            </h1>
            <p className="text-sm text-[#8e8e9a] mt-1">Registra una venta, venta rápida o cotización por WhatsApp</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="shrink-0">
            ← Volver
          </Button>
        </div>

        <NewSaleTabs tab={tab} onSwitch={switchTab} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductPicker search={search} onSearch={setSearch} productos={filteredProducts} onAdd={addProduct} />

          <div className="space-y-4">
            {tab === 'cliente' && (
              <TabVentaCliente
                clients={clients}
                clientId={clientId}
                clientName={clientName}
                showNewClient={showNewClient}
                newClientName={newClientName}
                newClientPhone={newClientPhone}
                creatingClient={creatingClient}
                onClientId={setClientId}
                onClientName={setClientName}
                onToggleNewClient={() => setShowNewClient((v) => !v)}
                onNewClientName={setNewClientName}
                onNewClientPhone={setNewClientPhone}
                onCreateClient={handleCreateClient}
              />
            )}
            {tab === 'rapida' && <TabVentaRapida />}
            {tab === 'cotizar' && (
              <TabCotizar
                cotNombre={cotNombre}
                cotTelefono={cotTelefono}
                cotNota={cotNota}
                onNombre={setCotNombre}
                onTelefono={setCotTelefono}
                onNota={setCotNota}
                waPreviewOpen={waPreviewOpen}
                waTab={waTab}
                waTexts={waTexts}
                onClosePreview={() => setWaPreviewOpen(false)}
                onWaTab={setWaTab}
                onWaTexts={setWaTexts}
                onEnviar={enviarCotizacionWhatsapp}
              />
            )}

            {tab !== 'cotizar' && (
              <SaleEntregaPago
                paymentMethod={paymentMethod}
                tipoEntrega={tipoEntrega}
                estadoInicial={estadoInicial}
                onPaymentMethod={setPaymentMethod}
                onTipoEntrega={setTipoEntrega}
                onEstadoInicial={setEstadoInicial}
              />
            )}

            <CartItems items={items} onUpdateQty={updateQty} onRemove={removeItem} />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Costo de envío <span className="normal-case font-normal">(opcional)</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8e8e9a] pointer-events-none">₡</span>
                <input
                  type="number"
                  min="0"
                  value={costoEnvio}
                  onChange={(e) => setCostoEnvio(e.target.value)}
                  placeholder="0"
                  className="w-full h-11 pl-7 pr-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/8 space-y-1">
              {envioNum > 0 && (
                <>
                  <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
                    <span>Subtotal productos</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-[#8e8e9a]">
                    <span>Costo de envío</span>
                    <span>{formatPrice(envioNum)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center font-bold text-[#e8e8ed]">
                <span className="text-sm">{t('admin.sales.total')}</span>
                <span className="text-xl">{formatPrice(total)}</span>
              </div>
            </div>

            {tab === 'cliente' && (
              <Button
                type="button"
                loading={saving}
                size="lg"
                className="w-full"
                disabled={items.length === 0}
                onClick={() => handleSave(true)}
              >
                {t('admin.sales.submit')}
              </Button>
            )}
            {tab === 'rapida' && (
              <Button
                type="button"
                loading={saving}
                size="lg"
                className="w-full bg-amber-500 hover:bg-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                disabled={items.length === 0}
                onClick={() => handleSave(false)}
              >
                <BoltIcon />
                {t('admin.sales.submit')}
              </Button>
            )}
            {tab === 'cotizar' && (
              <Button
                type="button"
                size="lg"
                className="w-full bg-[#25D366] hover:bg-[#1da851] shadow-[0_0_20px_rgba(37,211,102,0.25)]"
                disabled={items.length === 0}
                onClick={openCotizacionPreview}
              >
                <WhatsAppIcon />
                Enviar Cotización por WhatsApp
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
