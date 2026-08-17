import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import useAuthStore from '@/store/authStore'
import AdminPlanes from './AdminPlanes'
import SeccionPerfil from './configuracion/SeccionPerfil'
import SeccionTienda from './configuracion/SeccionTienda'
import SeccionSeguridad from './configuracion/SeccionSeguridad'
import SeccionNotificaciones from './configuracion/SeccionNotificaciones'
import SeccionTelegram from './configuracion/SeccionTelegram'
import SeccionDatos from './configuracion/SeccionDatos'
import SeccionApariencia from './configuracion/SeccionApariencia'
import SeccionSistema from './configuracion/SeccionSistema'
import {
  F, UserIcon, StoreIcon, ShieldIcon, BellIcon, SendIcon, DatabaseIcon, PaletteIcon, CogIcon, CardIcon,
} from './configuracion/configUi'

function usePremiumFonts() {
  useEffect(() => {
    if (document.getElementById('hc-cfg-fonts')) return
    const el = document.createElement('link')
    el.id = 'hc-cfg-fonts'
    el.rel = 'stylesheet'
    el.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Public+Sans:wght@400;500;600;700&display=swap'
    document.head.appendChild(el)
  }, [])
}

export default function AdminConfiguracion() {
  usePremiumFonts()
  const { t } = useTranslation()
  const toast = useToast()
  const { userId, userEmail, userName, setUserName, refreshToken, userRole } = useAuthStore()
  const [section, setSection] = useState('perfil')
  const [twoFAOn, setTwoFAOn] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const isEmprendedor = userRole === 'EMPRENDEDOR'

  const allNav = [
    { id: 'plan',           label: 'Plan y cuenta',                    icon: CardIcon,     desc: 'Tu plan y suscripción',      soloEmprendedor: true },
    { id: 'perfil',         label: t('adminConfig.navPerfil'),         icon: UserIcon,     desc: 'Nombre y datos personales' },
    { id: 'tienda',         label: t('adminConfig.navTienda'),         icon: StoreIcon,    desc: 'Contacto y horario',        emprendedor: false },
    { id: 'seguridad',      label: t('adminConfig.navSeguridad'),      icon: ShieldIcon,   desc: 'Contraseña y 2FA',           badge: !twoFAOn ? '!' : null },
    { id: 'notificaciones', label: t('adminConfig.navNotificaciones'), icon: BellIcon,     desc: 'Alertas y emails',           emprendedor: false },
    { id: 'telegram',       label: 'Telegram',                         icon: SendIcon,     desc: 'Bot y avisos del negocio' },
    { id: 'datos',          label: t('adminConfig.navDatos'),          icon: DatabaseIcon, desc: 'Exportar información',       emprendedor: false },
    { id: 'apariencia',     label: t('adminConfig.navApariencia'),     icon: PaletteIcon,  desc: 'Tema, fuente e idioma',      emprendedor: false },
    { id: 'sistema',        label: t('adminConfig.navSistema'),        icon: CogIcon,      desc: 'Servidor y mantenimiento',   emprendedor: false },
  ]
  // EMPRENDEDOR: ocultar tabs marcados con emprendedor: false — "notificaciones"
  // se fusiona dentro de "perfil" (ver SeccionPerfil), "datos"/"apariencia"/
  // "sistema" no tienen equivalente en el mockup aprobado (Front para cliente
  // EPN/) y quedan fuera del panel "Sistema". ADMIN: ocultar tabs marcados
  // soloEmprendedor (ej. "Plan y cuenta" — ADMIN no tiene suscripción).
  const nav = isEmprendedor
    ? allNav.filter(n => n.emprendedor !== false)
    : allNav.filter(n => !n.soloEmprendedor)

  const go = (id) => { setSection(id); setAnimKey(k => k + 1) }

  return (
    <>
      <style>{`
        @keyframes cfgUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .cfg-in { animation: cfgUp 0.22s ease both; }
        .cfg-card {
          background: var(--hc-surface);
          border: 1px solid var(--hc-border);
          border-radius: 14px; overflow: hidden;
          transition: border-color .2s, box-shadow .2s;
        }
        .cfg-card:hover { border-color: var(--hc-border-strong); box-shadow: 0 2px 14px var(--hc-shadow); }
        .cfg-input {
          width:100%; padding:10px 14px; border-radius:10px;
          font-size:13.5px; font-family:var(--hc-font-text);
          background:var(--hc-bg); border:1px solid var(--hc-border);
          color:var(--hc-text); outline:none; transition:all .15s ease; box-sizing:border-box;
        }
        .cfg-input:focus {
          border-color:var(--hc-accent);
          background:var(--hc-surface);
          box-shadow:0 0 0 3px var(--hc-glass-border);
        }
        .cfg-input::placeholder { color:var(--hc-muted); opacity:0.55; }
        .cfg-input[data-error="true"] { border-color:var(--hc-danger); }
        .cfg-btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:9px 16px; border-radius:10px; font-size:13px;
          font-weight:600; cursor:pointer; border:none; outline:none;
          font-family:var(--hc-font-text);
          transition:all .15s ease;
        }
        .cfg-btn-primary { background:var(--hc-accent); color:#fff; box-shadow:0 1px 12px var(--hc-shadow); }
        .cfg-btn-primary:hover:not(:disabled) { background:var(--hc-accent-hover); box-shadow:0 3px 18px var(--hc-shadow); transform:translateY(-1px); }
        .cfg-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .cfg-btn-success { background:var(--hc-glass-bg); color:var(--hc-success); border:1px solid var(--hc-glass-border); }
        .cfg-btn-ghost { background:var(--hc-surface-2); color:var(--hc-muted); border:1px solid var(--hc-border); }
        .cfg-btn-ghost:hover { color:var(--hc-text); border-color:var(--hc-border-strong); }
        .cfg-btn-danger { background:rgba(220,38,38,.08); color:var(--hc-danger); border:1px solid rgba(220,38,38,.22); }
        .cfg-btn-danger:hover:not(:disabled) { background:rgba(220,38,38,.14); }
        .cfg-btn-danger:disabled { opacity:.4; cursor:not-allowed; }
        .cfg-nav-btn {
          display:flex; align-items:center; gap:10px; padding:10px 12px;
          border-radius:12px; border:1px solid var(--hc-border); cursor:pointer; width:100%;
          text-align:left; font-size:13px; font-weight:500;
          font-family:var(--hc-font-text);
          transition:all .18s ease; position:relative;
          background:var(--hc-surface);
          box-shadow:0 1px 3px var(--hc-shadow);
        }
        .cfg-nav-btn:hover:not(.cfg-nav-active) {
          background:var(--hc-surface-2);
          border-color:var(--hc-border-strong);
          transform:translateX(2px);
          box-shadow:0 2px 8px var(--hc-shadow);
        }
        .cfg-nav-active {
          background:var(--hc-accent) !important;
          border-color:var(--hc-accent) !important;
          box-shadow:0 4px 14px color-mix(in srgb,var(--hc-accent) 35%,transparent) !important;
          transform:none !important;
        }
        .cfg-toggle {
          position:relative; width:44px; height:24px; border-radius:12px;
          border:none; cursor:pointer; flex-shrink:0; transition:background .2s,box-shadow .2s;
        }
        .cfg-toggle-knob {
          position:absolute; top:3px; width:18px; height:18px; border-radius:50%;
          background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.18);
          transition:left .2s cubic-bezier(.34,1.56,.64,1);
        }
        .cfg-divider { border:none; border-top:1px solid var(--hc-border); margin:0; }
        .cfg-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:var(--hc-muted); font-family:var(--hc-font-text); }
        textarea.cfg-input { resize:vertical; line-height:1.5; }
      `}</style>

      <div style={{ maxWidth: '880px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: F.display, fontWeight: 700, fontSize: '21px', color: 'var(--hc-text)', letterSpacing: '-0.025em', margin: 0 }}>
            {t('adminConfig.title')}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--hc-muted)', marginTop: '4px', fontFamily: F.body }}>{t('adminConfig.subtitle')}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Desktop sidebar */}
          <aside style={{ width: '200px', flexShrink: 0 }} className="hidden md:block">
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {nav.map(({ id, label, icon: Icon, badge, desc }) => {
                const active = section === id
                return (
                  <button type="button" key={id} className={`cfg-nav-btn ${active ? 'cfg-nav-active' : ''}`}
                    style={{ alignItems: 'flex-start' }}
                    onClick={() => go(id)}>
                    {/* Icon box */}
                    <span style={{
                      width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0, marginTop: '1px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? 'rgba(255,255,255,0.22)' : 'var(--hc-surface-2)',
                      transition: 'background .15s',
                    }}>
                      <Icon style={{ width: '15px', height: '15px', color: active ? '#fff' : 'var(--hc-accent)' }} />
                    </span>
                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: active ? '#fff' : 'var(--hc-text)', fontFamily: F.body, lineHeight: 1.3 }}>
                          {label}
                        </span>
                        {badge && (
                          <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: active ? 'rgba(255,255,255,0.9)' : '#f59e0b', fontSize: '9px', fontWeight: 700, color: active ? '#f59e0b' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {badge}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '10.5px', color: active ? 'rgba(255,255,255,0.75)' : 'var(--hc-muted)', marginTop: '2px', display: 'block', lineHeight: 1.3, fontFamily: F.body }}>
                        {desc}
                      </span>
                    </div>
                  </button>
                )
              })}
            </nav>
            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--hc-border)', paddingLeft: '4px' }}>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0, opacity: 0.6 }}>HotClick</p>
              <p style={{ fontSize: '11px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body, opacity: 0.4 }}>v1.0 · Admin Panel</p>
            </div>
          </aside>

          {/* Mobile nav */}
          <div className="md:hidden w-full mb-4 flex gap-2 overflow-x-auto pb-1">
            {nav.map(({ id, label, icon: Icon, badge }) => {
              const active = section === id
              return (
                <button type="button" key={id} onClick={() => go(id)} className="cfg-btn shrink-0 relative"
                  style={{
                    background: active ? 'var(--hc-accent)' : 'var(--hc-surface)',
                    color: active ? '#fff' : 'var(--hc-text)',
                    border: `1px solid ${active ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                    padding: '7px 12px', fontSize: '12px',
                    boxShadow: active ? '0 3px 12px color-mix(in srgb,var(--hc-accent) 35%,transparent)' : '0 1px 3px var(--hc-shadow)',
                  }}>
                  <Icon style={{ width: '13px', height: '13px' }} />
                  {label}
                  {badge && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '14px', height: '14px', borderRadius: '50%', background: '#f59e0b', fontSize: '8px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>}
                </button>
              )
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            <div key={animKey} className="cfg-in">
              {section === 'plan'           && <AdminPlanes />}
              {section === 'perfil'         && <SeccionPerfil userId={userId} userEmail={userEmail} userName={userName} setUserName={setUserName} toast={toast} />}
              {section === 'tienda'         && <SeccionTienda toast={toast} />}
              {section === 'seguridad'      && <SeccionSeguridad refreshToken={refreshToken} toast={toast} onTwoFAChange={setTwoFAOn} />}
              {section === 'notificaciones' && <SeccionNotificaciones toast={toast} soloVentas={isEmprendedor} />}
              {section === 'telegram'       && <SeccionTelegram toast={toast} />}
              {section === 'datos'          && <SeccionDatos toast={toast} isEmprendedor={isEmprendedor} />}
              {section === 'apariencia'     && <SeccionApariencia />}
              {section === 'sistema'        && <SeccionSistema toast={toast} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
