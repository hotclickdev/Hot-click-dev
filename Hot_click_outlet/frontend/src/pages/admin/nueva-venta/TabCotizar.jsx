import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import { WA_TABS } from './nuevaVentaHelpers'
import { WhatsAppIcon } from './nuevaVentaIcons'
import CloseIcon from '@/components/ui/CloseIcon'

/**
 * @param {{
 *   cotNombre: string
 *   cotTelefono: string
 *   cotNota: string
 *   onNombre: (v: string) => void
 *   onTelefono: (v: string) => void
 *   onNota: (v: string) => void
 *   waPreviewOpen: boolean
 *   waTab: string
 *   waTexts: object | null
 *   onClosePreview: () => void
 *   onWaTab: (key: string) => void
 *   onWaTexts: (updater: (prev: object) => object) => void
 *   onEnviar: () => void
 * }} props
 */
export default function TabCotizar({
  cotNombre,
  cotTelefono,
  cotNota,
  onNombre,
  onTelefono,
  onNota,
  waPreviewOpen,
  waTab,
  waTexts,
  onClosePreview,
  onWaTab,
  onWaTexts,
  onEnviar,
}) {
  return (
    <>
      <h2 className="text-xs font-semibold text-[#8e8e9a] uppercase tracking-wider">Datos de la cotización</h2>
      <Input label="Nombre del cliente" value={cotNombre} onChange={(e) => onNombre(e.target.value)} placeholder="Opcional" />
      <PhoneField label="Teléfono / WhatsApp" value={cotTelefono} onChange={onTelefono} hint="Opcional" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#e8e8ed]">Nota adicional</label>
        <textarea
          value={cotNota}
          onChange={(e) => onNota(e.target.value)}
          placeholder="Condiciones especiales, descuentos, etc."
          rows={2}
          className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder-[#8e8e9a] focus:outline-none focus:border-[#4f7cff]/60 resize-none"
        />
      </div>
      {waPreviewOpen && waTexts && (
        <CotizarPreview
          waTab={waTab}
          waTexts={waTexts}
          onClose={onClosePreview}
          onWaTab={onWaTab}
          onWaTexts={onWaTexts}
          onEnviar={onEnviar}
        />
      )}
    </>
  )
}

function CotizarPreview({ waTab, waTexts, onClose, onWaTab, onWaTexts, onEnviar }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hc-border)' }}>
          <h3 className="font-bold text-[15px]" style={{ color: 'var(--hc-text)' }}>Previsualizar mensaje</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg hover:opacity-70" style={{ color: 'var(--hc-muted)' }}>
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {WA_TABS.map((tabDef) => (
              <button type="button"
                key={tabDef.key}
                onClick={() => onWaTab(tabDef.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: waTab === tabDef.key ? '#25D366' : 'var(--hc-surface-2)',
                  color: waTab === tabDef.key ? '#fff' : 'var(--hc-muted)',
                }}
              >
                {tabDef.label}
              </button>
            ))}
          </div>
          <textarea
            value={waTexts[waTab]}
            onChange={(e) => onWaTexts((prev) => ({ ...prev, [waTab]: e.target.value }))}
            rows={10}
            className="w-full rounded-xl p-3 text-sm resize-none outline-none"
            style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
          />
          <Button
            type="button"
            size="lg"
            className="w-full bg-[#25D366] hover:bg-[#1da851]"
            onClick={onEnviar}
          >
            <WhatsAppIcon />
            Enviar por WhatsApp
          </Button>
        </div>
      </div>
    </div>
  )
}
