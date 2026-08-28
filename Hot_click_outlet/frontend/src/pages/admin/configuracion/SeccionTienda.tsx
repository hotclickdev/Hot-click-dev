import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  F, STORE_KEY, Block, FormGroup, StyledInput, SaveButton, SectionHeader, MailIcon, PinIcon, ClockIcon, PhoneIcon,
} from './configUi'

type ToastFn = (opts: { message: string; type?: 'success' | 'error' | 'warning' | 'info' }) => void
type TiendaForm = {
  nombreTienda: string
  descripcion: string
  whatsapp: string
  emailContacto: string
  direccion: string
  horario: string
}
type CampoTienda = keyof TiendaForm

export default function SeccionTienda({ toast }: { toast: ToastFn }) {
  const { t } = useTranslation()
  const [form, setForm] = useState<TiendaForm>(() => {
    try {
      return {
        nombreTienda: 'HotClick',
        descripcion: 'Tu tienda de electrónica y tecnología en Costa Rica',
        whatsapp: '50686667888',
        emailContacto: '',
        direccion: '',
        horario: 'Lun-Vie 8am-6pm, Sáb 9am-1pm',
        ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Partial<TiendaForm>,
      }
    } catch { return { nombreTienda: 'HotClick', descripcion: '', whatsapp: '50686667888', emailContacto: '', direccion: '', horario: '' } }
  })
  const [saved, setSaved] = useState(false)
  const set = (k: CampoTienda) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    localStorage.setItem(STORE_KEY, JSON.stringify(form))
    setSaved(true)
    toast({ message: t('adminConfig.saveBtn'), type: 'success' })
    setTimeout(() => setSaved(false), 2500)
  }

  const initials = (form.nombreTienda?.[0] ?? 'H').toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.tiendaTitle')} desc={t('adminConfig.tiendaDesc')} />

      {/* Preview card */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg,var(--hc-accent),#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: '#fff', fontFamily: F.display, flexShrink: 0, boxShadow: '0 4px 18px rgba(23,71,168,0.3)' }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: 0, letterSpacing: '-0.01em' }}>{form.nombreTienda || 'HotClick'}</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '3px', fontFamily: F.body }}>{form.descripcion || 'Sin descripción'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              {form.whatsapp && (
                <span className="inline-flex items-center gap-1" style={{ fontSize: '11px', color: '#4ade80', fontFamily: F.body }}>
                  <PhoneIcon style={{ width: 11, height: 11 }} /> +{form.whatsapp}
                </span>
              )}
              {form.emailContacto && (
                <span className="inline-flex items-center gap-1" style={{ fontSize: '11px', color: '#6490EA', fontFamily: F.body }}>
                  <MailIcon style={{ width: 11, height: 11 }} /> {form.emailContacto}
                </span>
              )}
              {form.horario && (
                <span className="inline-flex items-center gap-1" style={{ fontSize: '11px', color: 'var(--hc-blue-300)', fontFamily: F.body }}>
                  <ClockIcon style={{ width: 11, height: 11 }} /> {form.horario}
                </span>
              )}
            </div>
          </div>
        </div>
      </Block>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Identity */}
        <Block label={t('adminConfig.tiendaIdentityTitle')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FormGroup label={t('adminConfig.tiendaNameLabel')}>
              <StyledInput value={form.nombreTienda} onChange={set('nombreTienda')} placeholder={t('adminConfig.tiendaNamePh')} required />
            </FormGroup>
            <FormGroup label={t('adminConfig.tiendaDescLabel')}>
              <textarea
                value={form.descripcion}
                onChange={set('descripcion')}
                placeholder={t('adminConfig.tiendaDescPh')}
                rows={3}
                className="cfg-input"
                style={{ resize: 'vertical', lineHeight: 1.5 }}
              />
            </FormGroup>
          </div>
        </Block>

        {/* Contact */}
        <Block label={t('adminConfig.tiendaContactTitle')}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label={t('adminConfig.tiendaWaLabel')}>
              <div style={{ position: 'relative' }}>
                <PhoneIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--hc-muted)', pointerEvents: 'none' }} />
                <StyledInput value={form.whatsapp} onChange={set('whatsapp')} placeholder={t('adminConfig.tiendaWaPh')} style={{ paddingLeft: '36px' }} />
              </div>
            </FormGroup>
            <FormGroup label={t('adminConfig.tiendaEmailLabel')}>
              <div style={{ position: 'relative' }}>
                <MailIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--hc-muted)', pointerEvents: 'none' }} />
                <StyledInput type="email" value={form.emailContacto} onChange={set('emailContacto')} placeholder={t('adminConfig.tiendaEmailPh')} style={{ paddingLeft: '36px' }} />
              </div>
            </FormGroup>
            <FormGroup label={t('adminConfig.tiendaDirLabel')}>
              <div style={{ position: 'relative' }}>
                <PinIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--hc-muted)', pointerEvents: 'none' }} />
                <StyledInput value={form.direccion} onChange={set('direccion')} placeholder={t('adminConfig.tiendaDirPh')} style={{ paddingLeft: '36px' }} />
              </div>
            </FormGroup>
            <FormGroup label={t('adminConfig.tiendaHorLabel')}>
              <div style={{ position: 'relative' }}>
                <ClockIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--hc-muted)', pointerEvents: 'none' }} />
                <StyledInput value={form.horario} onChange={set('horario')} placeholder={t('adminConfig.tiendaHorPh')} style={{ paddingLeft: '36px' }} />
              </div>
            </FormGroup>
          </div>
        </Block>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SaveButton saving={false} saved={saved} />
          <p style={{ fontSize: '11px', color: 'var(--hc-muted)', fontFamily: F.body }}>{t('adminConfig.tiendaNote')}</p>
        </div>
      </form>
    </div>
  )
}
