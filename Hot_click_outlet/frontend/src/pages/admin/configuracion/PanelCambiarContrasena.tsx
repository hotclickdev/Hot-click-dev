import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import {
  F, Block, FormGroup, PasswordInput, SaveButton, CheckIcon, passwordStrength, mensajeErrorConfig,
} from './configUi'

type ToastFn = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void
type CampoPwd = 'contrasenaActual' | 'nuevaContrasena' | 'confirmar'

export default function PanelCambiarContrasena({ refreshToken, toast }: {
  refreshToken: string | null
  toast: ToastFn
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const set = (f: CampoPwd) => (e: ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [f]: e.target.value }))

  const strength = passwordStrength(form.nuevaContrasena, t)

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (form.nuevaContrasena.length < 6) { toast({ message: t('adminConfig.pwdMin6'), type: 'error' }); return }
    if (form.nuevaContrasena !== form.confirmar) { toast({ message: t('adminConfig.pwdNoMatch'), type: 'error' }); return }
    setSaving(true)
    try {
      await authService.changePassword(form.contrasenaActual, form.nuevaContrasena, refreshToken ?? '')
      setForm({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
      setSaved(true)
      toast({ message: t('adminConfig.pwdUpdated'), type: 'success' })
      setTimeout(() => setSaved(false), 2500)
    } catch (err: unknown) {
      toast({ message: mensajeErrorConfig(err, t('adminConfig.pwdError')), type: 'error' })
    } finally { setSaving(false) }
  }

  return (
    <Block label={t('adminConfig.pwdTitle')} sublabel={t('adminConfig.pwdSubtitle')}>
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <FormGroup label={t('adminConfig.pwdCurrentLabel')}>
          <PasswordInput value={form.contrasenaActual} onChange={set('contrasenaActual')} show={showCurrent} onToggle={() => setShowCurrent(p => !p)} placeholder={t('adminConfig.pwdCurrentPh')} required />
        </FormGroup>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <FormGroup label={t('adminConfig.pwdNewLabel')}>
              <PasswordInput value={form.nuevaContrasena} onChange={set('nuevaContrasena')} show={showNew} onToggle={() => setShowNew(p => !p)} placeholder={t('adminConfig.pwdNewPh')} required />
            </FormGroup>
            {form.nuevaContrasena && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < strength.score ? strength.color : 'var(--hc-border)', transition: 'background .3s' }} />
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: strength.color, fontFamily: F.body, margin: 0 }}>{strength.label}</p>
              </div>
            )}
          </div>
          <FormGroup label={t('adminConfig.pwdConfirmLabel')}>
            <PasswordInput value={form.confirmar} onChange={set('confirmar')} show={showNew} onToggle={() => setShowNew(p => !p)} placeholder={t('adminConfig.pwdConfirmPh')} required error={!!(form.confirmar && form.confirmar !== form.nuevaContrasena)} />
          </FormGroup>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SaveButton saving={saving} saved={saved} label={t('adminConfig.pwdUpdateBtn')} />
          {saved && <span style={{ fontSize: '12px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: F.body }}><CheckIcon style={{ width: '13px', height: '13px' }} />{t('adminConfig.pwdUpdatedLabel')}</span>}
        </div>
      </form>
    </Block>
  )
}
