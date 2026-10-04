import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { cuentaService, type DatosTitular } from '@/services/cuentaService'

function descargarJson(datos: DatosTitular): void {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hotclick-mis-datos.json'
  a.click()
  URL.revokeObjectURL(url)
}

export default function ProfileDatosCard({
  onCerrada,
}: {
  onCerrada: () => void
}) {
  const { t } = useTranslation()
  const [exportando, setExportando] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [confirmaCierre, setConfirmaCierre] = useState(false)
  const [error, setError] = useState('')

  const exportar = async () => {
    setError('')
    setExportando(true)
    try {
      const { data } = await cuentaService.misDatos()
      descargarJson((data ?? {}) as DatosTitular)
    } catch {
      setError(t('profile.arcoExportError'))
    } finally {
      setExportando(false)
    }
  }

  const cerrarCuenta = async () => {
    setError('')
    setCerrando(true)
    try {
      await cuentaService.cerrar()
      onCerrada()
    } catch {
      setError(t('profile.arcoCloseError'))
      setCerrando(false)
    }
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--hc-border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{t('profile.arcoTitle')}</h2>
      </div>
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{t('profile.arcoBody')}</p>
        {error && <p className="text-xs" style={{ color: 'var(--hc-danger)' }}>{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => { void exportar() }} disabled={exportando || cerrando}>
            {exportando ? t('profile.arcoExportando') : t('profile.arcoExport')}
          </Button>
          {!confirmaCierre && (
            <Button size="sm" variant="danger" onClick={() => setConfirmaCierre(true)} disabled={cerrando}>
              {t('profile.arcoClose')}
            </Button>
          )}
        </div>
        {confirmaCierre && (
          <div className="rounded-xl p-3 space-y-2" style={{ background: 'color-mix(in srgb, var(--hc-danger) 8%, transparent)' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hc-text)' }}>{t('profile.arcoCloseWarn')}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="danger" onClick={() => { void cerrarCuenta() }} disabled={cerrando}>
                {cerrando ? t('profile.arcoCerrando') : t('profile.arcoCloseConfirm')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmaCierre(false)} disabled={cerrando}>
                {t('profile.arcoCloseCancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
