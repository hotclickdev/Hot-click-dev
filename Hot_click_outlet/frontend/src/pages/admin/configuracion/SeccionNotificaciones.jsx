import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  F, NOTIF_KEY, defaultNotifPrefs, Block, Toggle, SectionHeader, ShoppingIcon, TruckIcon, AlertIcon, BellIcon,
} from './configUi'

export default function SeccionNotificaciones({ toast, soloVentas = false }) {
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState(() => {
    try { return { ...defaultNotifPrefs, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}') } }
    catch { return defaultNotifPrefs }
  })

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next))
    toast({ message: t('adminConfig.notifSaved'), type: 'success' })
  }

  const allItems = [
    { key: 'emailPedidos',      icon: ShoppingIcon, titleKey: 'adminConfig.notifEmailOrders',  descKey: 'adminConfig.notifEmailOrdersDesc' },
    { key: 'emailGuia',         icon: TruckIcon,    titleKey: 'adminConfig.notifEmailGuia',    descKey: 'adminConfig.notifEmailGuiaDesc' },
    { key: 'emailFallido',      icon: AlertIcon,    titleKey: 'adminConfig.notifEmailFailed',  descKey: 'adminConfig.notifEmailFailedDesc' },
    { key: 'sonidoNuevoPedido', icon: BellIcon,     titleKey: 'adminConfig.notifSoundNew',     descKey: 'adminConfig.notifSoundNewDesc' },
  ]
  // EMPRENDEDOR: solo ve notificación de venta de sus productos
  const items = soloVentas ? allItems.filter(i => i.key === 'emailPedidos') : allItems

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.notifTitle')} desc={t('adminConfig.notifDesc')} />
      <Block>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map(({ key, icon: Icon, titleKey, descKey }, idx) => (
            <div key={key}>
              {idx > 0 && <hr className="cfg-divider" />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--hc-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon style={{ width: '15px', height: '15px', color: 'var(--hc-muted)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t(titleKey)}</p>
                  <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t(descKey)}</p>
                </div>
                <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
              </div>
            </div>
          ))}
        </div>
      </Block>

      {!soloVentas && (
        <Block label={t('adminConfig.notifWaTitle')} sublabel={t('adminConfig.notifWaSubtitle')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)', fontSize: '13px', fontFamily: F.mono }}>
            <span style={{ fontSize: '16px' }}>📱</span>
            <span style={{ flex: 1 }}>+506 8666-7888</span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>Andrés Zúñiga</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '8px', fontFamily: F.body }}>{t('adminConfig.notifWaNote')}</p>
        </Block>
      )}
    </div>
  )
}
