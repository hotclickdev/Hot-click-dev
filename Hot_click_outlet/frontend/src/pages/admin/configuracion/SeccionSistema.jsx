import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Spinner from '@/components/ui/Spinner'
import { adminService } from '@/services/orderService'
import { marcaService } from '@/services/marcaService'
import {
  F, Block, StyledInput, SectionHeader, RefreshIcon, TrashLiteIcon, RestoreIcon, SkullIcon,
  DBIcon, ServerIcon, MailIcon, CardIcon,
} from './configUi'

export default function SeccionSistema({ toast }) {
  const { t } = useTranslation()
  const [clearing,  setClearing]  = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [healthOk,  setHealthOk]  = useState(null)
  const [checking,  setChecking]  = useState(false)
  const [resetModal,  setResetModal]  = useState(false)
  const [resetInput,  setResetInput]  = useState('')
  const [resetting,   setResetting]   = useState(false)

  const checkHealth = async () => {
    setChecking(true)
    try { await adminService.health(); setHealthOk(true); toast({ message: t('adminConfig.sysHealthOkToast'), type: 'success' }) }
    catch { setHealthOk(false); toast({ message: t('adminConfig.sysHealthFailToast'), type: 'error' }) }
    finally { setChecking(false) }
  }
  const clearLocalData = () => {
    const keep = ['hotclick-auth','hotclick-ui']
    Object.keys(localStorage).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k) })
    toast({ message: t('adminConfig.sysLocalToast'), type: 'success' })
  }
  const restoreUI = () => {
    setRestoring(true)
    setTimeout(() => { localStorage.removeItem('hotclick-ui'); toast({ message: t('adminConfig.sysRestoreToast'), type: 'success' }); setRestoring(false) }, 700)
  }
  const openResetModal  = () => { setResetInput(''); setResetModal(true) }
  const closeResetModal = () => { setResetModal(false); setResetInput('') }
  const handleReset = async () => {
    if (resetInput !== 'ELIMINAR') return
    setResetting(true)
    try { await adminService.resetDatos(); toast({ message: t('adminConfig.sysResetToast'), type: 'success' }); closeResetModal() }
    catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.sysResetError'), type: 'error' }) }
    finally { setResetting(false) }
  }
  const forceRefreshCache = async () => {
    setClearing(true)
    try { await marcaService.getPublicas(); toast({ message: t('adminConfig.sysCacheToast'), type: 'success' }) }
    catch { toast({ message: t('adminConfig.sysCacheError'), type: 'error' }) }
    finally { setClearing(false) }
  }

  const maintenanceItems = [
    { icon: RefreshIcon,   titleKey: 'adminConfig.sysCacheTitle',   descKey: 'adminConfig.sysCacheDesc',   loading: clearing,  action: forceRefreshCache, labelKey: 'adminConfig.sysCacheBtn' },
    { icon: TrashLiteIcon, titleKey: 'adminConfig.sysLocalTitle',   descKey: 'adminConfig.sysLocalDesc',   loading: false,     action: clearLocalData,    labelKey: 'adminConfig.sysLocalBtn' },
    { icon: RestoreIcon,   titleKey: 'adminConfig.sysRestoreTitle', descKey: 'adminConfig.sysRestoreDesc', loading: restoring, action: restoreUI,          labelKey: 'adminConfig.sysRestoreBtn' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.sysTitle')} desc={t('adminConfig.sysDesc')} />

      {/* System info */}
      <Block label={t('adminConfig.sysInfoTitle')}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { labelKey: 'adminConfig.sysBackend',  value: 'Spring Boot 3.4', color: 'var(--hc-accent)' },
            { labelKey: 'adminConfig.sysFrontend', value: 'React + Vite',    color: 'var(--hc-blue-300)' },
            { labelKey: 'adminConfig.sysDB',       value: 'Supabase (PG)',   color: '#34d399' },
            { labelKey: 'adminConfig.sysDeploy',   value: 'Render',          color: '#E5A93D' },
            { labelKey: 'adminConfig.sysPayments', value: 'Tarjetas / SINPE', color: '#f472b6' },
            { labelKey: 'adminConfig.sysStorage',  value: 'Supabase S3',     color: '#6490EA' },
          ].map(({ labelKey, value, color }) => (
            <div key={labelKey} style={{ padding: '12px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--hc-muted)', margin: '0 0 4px', fontFamily: F.body }}>{t(labelKey)}</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color, margin: 0, fontFamily: F.body }}>{value}</p>
            </div>
          ))}
        </div>
      </Block>

      {/* Health check */}
      <Block label={t('adminConfig.sysHealthTitle')} sublabel={t('adminConfig.sysHealthSubtitle')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: healthOk === null ? 'var(--hc-muted)' : healthOk ? '#22c55e' : '#ef4444', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '13px', color: healthOk === null ? 'var(--hc-muted)' : healthOk ? '#4ade80' : '#f87171', fontFamily: F.body }}>
              {healthOk === null ? t('adminConfig.sysHealthUnknown') : healthOk ? t('adminConfig.sysHealthOk') : t('adminConfig.sysHealthFail')}
            </span>
          </div>
          <button onClick={checkHealth} disabled={checking} className="cfg-btn cfg-btn-ghost" style={{ fontSize: '12px', padding: '7px 14px' }}>
            {checking ? <Spinner size="xs" /> : <RefreshIcon style={{ width: '14px', height: '14px' }} />}
            {t('adminConfig.sysCheckBtn')}
          </button>
        </div>
      </Block>

      {/* Maintenance tools */}
      <Block label={t('adminConfig.sysMaintenanceTitle')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {maintenanceItems.map(({ icon: Icon, titleKey, descKey, loading, action, labelKey }, idx) => (
            <div key={titleKey}>
              {idx > 0 && <hr className="cfg-divider" />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--hc-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: '15px', height: '15px', color: 'var(--hc-muted)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t(titleKey)}</p>
                  <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t(descKey)}</p>
                </div>
                <button onClick={action} disabled={loading} className="cfg-btn cfg-btn-ghost" style={{ flexShrink: 0, fontSize: '12px', padding: '7px 12px' }}>
                  {loading ? <Spinner size="xs" /> : null}
                  {t(labelKey)}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* Danger zone */}
      <div style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SkullIcon style={{ width: '15px', height: '15px', color: '#ef4444', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#f87171', fontFamily: F.body, margin: 0 }}>{t('adminConfig.sysDangerTitle')}</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t('adminConfig.sysDangerDesc')}</p>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
              <TrashLiteIcon style={{ width: '15px', height: '15px', color: '#f87171' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.sysResetTitle')}</p>
              <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', lineHeight: 1.5, fontFamily: F.body }}>{t('adminConfig.sysResetDesc')}</p>
            </div>
            <button onClick={openResetModal} className="cfg-btn cfg-btn-danger" style={{ flexShrink: 0, fontSize: '12px', padding: '7px 14px' }}>
              <SkullIcon style={{ width: '13px', height: '13px' }} />{t('adminConfig.sysResetBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* External links */}
      <Block label={t('adminConfig.sysExternalTitle')}>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Base de datos',     descKey: 'adminConfig.sysSupabaseDesc', color: '#3ecf8e', icon: DBIcon },
            { label: 'Servidor',          descKey: 'adminConfig.sysRenderDesc',   color: '#46e3b7', icon: ServerIcon },
            { label: 'Correo electrónico',descKey: 'adminConfig.sysSendGridDesc', color: '#1a82e2', icon: MailIcon },
            { label: 'Pasarela de pagos', descKey: 'adminConfig.sysStripeDesc', color: 'var(--hc-blue-300)', icon: CardIcon },
          ].map(({ label, descKey, color, icon: Icon }) => (
            <div key={label}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', cursor: 'pointer', transition: 'border-color .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 25%, transparent)`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--hc-border)'}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `color-mix(in srgb, ${color} 9%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: '15px', height: '15px', color }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{label}</p>
                <p style={{ fontSize: '11px', color: 'var(--hc-muted)', fontFamily: F.body }}>{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* Reset modal */}
      {resetModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: '440px', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', background: 'var(--hc-surface)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <SkullIcon style={{ width: '20px', height: '20px', color: '#ef4444' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: 0 }}>{t('adminConfig.sysModalTitle')}</h3>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', lineHeight: 1.5, fontFamily: F.body }}>{t('adminConfig.sysModalDesc')}</p>
              </div>
            </div>
            <div style={{ margin: '0 24px 16px', padding: '14px', borderRadius: '10px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[t('adminConfig.sysResetItem1'),t('adminConfig.sysResetItem2'),t('adminConfig.sysResetItem3'),t('adminConfig.sysResetItem4'),t('adminConfig.sysResetItem5')].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(248,113,113,0.85)', fontFamily: F.body }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />{item}
                </div>
              ))}
              <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(74,222,128,0.7)', fontFamily: F.body }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />{t('adminConfig.sysResetKeep')}
              </div>
            </div>
            <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="cfg-reset-confirm" className="cfg-label">{t('adminConfig.sysResetInputLabel')}</label>
              <StyledInput id="cfg-reset-confirm" value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder="ELIMINAR" autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && resetInput === 'ELIMINAR') handleReset() }}
                style={{ textTransform: 'uppercase', letterSpacing: '0.08em', borderColor: resetInput === 'ELIMINAR' ? 'rgba(239,68,68,0.5)' : undefined }} />
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={closeResetModal} disabled={resetting} className="cfg-btn cfg-btn-ghost">{t('adminConfig.sysResetCancel')}</button>
              <button onClick={handleReset} disabled={resetInput !== 'ELIMINAR' || resetting} className="cfg-btn"
                style={{ background: resetInput === 'ELIMINAR' ? '#dc2626' : 'rgba(239,68,68,0.15)', color: resetInput === 'ELIMINAR' ? '#fff' : '#f87171', boxShadow: resetInput === 'ELIMINAR' ? '0 2px 14px rgba(220,38,38,0.4)' : 'none', opacity: (resetInput !== 'ELIMINAR' || resetting) ? 0.5 : 1, cursor: (resetInput !== 'ELIMINAR' || resetting) ? 'not-allowed' : 'pointer' }}>
                {resetting ? <Spinner size="xs" /> : <SkullIcon style={{ width: '14px', height: '14px' }} />}
                {resetting ? t('adminConfig.sysResetDeleting') : t('adminConfig.sysResetConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
