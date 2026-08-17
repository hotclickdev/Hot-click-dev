import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'

/**
 * @param {{
 *   clients: object[]
 *   clientId: string
 *   clientName: string
 *   showNewClient: boolean
 *   newClientName: string
 *   newClientPhone: string
 *   creatingClient: boolean
 *   onClientId: (id: string) => void
 *   onClientName: (nombre: string) => void
 *   onToggleNewClient: () => void
 *   onNewClientName: (nombre: string) => void
 *   onNewClientPhone: (telefono: string) => void
 *   onCreateClient: () => void
 * }} props
 */
export default function TabVentaCliente({
  clients,
  clientId,
  clientName,
  showNewClient,
  newClientName,
  newClientPhone,
  creatingClient,
  onClientId,
  onClientName,
  onToggleNewClient,
  onNewClientName,
  onNewClientPhone,
  onCreateClient,
}) {
  const { t } = useTranslation()
  return (
    <>
      <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">{t('admin.sales.client')}</h2>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#e8e8ed]">Cliente registrado</label>
          <button
            type="button"
            onClick={onToggleNewClient}
            className="text-xs font-medium text-[#4f7cff] hover:text-[#7c9cff] transition-colors"
          >
            {showNewClient ? 'Cancelar' : '+ Nuevo cliente'}
          </button>
        </div>
        {!showNewClient && (
          <select
            value={clientId}
            onChange={(e) => { onClientId(e.target.value); onClientName('') }}
            className="h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
          >
            <option value="">— Sin cliente registrado —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre ?? c.correo}</option>)}
          </select>
        )}
      </div>
      {showNewClient && (
        <div className="flex flex-col gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
          <Input
            label="Nombre del cliente"
            value={newClientName}
            onChange={(e) => onNewClientName(e.target.value)}
            placeholder="Nombre completo"
          />
          <PhoneField label="Teléfono (opcional)" value={newClientPhone} onChange={onNewClientPhone} />
          <Button onClick={onCreateClient} disabled={creatingClient} size="sm">
            {creatingClient ? 'Creando…' : 'Crear cliente'}
          </Button>
        </div>
      )}
      {!showNewClient && !clientId && (
        <Input
          label="Nombre del cliente"
          value={clientName}
          onChange={(e) => onClientName(e.target.value)}
          placeholder="Nombre para el pedido"
          required
        />
      )}
    </>
  )
}
