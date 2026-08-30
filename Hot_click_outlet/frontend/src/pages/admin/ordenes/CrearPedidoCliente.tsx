import { useTranslation } from 'react-i18next'
import CloseX from './CloseX'
import type { CSSProperties } from 'react'
import type { Id } from '@/types/api'
import type { UsuarioCrearPedido } from './ordenesHelpers'

export default function CrearPedidoCliente({ selectedUser, userSearch, showUserDrop, filteredUsers, inp, onClear, onSearch, onPick }: {
  selectedUser: UsuarioCrearPedido | undefined
  userSearch: string
  showUserDrop: boolean
  filteredUsers: UsuarioCrearPedido[]
  inp: CSSProperties
  onClear: () => void
  onSearch: (v: string) => void
  onPick: (id: Id) => void
}) {
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
          <button type="button" onClick={onClear} className="text-[var(--hc-muted)] hover:text-[#a8291f] transition-colors" aria-label="Quitar cliente">
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
              <button type="button" key={u.id}
                onMouseDown={() => onPick(u.id as Id)}
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
