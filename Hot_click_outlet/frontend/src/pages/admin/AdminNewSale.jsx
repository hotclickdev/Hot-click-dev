import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { productService } from '@/services/productService'
import { ventaService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import NewSaleTabs from './nueva-venta/NewSaleTabs'
import ProductPicker from './nueva-venta/ProductPicker'
import SaleSuccess from './nueva-venta/SaleSuccess'
import NewSaleHeader from './nueva-venta/NewSaleHeader'
import NewSalePanel from './nueva-venta/NewSalePanel'
import { useAdminNewSaleActions } from './nueva-venta/useAdminNewSaleActions'

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
    }).catch((err) => { console.error(err) }).finally(() => setLoading(false))
  }, [])

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const envioNum = Number(costoEnvio) || 0
  const total = subtotal + envioNum

  const {
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
  } = useAdminNewSaleActions({
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
  })

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
        <NewSaleHeader t={t} onVolver={() => navigate(-1)} />

        <NewSaleTabs tab={tab} onSwitch={switchTab} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProductPicker search={search} onSearch={setSearch} productos={filteredProducts} onAdd={addProduct} />

          <NewSalePanel
            t={t} tab={tab} clients={clients} clientId={clientId} clientName={clientName}
            showNewClient={showNewClient} newClientName={newClientName}
            newClientPhone={newClientPhone} creatingClient={creatingClient}
            cotNombre={cotNombre} cotTelefono={cotTelefono} cotNota={cotNota}
            waPreviewOpen={waPreviewOpen} waTab={waTab} waTexts={waTexts}
            paymentMethod={paymentMethod} tipoEntrega={tipoEntrega} estadoInicial={estadoInicial}
            items={items} costoEnvio={costoEnvio} envioNum={envioNum}
            subtotal={subtotal} total={total} saving={saving}
            onClientId={setClientId} onClientName={setClientName}
            onToggleNewClient={() => setShowNewClient((v) => !v)}
            onNewClientName={setNewClientName} onNewClientPhone={setNewClientPhone}
            onCreateClient={handleCreateClient}
            onNombre={setCotNombre} onTelefono={setCotTelefono} onNota={setCotNota}
            onClosePreview={() => setWaPreviewOpen(false)}
            onWaTab={setWaTab} onWaTexts={setWaTexts} onEnviar={enviarCotizacionWhatsapp}
            onPaymentMethod={setPaymentMethod} onTipoEntrega={setTipoEntrega}
            onEstadoInicial={setEstadoInicial}
            onUpdateQty={updateQty} onRemove={removeItem} onCostoEnvio={setCostoEnvio}
            onSaveCliente={() => handleSave(true)} onSaveRapida={() => handleSave(false)}
            onCotizar={openCotizacionPreview}
          />
        </div>
      </div>
    </>
  )
}
