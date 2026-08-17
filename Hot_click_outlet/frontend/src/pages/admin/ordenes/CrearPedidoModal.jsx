import Spinner from '@/components/ui/Spinner'
import CloseX from './CloseX'
import CrearPedidoCampos from './CrearPedidoCampos'
import CrearPedidoCliente from './CrearPedidoCliente'
import CrearPedidoProductos from './CrearPedidoProductos'
import CrearPedidoResumen from './CrearPedidoResumen'
import { useCrearPedido } from './useCrearPedido'

export default function CrearPedidoModal({ onClose, onCreated }) {
  const {
    t,
    saving,
    loadingData,
    form,
    inp,
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
  } = useCrearPedido({ onClose, onCreated })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}>

      <div className="h-full w-full max-w-lg flex flex-col overflow-hidden"
        style={{ backgroundColor: 'var(--hc-surface)', borderLeft: '1px solid var(--hc-border)' }}>

        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--hc-border)' }}>
          <h2 className="text-base font-bold text-[var(--hc-text)]">{t('adminOrders.newOrderTitle')}</h2>
          <button type="button" onClick={onClose} className="text-[var(--hc-muted)] hover:text-[var(--hc-text)] transition-colors" aria-label="Cerrar">
            <CloseX />
          </button>
        </div>

        {loadingData ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <CrearPedidoCliente
              selectedUser={selectedUser}
              userSearch={userSearch}
              showUserDrop={showUserDrop}
              filteredUsers={filteredUsers}
              inp={inp}
              onClear={() => { setCampo('usuarioId', ''); setUserSearch(''); setShowUserDrop(true) }}
              onSearch={(v) => { setUserSearch(v); setShowUserDrop(true) }}
              onPick={(id) => { setCampo('usuarioId', id); setShowUserDrop(false); setUserSearch('') }}
            />
            <CrearPedidoProductos
              prodRef={prodRef}
              prodSearch={prodSearch}
              showProdDrop={showProdDrop}
              filteredProds={filteredProds}
              items={form.items}
              inp={inp}
              onSearch={(v) => { setProdSearch(v); setShowProdDrop(true) }}
              onAdd={addProduct}
              onRemove={removeItem}
              onUpdateItem={updateItem}
            />
            <CrearPedidoCampos form={form} setCampo={setCampo} inp={inp} />
            {form.items.length > 0 && (
              <CrearPedidoResumen subtotal={subtotal} costoEnvioNum={costoEnvioNum} total={total} />
            )}
          </div>
        )}

        <div className="px-5 py-4 border-t shrink-0 flex gap-3" style={{ borderColor: 'var(--hc-border)' }}>
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
            {t('importExport.cancel')}
          </button>
          <button type="button" onClick={submit} disabled={saving || !canSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}>
            {saving ? t('adminOrders.creating') : t('adminOrders.createOrder')}
          </button>
        </div>
      </div>
    </div>
  )
}
