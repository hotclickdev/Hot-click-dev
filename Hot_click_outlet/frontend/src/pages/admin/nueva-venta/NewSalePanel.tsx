import CartItems from './CartItems'
import SaleEntregaPago from './SaleEntregaPago'
import TabCotizar from './TabCotizar'
import TabVentaCliente from './TabVentaCliente'
import TabVentaRapida from './TabVentaRapida'
import NewSaleResumen from './NewSaleResumen'
import type { TFunction } from 'i18next'
import type { Dispatch, SetStateAction } from 'react'
import type { Producto } from '@/types/producto'
import type {
  ClienteVenta,
  CotizacionTemplates,
  ItemCarritoVenta,
  TabVentaId,
  WaTabKey,
} from './nuevaVentaHelpers'

/**
 * Columna derecha de nueva venta (cliente/tabs, entrega, carrito, totales).
 */
export default function NewSalePanel({
  t, tab, clients, clientId, clientName, showNewClient,
  newClientName, newClientPhone, creatingClient,
  cotNombre, cotTelefono, cotNota, waPreviewOpen, waTab, waTexts,
  paymentMethod, tipoEntrega, estadoInicial,
  items, costoEnvio, envioNum, subtotal, total, saving,
  onClientId, onClientName, onToggleNewClient, onNewClientName, onNewClientPhone, onCreateClient,
  onNombre, onTelefono, onNota, onClosePreview, onWaTab, onWaTexts, onEnviar,
  onPaymentMethod, onTipoEntrega, onEstadoInicial,
  onUpdateQty, onRemove, onCostoEnvio, onSaveCliente, onSaveRapida, onCotizar,
}: {
  t: TFunction
  tab: TabVentaId
  clients: ClienteVenta[]
  clientId: string
  clientName: string
  showNewClient: boolean
  newClientName: string
  newClientPhone: string
  creatingClient: boolean
  cotNombre: string
  cotTelefono: string
  cotNota: string
  waPreviewOpen: boolean
  waTab: WaTabKey
  waTexts: CotizacionTemplates | null
  paymentMethod: string
  tipoEntrega: string
  estadoInicial: string
  items: ItemCarritoVenta[]
  costoEnvio: string
  envioNum: number
  subtotal: number
  total: number
  saving: boolean
  onClientId: (id: string) => void
  onClientName: (nombre: string) => void
  onToggleNewClient: () => void
  onNewClientName: (nombre: string) => void
  onNewClientPhone: (telefono: string) => void
  onCreateClient: () => void
  onNombre: (v: string) => void
  onTelefono: (v: string) => void
  onNota: (v: string) => void
  onClosePreview: () => void
  onWaTab: (key: WaTabKey) => void
  onWaTexts: Dispatch<SetStateAction<CotizacionTemplates | null>>
  onEnviar: () => void
  onPaymentMethod: (v: string) => void
  onTipoEntrega: (v: string) => void
  onEstadoInicial: (v: string) => void
  onUpdateQty: (id: Producto['id'], val: string) => void
  onRemove: (id: Producto['id']) => void
  onCostoEnvio: (v: string) => void
  onSaveCliente: () => void
  onSaveRapida: () => void
  onCotizar: () => void
}) {
  return (
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
          onClientId={onClientId}
          onClientName={onClientName}
          onToggleNewClient={onToggleNewClient}
          onNewClientName={onNewClientName}
          onNewClientPhone={onNewClientPhone}
          onCreateClient={onCreateClient}
        />
      )}
      {tab === 'rapida' && <TabVentaRapida />}
      {tab === 'cotizar' && (
        <TabCotizar
          cotNombre={cotNombre}
          cotTelefono={cotTelefono}
          cotNota={cotNota}
          onNombre={onNombre}
          onTelefono={onTelefono}
          onNota={onNota}
          waPreviewOpen={waPreviewOpen}
          waTab={waTab}
          waTexts={waTexts}
          onClosePreview={onClosePreview}
          onWaTab={onWaTab}
          onWaTexts={onWaTexts}
          onEnviar={onEnviar}
        />
      )}

      {tab !== 'cotizar' && (
        <SaleEntregaPago
          paymentMethod={paymentMethod}
          tipoEntrega={tipoEntrega}
          estadoInicial={estadoInicial}
          onPaymentMethod={onPaymentMethod}
          onTipoEntrega={onTipoEntrega}
          onEstadoInicial={onEstadoInicial}
        />
      )}

      <CartItems items={items} onUpdateQty={onUpdateQty} onRemove={onRemove} />

      <NewSaleResumen
        t={t} tab={tab} costoEnvio={costoEnvio} envioNum={envioNum}
        subtotal={subtotal} total={total} saving={saving}
        itemsLength={items.length}
        onCostoEnvio={onCostoEnvio}
        onSaveCliente={onSaveCliente}
        onSaveRapida={onSaveRapida}
        onCotizar={onCotizar}
      />
    </div>
  )
}
