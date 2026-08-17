import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { orderService } from '@/services/orderService'
import { adminService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { useToast } from '@/components/ui/Toast'
import { formatPrice } from '@/utils/format'
import CloseX from './CloseX'
import {
  ESTADOS_INICIAL,
  ESTILO_INPUT_PEDIDO,
  FORM_PEDIDO_INICIAL,
  METODOS_ENVIO,
  METODOS_PAGO,
  agregarItemPedido,
  payloadPedidoManual,
  subtotalItemsPedido,
} from './ordenesHelpers'

export default function CrearPedidoModal({ onClose, onCreated }) {
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

  const inp = ESTILO_INPUT_PEDIDO

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
          <button onClick={onClose} className="text-[var(--hc-muted)] hover:text-[var(--hc-text)] transition-colors" aria-label="Cerrar">
            <CloseX />
          </button>
        </div>

        {loadingData ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <ClienteCampo
              selectedUser={selectedUser}
              userSearch={userSearch}
              showUserDrop={showUserDrop}
              filteredUsers={filteredUsers}
              inp={inp}
              onClear={() => { setCampo('usuarioId', ''); setUserSearch(''); setShowUserDrop(true) }}
              onSearch={(v) => { setUserSearch(v); setShowUserDrop(true) }}
              onPick={(id) => { setCampo('usuarioId', id); setShowUserDrop(false); setUserSearch('') }}
            />

            <ProductosCampo
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.paymentMethod')}</label>
                <select value={form.metodoPago} onChange={(e) => setCampo('metodoPago', e.target.value)}
                  className="w-full h-10 px-2 rounded-xl text-sm focus:outline-none" style={inp}>
                  {METODOS_PAGO.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.initialStatus')}</label>
                <select value={form.estadoPedido} onChange={(e) => setCampo('estadoPedido', e.target.value)}
                  className="w-full h-10 px-2 rounded-xl text-sm focus:outline-none" style={inp}>
                  {ESTADOS_INICIAL.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.shippingMethod')}</label>
              <div className="flex gap-2">
                {METODOS_ENVIO.map((m) => (
                  <button key={m.value}
                    onClick={() => setCampo('metodoEnvio', m.value)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      backgroundColor: form.metodoEnvio === m.value ? 'color-mix(in srgb, var(--hc-accent) 15%, transparent)' : 'var(--hc-glass-bg)',
                      border: `1px solid ${form.metodoEnvio === m.value ? 'color-mix(in srgb, var(--hc-accent) 45%, transparent)' : 'var(--hc-border)'}`,
                      color: form.metodoEnvio === m.value ? 'var(--hc-accent)' : 'var(--hc-muted)',
                    }}>
                    {t(m.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {form.metodoEnvio === 'ENVIO_A_DOMICILIO' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.shippingCostLabel')}</label>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--hc-muted)]">₡</span>
                  <input
                    type="number" min={0} step={500}
                    value={form.costoEnvio}
                    onChange={(e) => setCampo('costoEnvio', e.target.value)}
                    placeholder="Ej: 4000"
                    className="flex-1 h-10 px-3 rounded-xl text-sm focus:outline-none"
                    style={inp}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.orderNotes')}</label>
              <textarea
                value={form.notas}
                onChange={(e) => setCampo('notas', e.target.value)}
                rows={2}
                placeholder={t('adminOrders.notesPlaceholder')}
                className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none"
                style={inp}
              />
            </div>

            {form.items.length > 0 && (
              <ResumenPedido subtotal={subtotal} costoEnvioNum={costoEnvioNum} total={total} />
            )}
          </div>
        )}

        <div className="px-5 py-4 border-t shrink-0 flex gap-3" style={{ borderColor: 'var(--hc-border)' }}>
          <button onClick={onClose} disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
            {t('importExport.cancel')}
          </button>
          <button onClick={submit} disabled={saving || !canSubmit}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ backgroundColor: 'var(--hc-accent)', color: 'white' }}>
            {saving ? t('adminOrders.creating') : t('adminOrders.createOrder')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClienteCampo({ selectedUser, userSearch, showUserDrop, filteredUsers, inp, onClear, onSearch, onPick }) {
  const { t } = useTranslation()
  if (selectedUser) {
    return (
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.clientLabel')}</label>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 30%, transparent)' }}>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--hc-text)]">{selectedUser.nombre}</p>
            <p className="text-xs text-[var(--hc-muted)]">{selectedUser.correo}</p>
          </div>
          <button onClick={onClear} className="text-[var(--hc-muted)] hover:text-[#a8291f] transition-colors" aria-label="Quitar cliente">
            <CloseX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.clientLabel')}</label>
      <div className="relative">
        <input
          type="text"
          value={userSearch}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => onSearch(userSearch)}
          placeholder={t('adminOrders.clientSearch')}
          className="w-full h-10 px-3 rounded-xl text-sm placeholder:text-[var(--hc-muted)] focus:outline-none"
          style={inp}
        />
        {showUserDrop && filteredUsers.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
            {filteredUsers.map((u) => (
              <button key={u.id}
                onMouseDown={() => onPick(u.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-[var(--hc-surface-2)] transition-colors">
                <p className="text-sm text-[var(--hc-text)]">{u.nombre}</p>
                <p className="text-xs text-[var(--hc-muted)]">{u.correo}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductosCampo({ prodRef, prodSearch, showProdDrop, filteredProds, items, inp, onSearch, onAdd, onRemove, onUpdateItem }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest">{t('adminOrders.productsLabel')}</label>
      <div className="relative" ref={prodRef}>
        <input
          type="text"
          value={prodSearch}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => onSearch(prodSearch)}
          placeholder={t('adminOrders.searchProduct')}
          className="w-full h-10 px-3 rounded-xl text-sm placeholder:text-[var(--hc-muted)] focus:outline-none"
          style={inp}
        />
        {showProdDrop && filteredProds.length > 0 && (
          <div className="absolute z-10 top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
            {filteredProds.map((p) => {
              const id = p.id ?? p.productoId
              return (
                <button key={id}
                  onMouseDown={() => onAdd(p)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-[var(--hc-surface-2)] transition-colors">
                  {p.imagenUrl && <img src={p.imagenUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--hc-text)] truncate">{p.nombre ?? p.nombreProducto}</p>
                    <p className="text-xs text-[var(--hc-muted)]">{formatPrice(p.precio ?? p.precioVenta ?? 0)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2 mt-2">
          {items.map((item) => (
            <div key={item.productoId} className="rounded-xl px-3 py-2.5 space-y-2"
              style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-[var(--hc-text)] flex-1 leading-tight">{item.nombre}</p>
                <button onClick={() => onRemove(item.productoId)}
                  className="text-[#a8291f] shrink-0 hover:opacity-80" aria-label="Quitar producto">
                  <CloseX className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[var(--hc-muted)]">{t('adminOrders.quantity')}</span>
                  <input type="number" min={1}
                    value={item.cantidad}
                    onChange={(e) => onUpdateItem(item.productoId, 'cantidad', e.target.value)}
                    className="w-16 h-8 px-2 rounded-lg text-sm text-center focus:outline-none"
                    style={inp}
                  />
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-[var(--hc-muted)]">₡</span>
                  <input type="number" min={0}
                    value={item.precioUnitario}
                    onChange={(e) => onUpdateItem(item.productoId, 'precioUnitario', e.target.value)}
                    className="flex-1 h-8 px-2 rounded-lg text-sm focus:outline-none"
                    style={inp}
                  />
                </div>
                <span className="text-xs text-[var(--hc-muted)] self-center shrink-0">
                  = {formatPrice((Number.parseInt(item.precioUnitario) || 0) * (Number.parseInt(item.cantidad) || 0))}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ResumenPedido({ subtotal, costoEnvioNum, total }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ backgroundColor: 'var(--hc-glass-bg)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs font-semibold text-[var(--hc-muted)] uppercase tracking-widest mb-2">{t('adminOrders.subtotal')}</p>
      <div className="flex justify-between text-sm text-[var(--hc-muted)]">
        <span>{t('adminOrders.productsLabel')}</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      {costoEnvioNum > 0 && (
        <div className="flex justify-between text-sm text-[var(--hc-muted)]">
          <span>{t('adminOrders.shippingCost')}</span>
          <span>{formatPrice(costoEnvioNum)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-bold text-[var(--hc-text)] pt-1 border-t" style={{ borderColor: 'var(--hc-border)' }}>
        <span>{t('adminOrders.total')}</span>
        <span>{formatPrice(total)}</span>
      </div>
    </div>
  )
}
