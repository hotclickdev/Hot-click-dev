import CartItems from './CartItems'
import SaleEntregaPago from './SaleEntregaPago'
import TabCotizar from './TabCotizar'
import TabVentaCliente from './TabVentaCliente'
import TabVentaRapida from './TabVentaRapida'
import NewSaleResumen from './NewSaleResumen'

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
