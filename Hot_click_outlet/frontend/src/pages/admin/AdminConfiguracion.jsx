import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'
import api from '@/services/api'
import PhoneField from '@/components/ui/PhoneField'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import QRCode from 'qrcode'

const NOTIF_KEY  = 'hotclick-notif-prefs'
const STORE_KEY  = 'hotclick-store-config'
const defaultNotifPrefs = {
  emailPedidos: true,
  emailGuia: true,
  emailFallido: true,
  sonidoNuevoPedido: false,
}

function usePremiumFonts() {
  useEffect(() => {
    if (document.getElementById('hc-cfg-fonts')) return
    const el = document.createElement('link')
    el.id = 'hc-cfg-fonts'
    el.rel = 'stylesheet'
    el.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap'
    document.head.appendChild(el)
  }, [])
}

const F = {
  display: '"Syne","DM Sans",system-ui,sans-serif',
  body: '"Plus Jakarta Sans","DM Sans",system-ui,sans-serif',
  mono: '"JetBrains Mono","Fira Mono",monospace',
}

/* ─────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────── */
export default function AdminConfiguracion() {
  usePremiumFonts()
  const { t } = useTranslation()
  const toast = useToast()
  const { userId, userEmail, userName, setUserName, refreshToken } = useAuthStore()
  const [section, setSection] = useState('perfil')
  const [twoFAOn, setTwoFAOn] = useState(false)
  const [animKey, setAnimKey] = useState(0)

  const nav = [
    { id: 'perfil',         label: t('adminConfig.navPerfil'),         icon: UserIcon,     desc: 'Nombre y datos personales' },
    { id: 'tienda',         label: t('adminConfig.navTienda'),         icon: StoreIcon,    desc: 'Contacto y horario' },
    { id: 'seguridad',      label: t('adminConfig.navSeguridad'),      icon: ShieldIcon,   desc: 'Contraseña y 2FA', badge: !twoFAOn ? '!' : null },
    { id: 'notificaciones', label: t('adminConfig.navNotificaciones'), icon: BellIcon,     desc: 'Alertas y emails' },
    { id: 'datos',          label: t('adminConfig.navDatos'),          icon: DatabaseIcon, desc: 'Exportar información' },
    { id: 'apariencia',     label: t('adminConfig.navApariencia'),     icon: PaletteIcon,  desc: 'Tema, fuente e idioma' },
    { id: 'sistema',        label: t('adminConfig.navSistema'),        icon: CogIcon,      desc: 'Servidor y mantenimiento' },
  ]

  const go = (id) => { setSection(id); setAnimKey(k => k + 1) }

  return (
    <AdminLayout>
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
          font-size:13.5px; font-family:"Plus Jakarta Sans","DM Sans",system-ui,sans-serif;
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
          font-family:"Plus Jakarta Sans","DM Sans",system-ui,sans-serif;
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
          font-family:"Plus Jakarta Sans","DM Sans",system-ui,sans-serif;
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
        .cfg-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.07em; color:var(--hc-muted); font-family:"Plus Jakarta Sans","DM Sans",system-ui,sans-serif; }
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
                  <button key={id} className={`cfg-nav-btn ${active ? 'cfg-nav-active' : ''}`}
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
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0, opacity: 0.6 }}>HOTCLICK</p>
              <p style={{ fontSize: '11px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body, opacity: 0.4 }}>v1.0 · Admin Panel</p>
            </div>
          </aside>

          {/* Mobile nav */}
          <div className="md:hidden w-full mb-4 flex gap-2 overflow-x-auto pb-1">
            {nav.map(({ id, label, icon: Icon, badge }) => {
              const active = section === id
              return (
                <button key={id} onClick={() => go(id)} className="cfg-btn shrink-0 relative"
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
              {section === 'perfil'         && <SeccionPerfil userId={userId} userEmail={userEmail} userName={userName} setUserName={setUserName} toast={toast} />}
              {section === 'tienda'         && <SeccionTienda toast={toast} />}
              {section === 'seguridad'      && <SeccionSeguridad refreshToken={refreshToken} toast={toast} onTwoFAChange={setTwoFAOn} />}
              {section === 'notificaciones' && <SeccionNotificaciones toast={toast} />}
              {section === 'datos'          && <SeccionDatos toast={toast} />}
              {section === 'apariencia'     && <SeccionApariencia />}
              {section === 'sistema'        && <SeccionSistema toast={toast} />}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

/* ─────────────────────────────────────────────────────────
   SECCIÓN PERFIL
───────────────────────────────────────────────────────── */
function SeccionPerfil({ userId, userEmail, userName, setUserName, toast }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    if (!userId) return
    api.get(`/usuarios/${userId}`)
      .then(({ data }) => {
        const u = data.data ?? data
        setForm({
          nombre:          u.nombre          ?? '',
          apellidoPaterno: u.apellidoPaterno ?? '',
          apellidoMaterno: u.apellidoMaterno ?? '',
          telefono:        u.telefono        ?? '',
        })
      })
      .catch(() => toast({ message: t('adminConfig.perfilErrorLoad'), type: 'error' }))
      .finally(() => setLoading(false))
  }, [userId])

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast({ message: t('adminConfig.perfilErrorName'), type: 'error' }); return }
    setSaving(true)
    try {
      await api.put(`/usuarios/${userId}`, form)
      setUserName(form.nombre)
      setSaved(true)
      toast({ message: t('adminConfig.perfilSaved'), type: 'success' })
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('adminConfig.perfilErrorSave'), type: 'error' })
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSkeleton rows={5} />

  const initials = (form.nombre?.[0] ?? '') + (form.apellidoPaterno?.[0] ?? '')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.perfilTitle')} desc={t('adminConfig.perfilDesc')} />

      {/* Avatar card */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg,#4f7cff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: F.display, boxShadow: '0 4px 20px rgba(79,124,255,0.35)' }}>
              {initials.toUpperCase() || 'HC'}
            </div>
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{form.nombre || userName || 'Admin'} {form.apellidoPaterno}</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.mono }}>{userEmail}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: '11px', color: 'var(--hc-muted)', fontFamily: F.body }}>{t('adminConfig.perfilActive')}</span>
            </div>
          </div>
        </div>
      </Block>

      {/* Form card */}
      <Block>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email readonly */}
          <FormGroup label={t('adminConfig.perfilEmailLabel')} hint={t('adminConfig.perfilEmailHint')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)', fontSize: '13px', fontFamily: F.mono }}>
              <MailIcon style={{ width: '14px', height: '14px', opacity: 0.4, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{userEmail}</span>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: 'var(--hc-surface-2)', color: 'var(--hc-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('adminConfig.perfilReadOnly')}</span>
            </div>
          </FormGroup>

          <hr className="cfg-divider" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label={t('adminConfig.perfilNameLabel')}>
              <StyledInput value={form.nombre} onChange={set('nombre')} placeholder={t('adminConfig.perfilNamePh')} required />
            </FormGroup>
            <FormGroup label={t('adminConfig.perfilLastName1')}>
              <StyledInput value={form.apellidoPaterno} onChange={set('apellidoPaterno')} placeholder={t('adminConfig.perfilLastName1Ph')} />
            </FormGroup>
            <FormGroup label={t('adminConfig.perfilLastName2')}>
              <StyledInput value={form.apellidoMaterno} onChange={set('apellidoMaterno')} placeholder={t('adminConfig.perfilLastName2Ph')} />
            </FormGroup>
            <FormGroup label={t('adminConfig.perfilPhone')}>
              <PhoneField value={form.telefono} onChange={(val) => setForm(f => ({ ...f, telefono: val }))} />
            </FormGroup>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '4px' }}>
            <SaveButton saving={saving} saved={saved} />
            {saved && (
              <span style={{ fontSize: '12px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: F.body }}>
                <CheckIcon style={{ width: '13px', height: '13px' }} />{t('adminConfig.perfilSavedLabel')}
              </span>
            )}
          </div>
        </form>
      </Block>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SECCIÓN SEGURIDAD
───────────────────────────────────────────────────────── */
function SeccionSeguridad({ refreshToken, toast, onTwoFAChange }) {
  const { t } = useTranslation()
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)

  useEffect(() => {
    api.get('/auth/2fa/status')
      .then(({ data }) => {
        const enabled = data.data?.enabled ?? false
        setTwoFAEnabled(enabled)
        onTwoFAChange(enabled)
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false))
  }, [])

  const score = twoFAEnabled ? 2 : 1
  const scoreLabel = ['', t('adminConfig.secScoreMid'), t('adminConfig.secScoreHigh'), t('adminConfig.secScoreMax')][score] ?? t('adminConfig.secScoreMid')
  const scoreColor = score >= 2 ? '#22c55e' : '#f59e0b'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.navSeguridad')} desc={t('adminConfig.pwdSubtitle')} />

      <Block>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.secScore')}</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t('adminConfig.secScoreBase')}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '17px', fontWeight: 700, color: scoreColor, fontFamily: F.display, margin: 0 }}>{scoreLabel}</p>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px', justifyContent: 'flex-end' }}>
              {[1, 2].map(i => (
                <div key={i} style={{ width: '32px', height: '5px', borderRadius: '3px', background: i <= score ? scoreColor : 'var(--hc-border)', transition: 'background .4s' }} />
              ))}
            </div>
          </div>
        </div>
        {!twoFAEnabled && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertIcon style={{ width: '14px', height: '14px', color: '#f59e0b', flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'rgba(251,191,36,0.9)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.secEnable2FA')}</p>
          </div>
        )}
      </Block>

      <PanelCambiarContrasena refreshToken={refreshToken} toast={toast} />
      <Panel2FA enabled={twoFAEnabled} loading={loadingStatus} toast={toast}
        onEnabled={() => { setTwoFAEnabled(true); onTwoFAChange(true) }}
        onDisabled={() => { setTwoFAEnabled(false); onTwoFAChange(false) }} />
    </div>
  )
}

function PanelCambiarContrasena({ refreshToken, toast }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const strength = passwordStrength(form.nuevaContrasena, t)

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.nuevaContrasena.length < 6) { toast({ message: t('adminConfig.pwdMin6'), type: 'error' }); return }
    if (form.nuevaContrasena !== form.confirmar) { toast({ message: t('adminConfig.pwdNoMatch'), type: 'error' }); return }
    setSaving(true)
    try {
      await api.post('/auth/change-password', { contrasenaActual: form.contrasenaActual, nuevaContrasena: form.nuevaContrasena, refreshToken: refreshToken ?? '' })
      setForm({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
      setSaved(true)
      toast({ message: t('adminConfig.pwdUpdated'), type: 'success' })
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('adminConfig.pwdError'), type: 'error' })
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

function Panel2FA({ enabled, loading, toast, onEnabled, onDisabled }) {
  const { t } = useTranslation()
  const [step, setStep]           = useState('idle')
  const [qrData, setQrData]       = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [code, setCode]           = useState(['','','','','',''])
  const [password, setPassword]   = useState('')
  const [working, setWorking]     = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const inputRefs = useRef([])

  const codeStr = code.join('')

  useEffect(() => {
    if (!qrData?.qrUri) { setQrDataUrl(null); return }
    QRCode.toDataURL(qrData.qrUri, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [qrData])

  const handleDigit = (i, val) => {
    const digit = val.replace(/\D/g,'').slice(-1)
    const next = [...code]; next[i] = digit; setCode(next)
    if (digit && i < 5) inputRefs.current[i+1]?.focus()
  }
  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) { inputRefs.current[i-1]?.focus(); const next=[...code]; next[i-1]=''; setCode(next) }
  }
  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6)
    if (text.length) setCode(text.split('').concat(Array(6).fill('')).slice(0,6))
  }
  const resetCode = () => setCode(['','','','','',''])

  const startSetup = async () => {
    setWorking(true)
    try {
      const { data } = await api.post('/auth/2fa/setup')
      // api.js auto-unwraps ResponseDTO → data ya es { secret, qrUri }
      const payload = data?.qrUri ? data : data?.data
      if (!payload?.qrUri) throw new Error('Respuesta inválida del servidor')
      setQrData(payload)
      setStep('setup')
      resetCode()
    } catch (err) {
      console.error('[2FA setup]', err)
      const msg = err.response?.data?.message ?? err.message ?? t('adminConfig.tfaErrorInit')
      toast({ message: msg, type: 'error' })
    } finally { setWorking(false) }
  }
  const activate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterCode'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await api.post('/auth/2fa/activate', { code: codeStr })
      onEnabled(); setStep('idle'); setQrData(null); setQrDataUrl(null); resetCode(); setCopiedAll(false)
      setRecoveryCodes(data?.recoveryCodes ?? data?.data?.recoveryCodes ?? null)
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.tfaWrongCode'), type: 'error' }) }
    finally { setWorking(false) }
  }
  const disable = async () => {
    if (!password || codeStr.length !== 6) { toast({ message: t('adminConfig.tfaFillAll'), type: 'error' }); return }
    setWorking(true)
    try {
      await api.post('/auth/2fa/disable', { contrasena: password, code: codeStr })
      onDisabled(); setStep('idle'); setPassword(''); resetCode()
      toast({ message: t('adminConfig.tfaDisabledToast'), type: 'success' })
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.tfaErrorDisable'), type: 'error' }) }
    finally { setWorking(false) }
  }
  const regenerate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterTotp'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await authService.regenerateRecoveryCodes(codeStr)
      setStep('idle'); resetCode(); setCopiedAll(false)
      setRecoveryCodes(data?.recoveryCodes ?? data?.data?.recoveryCodes ?? null)
      toast({ message: t('adminConfig.tfaCodesRegen'), type: 'success' })
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.tfaErrorRegen'), type: 'error' }) }
    finally { setWorking(false) }
  }
  const cancel = () => { setStep('idle'); resetCode(); setPassword(''); setQrData(null); setQrDataUrl(null) }
  const copyAllCodes = () => { navigator.clipboard.writeText(recoveryCodes.join('\n')); setCopiedAll(true); toast({ message: t('adminConfig.tfaCopiedToast'), type: 'success' }) }
  const downloadCodes = () => {
    const blob = new Blob(['HOTCLICK — Códigos de recuperación 2FA\n','========================================\n','Guardá estos códigos en un lugar seguro.\nCada código solo se puede usar una vez.\n\n',recoveryCodes.join('\n'),'\n'],{type:'text/plain'})
    const url = URL.createObjectURL(blob); const a = document.createElement('a')
    a.href = url; a.download = 'hotclick-recovery-codes.txt'; a.click(); URL.revokeObjectURL(url)
  }

  const OtpInputs = ({ accent = '#4f7cff' }) => (
    <div style={{ display: 'flex', gap: '8px' }} onPaste={handlePaste}>
      {code.map((d, i) => (
        <input key={i} ref={el => inputRefs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
          style={{ width: '42px', height: '46px', borderRadius: '10px', textAlign: 'center', fontSize: '17px', fontWeight: 700, fontFamily: F.mono, outline: 'none', transition: 'all .15s', background: d ? `${accent}18` : 'var(--hc-bg)', border: `1px solid ${d ? `${accent}55` : 'var(--hc-border)'}`, color: 'var(--hc-text)', boxSizing: 'border-box' }}
        />
      ))}
    </div>
  )

  return (
    <>
      <Block label={t('adminConfig.tfaTitle')} sublabel={t('adminConfig.tfaSubtitle')}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><Spinner /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Status row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', borderRadius: '12px', background: enabled ? 'rgba(34,197,94,0.07)' : 'rgba(245,158,11,0.07)', border: `1px solid ${enabled ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: enabled ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }}>
                  {enabled ? <LockIcon style={{ width: '15px', height: '15px', color: '#4ade80' }} /> : <AlertIcon style={{ width: '15px', height: '15px', color: '#fbbf24' }} />}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: enabled ? '#4ade80' : '#fbbf24', fontFamily: F.body, margin: 0 }}>{enabled ? t('adminConfig.tfaEnabledStatus') : t('adminConfig.tfaDisabledStatus')}</p>
                  <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{enabled ? t('adminConfig.tfaProtected') : t('adminConfig.tfaRecommend')}</p>
                </div>
              </div>
              {step === 'idle' && (
                enabled
                  ? <button onClick={() => setStep('disable')} className="cfg-btn cfg-btn-danger" style={{ fontSize: '12px', padding: '7px 14px' }}>{t('adminConfig.tfaDeactivateBtn')}</button>
                  : <button onClick={startSetup} disabled={working} className="cfg-btn cfg-btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }}>{working ? <Spinner size="xs" /> : null}{t('adminConfig.tfaActivateBtn')}</button>
              )}
            </div>

            {enabled && step === 'idle' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <KeyIcon style={{ width: '15px', height: '15px', color: 'var(--hc-muted)', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRecoveryCodes')}</p>
                    <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t('adminConfig.tfaRecoveryDesc')}</p>
                  </div>
                </div>
                <button onClick={() => { setStep('regen'); resetCode() }} className="cfg-btn cfg-btn-ghost" style={{ fontSize: '12px', padding: '7px 14px' }}>{t('adminConfig.tfaRegenBtn')}</button>
              </div>
            )}

            {step === 'setup' && qrData && (
              <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(79,124,255,0.06)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'rgba(79,124,255,0.18)'}`, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--hc-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep1')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div style={{ flexShrink: 0, padding: '10px', background: '#fff', borderRadius: '14px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {qrDataUrl ? <img src={qrDataUrl} alt="QR 2FA" style={{ width: '144px', height: '144px', display: 'block' }} /> : <div style={{ width: '144px', height: '144px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep2Desc')}</p>
                    <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--hc-muted)', marginBottom: '6px', margin: '0 0 6px' }}>Clave de configuración</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <code style={{ fontSize: '12px', color: 'var(--hc-text)', fontFamily: F.mono, letterSpacing: '0.1em', wordBreak: 'break-all', flex: 1 }}>{qrData.secret}</code>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(qrData.secret); toast({ message: t('adminConfig.tfaKeyCopied'), type: 'success' }) }}
                          style={{ flexShrink: 0, padding: '6px', borderRadius: '8px', background: 'var(--hc-surface-2)', border: 'none', cursor: 'pointer', color: 'var(--hc-muted)', display: 'flex' }}>
                          <CopyIcon style={{ width: '13px', height: '13px' }} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--hc-accent)', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                      <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaStep2Label')}</p>
                    </div>
                  </div>
                </div>
                <OtpInputs accent="#4f7cff" />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={activate} disabled={codeStr.length !== 6 || working} className="cfg-btn cfg-btn-primary">{working ? <Spinner size="xs" /> : <CheckIcon style={{ width: '14px', height: '14px' }} />}{t('adminConfig.tfaActivateSubmit')}</button>
                  <button onClick={cancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}

            {step === 'disable' && (
              <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaDisableTitle')}</p>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaDisableDesc')}</p>
                <FormGroup label={t('adminConfig.tfaCurrentPwd')}>
                  <StyledInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('adminConfig.pwdCurrentPh')} />
                </FormGroup>
                <div>
                  <label className="cfg-label" style={{ display: 'block', marginBottom: '8px' }}>{t('adminConfig.tfaAuthCode')}</label>
                  <OtpInputs accent="#ef4444" />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={disable} disabled={working || !password || codeStr.length !== 6} className="cfg-btn" style={{ background: '#dc2626', color: '#fff', boxShadow: '0 1px 10px rgba(220,38,38,0.3)', opacity: (working || !password || codeStr.length !== 6) ? 0.4 : 1, cursor: (working || !password || codeStr.length !== 6) ? 'not-allowed' : 'pointer' }}>{working ? <Spinner size="xs" /> : null}{t('adminConfig.tfaDisableSubmit')}</button>
                  <button onClick={cancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}

            {step === 'regen' && (
              <div style={{ borderRadius: '12px', padding: '16px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyIcon style={{ width: '14px', height: '14px', color: '#c084fc' }} />
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRegenTitle')}</p>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaRegenDesc')}</p>
                <div>
                  <label className="cfg-label" style={{ display: 'block', marginBottom: '8px' }}>{t('adminConfig.tfaAuthCode')}</label>
                  <OtpInputs accent="#a855f7" />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={regenerate} disabled={working || codeStr.length !== 6} className="cfg-btn" style={{ background: '#7c3aed', color: '#fff', opacity: (working || codeStr.length !== 6) ? 0.4 : 1, cursor: (working || codeStr.length !== 6) ? 'not-allowed' : 'pointer' }}>{working ? <Spinner size="xs" /> : <RefreshIcon style={{ width: '14px', height: '14px' }} />}{t('adminConfig.tfaRegenSubmit')}</button>
                  <button onClick={cancel} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Block>

      {/* Recovery codes modal */}
      {recoveryCodes && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div style={{ width: '100%', maxWidth: '440px', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', background: 'var(--hc-surface)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyIcon style={{ width: '20px', height: '20px', color: '#c084fc' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: 0 }}>{t('adminConfig.tfaModalTitle')}</h3>
                <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', lineHeight: 1.5, fontFamily: F.body }}>{t('adminConfig.tfaModalDesc')}</p>
              </div>
            </div>
            <div style={{ margin: '0 24px 16px', padding: '16px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recoveryCodes.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <code style={{ fontSize: '13px', fontFamily: F.mono, letterSpacing: '0.1em', color: 'var(--hc-text)' }}>{c}</code>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>#{i+1}</span>
                </div>
              ))}
            </div>
            <div style={{ margin: '0 24px 16px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertIcon style={{ width: '14px', height: '14px', color: '#f59e0b', flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'rgba(251,191,36,0.9)', fontFamily: F.body, margin: 0 }}>{t('adminConfig.tfaModalWarning')}</p>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', gap: '10px' }}>
              <button onClick={copyAllCodes} className="cfg-btn" style={{ flex: 1, justifyContent: 'center', background: copiedAll ? 'rgba(34,197,94,0.12)' : 'var(--hc-surface-2)', color: copiedAll ? 'var(--hc-success)' : 'var(--hc-text)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'var(--hc-border)'}` }}>
                {copiedAll ? <CheckIcon style={{ width: '14px', height: '14px' }} /> : <CopyIcon style={{ width: '14px', height: '14px' }} />}
                {copiedAll ? t('adminConfig.tfaCopiedAll') : t('adminConfig.tfaCopyAll')}
              </button>
              <button onClick={downloadCodes} className="cfg-btn" style={{ flex: 1, justifyContent: 'center', background: 'rgba(168,85,247,0.08)', color: 'var(--hc-accent)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <DownloadIcon style={{ width: '14px', height: '14px' }} />{t('adminConfig.tfaDownload')}
              </button>
              <button onClick={() => setRecoveryCodes(null)} className="cfg-btn cfg-btn-ghost">{t('adminConfig.tfaClose')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────────────────────────────────────────────────
   SECCIÓN TIENDA
───────────────────────────────────────────────────────── */
function SeccionTienda({ toast }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(() => {
    try {
      return {
        nombreTienda: 'HOTCLICK',
        descripcion: 'Tu tienda de electrónica y tecnología en Costa Rica',
        whatsapp: '50689745370',
        emailContacto: '',
        direccion: '',
        horario: 'Lun-Vie 8am-6pm, Sáb 9am-1pm',
        ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}'),
      }
    } catch { return { nombreTienda: 'HOTCLICK', descripcion: '', whatsapp: '50689745370', emailContacto: '', direccion: '', horario: '' } }
  })
  const [saved, setSaved] = useState(false)
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSave = (e) => {
    e.preventDefault()
    localStorage.setItem(STORE_KEY, JSON.stringify(form))
    setSaved(true)
    toast({ message: t('adminConfig.saveBtn') + ' ✓', type: 'success' })
    setTimeout(() => setSaved(false), 2500)
  }

  const initials = (form.nombreTienda?.[0] ?? 'H').toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.tiendaTitle')} desc={t('adminConfig.tiendaDesc')} />

      {/* Preview card */}
      <Block>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg,#4f7cff,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, color: '#fff', fontFamily: F.display, flexShrink: 0, boxShadow: '0 4px 18px rgba(79,124,255,0.3)' }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: 0, letterSpacing: '-0.01em' }}>{form.nombreTienda || 'HOTCLICK'}</p>
            <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '3px', fontFamily: F.body }}>{form.descripcion || 'Sin descripción'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
              {form.whatsapp && <span style={{ fontSize: '11px', color: '#4ade80', fontFamily: F.body }}>📱 +{form.whatsapp}</span>}
              {form.emailContacto && <span style={{ fontSize: '11px', color: '#60a5fa', fontFamily: F.body }}>✉ {form.emailContacto}</span>}
              {form.horario && <span style={{ fontSize: '11px', color: '#a78bfa', fontFamily: F.body }}>🕐 {form.horario}</span>}
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
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', pointerEvents: 'none' }}>📱</span>
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

/* ─────────────────────────────────────────────────────────
   SECCIÓN DATOS
───────────────────────────────────────────────────────── */
function SeccionDatos({ toast }) {
  const { t } = useTranslation()
  const [stats, setStats]   = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [expProd, setExpProd]   = useState(false)
  const [expOrd,  setExpOrd]    = useState(false)
  const [expCli,  setExpCli]    = useState(false)

  const [cleanCancelled, setCleanCancelled] = useState(false)
  const [cleanInactive,  setCleanInactive]  = useState(false)

  const [pct,        setPct]        = useState('')
  const [applyingPct, setApplyingPct] = useState(false)

  useEffect(() => {
    Promise.allSettled([
      api.get('/productos?size=1&page=0'),
      api.get('/pedidos'),
    ]).then(([p, o]) => {
      const totalProd = p.status === 'fulfilled' ? (p.value.data?.data?.totalElements ?? p.value.data?.totalElements ?? '—') : '—'
      const totalOrd  = o.status === 'fulfilled' ? (Array.isArray(o.value.data?.data) ? o.value.data.data.length : Array.isArray(o.value.data) ? o.value.data.length : '—') : '—'
      setStats({ productos: totalProd, pedidos: totalOrd, clientes: '—' })
    }).finally(() => setLoadingStats(false))
  }, [])

  const downloadCSV = (rows, filename) => {
    if (!rows.length) { toast({ message: 'Sin datos para exportar', type: 'error' }); return }
    const keys   = Object.keys(rows[0])
    const header = keys.join(',')
    const body   = rows.map(r => keys.map(k => {
      const v = String(r[k] ?? '').replace(/"/g, '""')
      return v.includes(',') || v.includes('\n') || v.includes('"') ? `"${v}"` : v
    }).join(','))
    const blob = new Blob(['﻿' + [header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), { href: url, download: filename }).click()
    URL.revokeObjectURL(url)
  }

  const exportProductos = async () => {
    setExpProd(true)
    try {
      const { data } = await api.get('/productos?size=9999&page=0')
      const list = data?.data?.content ?? data?.content ?? data?.data ?? []
      downloadCSV(list.map(p => ({ id: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock, descripcion: p.descripcion ?? '', activo: p.activo ?? true })), `productos-${date()}.csv`)
      toast({ message: t('adminConfig.datosExportOk'), type: 'success' })
    } catch { toast({ message: t('adminConfig.datosExportError'), type: 'error' }) }
    finally { setExpProd(false) }
  }

  const exportPedidos = async () => {
    setExpOrd(true)
    try {
      const { data } = await api.get('/pedidos')
      const list = data?.data ?? data ?? []
      downloadCSV(list.map(p => ({ id: p.id, cliente: p.nombreCliente ?? '', email: p.emailCliente ?? '', estado: p.estado, total: p.total, fecha: p.fechaCreacion ?? '' })), `pedidos-${date()}.csv`)
      toast({ message: t('adminConfig.datosExportOk'), type: 'success' })
    } catch { toast({ message: t('adminConfig.datosExportError'), type: 'error' }) }
    finally { setExpOrd(false) }
  }

  const exportClientes = async () => {
    setExpCli(true)
    try {
      const { data } = await api.get('/admin/usuarios')
      const list = data?.data ?? data ?? []
      downloadCSV(list.map(u => ({ id: u.id, nombre: `${u.nombre ?? ''} ${u.apellidoPaterno ?? ''}`.trim(), email: u.email, telefono: u.telefono ?? '', rol: u.rol })), `clientes-${date()}.csv`)
      toast({ message: t('adminConfig.datosExportOk'), type: 'success' })
    } catch { toast({ message: t('adminConfig.datosExportError'), type: 'error' }) }
    finally { setExpCli(false) }
  }

  const eliminarCancelados = async () => {
    if (!confirm('¿Eliminar todos los pedidos CANCELADOS del historial? Esta acción no se puede deshacer.')) return
    setCleanCancelled(true)
    try {
      await api.delete('/admin/pedidos/cancelados')
      toast({ message: t('adminConfig.datosCleanOk'), type: 'success' })
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.datosCleanError'), type: 'error' }) }
    finally { setCleanCancelled(false) }
  }

  const archivarSinStock = async () => {
    if (!confirm('¿Desactivar todos los productos con stock = 0? Se pueden reactivar individualmente.')) return
    setCleanInactive(true)
    try {
      await api.post('/productos/archivar-sin-stock')
      toast({ message: t('adminConfig.datosCleanOk'), type: 'success' })
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.datosCleanError'), type: 'error' }) }
    finally { setCleanInactive(false) }
  }

  const aplicarAjustePrecio = async () => {
    const num = parseFloat(pct)
    if (isNaN(num) || num === 0) { toast({ message: 'Ingresá un porcentaje válido (ej: 10 o -5)', type: 'error' }); return }
    if (!confirm(`¿Aplicar ${num > 0 ? '+' : ''}${num}% a todos los precios activos?`)) return
    setApplyingPct(true)
    try {
      await api.post('/productos/ajustar-precios', { porcentaje: num })
      toast({ message: t('adminConfig.datosBulkOk'), type: 'success' })
      setPct('')
    } catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.datosBulkError'), type: 'error' }) }
    finally { setApplyingPct(false) }
  }

  const StatCard = ({ label, value, color, icon: Icon }) => (
    <div style={{ padding: '16px', borderRadius: '12px', background: `${color}0f`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: '16px', height: '16px', color }} />
      </div>
      <div>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--hc-text)', fontFamily: F.display, margin: '2px 0 0', lineHeight: 1 }}>
          {loadingStats ? '…' : value}
        </p>
      </div>
    </div>
  )

  const ExportRow = ({ label, desc, loading, onExport, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body }}>{desc}</p>
      </div>
      <button onClick={onExport} disabled={loading} className="cfg-btn"
        style={{ flexShrink: 0, padding: '7px 14px', fontSize: '12px', fontWeight: 600, background: `${color}18`, color, border: `1px solid ${color}35`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, gap: '6px' }}>
        {loading ? <Spinner size="xs" /> : <DownloadIcon style={{ width: '13px', height: '13px' }} />}
        {t('adminConfig.datosExportBtn')}
      </button>
    </div>
  )

  const CleanRow = ({ label, desc, loading, onAction, btnLabel }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '12px', color: 'var(--hc-muted)', fontFamily: F.body }}>{desc}</p>
      </div>
      <button onClick={onAction} disabled={loading} className="cfg-btn cfg-btn-danger" style={{ flexShrink: 0, fontSize: '12px', padding: '7px 14px' }}>
        {loading ? <Spinner size="xs" /> : <TrashLiteIcon style={{ width: '13px', height: '13px' }} />}
        {btnLabel}
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.datosTitle')} desc={t('adminConfig.datosDesc')} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('adminConfig.datosStatsProducts')} value={stats?.productos} color="#4f7cff" icon={BoxIcon} />
        <StatCard label={t('adminConfig.datosStatsOrders')}   value={stats?.pedidos}   color="#22c55e" icon={ShoppingIcon} />
        <StatCard label={t('adminConfig.datosStatsClients')}  value={stats?.clientes}  color="#a78bfa" icon={UserIcon} />
      </div>

      {/* Export */}
      <Block label={t('adminConfig.datosExportTitle')} sublabel={t('adminConfig.datosExportDesc')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <ExportRow label={t('adminConfig.datosExportProductsLabel')} desc={t('adminConfig.datosExportProductsDesc')} loading={expProd} onExport={exportProductos} color="#4f7cff" />
          <hr className="cfg-divider" />
          <ExportRow label={t('adminConfig.datosExportOrdersLabel')}   desc={t('adminConfig.datosExportOrdersDesc')}   loading={expOrd}  onExport={exportPedidos}  color="#22c55e" />
          <hr className="cfg-divider" />
          <ExportRow label={t('adminConfig.datosExportClientsLabel')}  desc={t('adminConfig.datosExportClientsDesc')}  loading={expCli}  onExport={exportClientes} color="#a78bfa" />
        </div>
      </Block>

      {/* Bulk price */}
      <Block label={t('adminConfig.datosBulkTitle')} sublabel={t('adminConfig.datosBulkDesc')}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <FormGroup label="Porcentaje (+ subir / − bajar)">
              <div style={{ position: 'relative' }}>
                <PercentIcon style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--hc-muted)', pointerEvents: 'none' }} />
                <StyledInput type="number" value={pct} onChange={e => setPct(e.target.value)} placeholder={t('adminConfig.datosBulkPh')} style={{ paddingRight: '36px' }} />
              </div>
            </FormGroup>
          </div>
          <button onClick={aplicarAjustePrecio} disabled={applyingPct || !pct} className="cfg-btn cfg-btn-primary" style={{ marginBottom: '1px', opacity: (!pct || applyingPct) ? 0.5 : 1 }}>
            {applyingPct ? <Spinner size="xs" /> : <ZapIcon style={{ width: '14px', height: '14px' }} />}
            {t('adminConfig.datosBulkBtn')}
          </button>
        </div>
        {pct && !isNaN(parseFloat(pct)) && (
          <p style={{ fontSize: '12px', color: parseFloat(pct) >= 0 ? '#4ade80' : '#f87171', marginTop: '8px', fontFamily: F.body }}>
            {parseFloat(pct) >= 0 ? '↑' : '↓'} Todos los precios {parseFloat(pct) >= 0 ? 'subirán' : 'bajarán'} un {Math.abs(parseFloat(pct))}%
          </p>
        )}
      </Block>

      {/* Cleanup */}
      <Block label={t('adminConfig.datosCleanTitle')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <CleanRow label={t('adminConfig.datosCleanCancelledLabel')} desc={t('adminConfig.datosCleanCancelledDesc')} loading={cleanCancelled} onAction={eliminarCancelados} btnLabel={t('adminConfig.datosCleanCancelledBtn')} />
          <hr className="cfg-divider" />
          <CleanRow label={t('adminConfig.datosCleanInactiveLabel')}  desc={t('adminConfig.datosCleanInactiveDesc')}  loading={cleanInactive}  onAction={archivarSinStock}   btnLabel={t('adminConfig.datosCleanInactiveBtn')} />
        </div>
      </Block>
    </div>
  )
}

function date() { return new Date().toISOString().split('T')[0] }

/* ─────────────────────────────────────────────────────────
   SECCIÓN NOTIFICACIONES
───────────────────────────────────────────────────────── */
function SeccionNotificaciones({ toast }) {
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

  const items = [
    { key: 'emailPedidos',      icon: ShoppingIcon, titleKey: 'adminConfig.notifEmailOrders',  descKey: 'adminConfig.notifEmailOrdersDesc' },
    { key: 'emailGuia',         icon: TruckIcon,    titleKey: 'adminConfig.notifEmailGuia',    descKey: 'adminConfig.notifEmailGuiaDesc' },
    { key: 'emailFallido',      icon: AlertIcon,    titleKey: 'adminConfig.notifEmailFailed',  descKey: 'adminConfig.notifEmailFailedDesc' },
    { key: 'sonidoNuevoPedido', icon: BellIcon,     titleKey: 'adminConfig.notifSoundNew',     descKey: 'adminConfig.notifSoundNewDesc' },
  ]

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

      <Block label={t('adminConfig.notifWaTitle')} sublabel={t('adminConfig.notifWaSubtitle')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)', fontSize: '13px', fontFamily: F.mono }}>
          <span style={{ fontSize: '16px' }}>📱</span>
          <span style={{ flex: 1 }}>+506 8974-5370</span>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>Andrés Zúñiga</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '8px', fontFamily: F.body }}>{t('adminConfig.notifWaNote')}</p>
      </Block>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SECCIÓN APARIENCIA
───────────────────────────────────────────────────────── */
function SeccionApariencia() {
  const { t } = useTranslation()
  const { theme, setTheme, fontSize, setFontSize, highContrast, toggleHighContrast, reduceMotion, toggleReduceMotion } = useUiStore()

  const themes = [
    { id: 'dark',  labelKey: 'adminConfig.apThemeDark',  bg: '#0a0a0d', accent: '#4f7cff' },
    { id: 'light', labelKey: 'adminConfig.apThemeLight', bg: '#f5f5f5', accent: '#4f7cff' },
  ]
  const sizes = [
    { id: 'base', labelKey: 'adminConfig.apFontNormal' },
    { id: 'lg',   labelKey: 'adminConfig.apFontLarge' },
    { id: 'xl',   labelKey: 'adminConfig.apFontXL' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title={t('adminConfig.apTitle')} desc={t('adminConfig.apDesc')} />

      <Block label={t('adminConfig.apThemeTitle')} sublabel={t('adminConfig.apThemeSubtitle')}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {themes.map(th => (
            <button key={th.id} onClick={() => setTheme(th.id)} className="cfg-btn"
              style={{ flex: 1, flexDirection: 'column', gap: '8px', padding: '16px', border: `1px solid ${theme === th.id ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: theme === th.id ? 'var(--hc-glass-bg)' : 'var(--hc-bg)', fontWeight: 400 }}>
              <div style={{ width: '48px', height: '32px', borderRadius: '8px', border: '1px solid var(--hc-border)', overflow: 'hidden', position: 'relative', background: th.bg }}>
                <div style={{ position: 'absolute', top: '6px', left: '6px', width: '12px', height: '4px', borderRadius: '2px', background: th.accent, opacity: 0.8 }} />
                <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', height: '4px', borderRadius: '2px', background: 'var(--hc-border)' }} />
              </div>
              <p style={{ fontSize: '12px', color: theme === th.id ? 'var(--hc-accent)' : 'var(--hc-muted)', fontFamily: F.body, margin: 0, fontWeight: theme === th.id ? 600 : 400 }}>{t(th.labelKey)}</p>
              {theme === th.id && <CheckIcon style={{ width: '13px', height: '13px', color: 'var(--hc-accent)' }} />}
            </button>
          ))}
        </div>
      </Block>

      <Block label={t('adminConfig.apFontTitle')} sublabel={t('adminConfig.apFontSubtitle')}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {sizes.map(s => (
            <button key={s.id} onClick={() => setFontSize(s.id)} className="cfg-btn"
              style={{ flex: 1, justifyContent: 'center', border: `1px solid ${fontSize === s.id ? 'var(--hc-accent)' : 'var(--hc-border)'}`, background: fontSize === s.id ? 'var(--hc-glass-bg)' : 'var(--hc-surface-2)', color: fontSize === s.id ? 'var(--hc-accent)' : 'var(--hc-muted)', fontWeight: fontSize === s.id ? 600 : 400, padding: '8px' }}>
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </Block>

      <Block label={t('adminConfig.apAccessTitle')}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            { key: 'highContrast', labelKey: 'adminConfig.apHighContrast', descKey: 'adminConfig.apHighContrastDesc', value: highContrast, fn: toggleHighContrast },
            { key: 'reduceMotion', labelKey: 'adminConfig.apReduceMotion', descKey: 'adminConfig.apReduceMotionDesc', value: reduceMotion, fn: toggleReduceMotion },
          ].map(({ key, labelKey, descKey, value, fn }, idx) => (
            <div key={key}>
              {idx > 0 && <hr className="cfg-divider" />}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{t(labelKey)}</p>
                  <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{t(descKey)}</p>
                </div>
                <Toggle checked={value} onChange={fn} />
              </div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SECCIÓN SISTEMA
───────────────────────────────────────────────────────── */
function SeccionSistema({ toast }) {
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
    try { await api.get('/health'); setHealthOk(true); toast({ message: t('adminConfig.sysHealthOkToast'), type: 'success' }) }
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
    try { await api.post('/admin/reset-datos'); toast({ message: t('adminConfig.sysResetToast'), type: 'success' }); closeResetModal() }
    catch (err) { toast({ message: err.response?.data?.message ?? t('adminConfig.sysResetError'), type: 'error' }) }
    finally { setResetting(false) }
  }
  const forceRefreshCache = async () => {
    setClearing(true)
    try { await api.get('/marcas/publicas'); toast({ message: t('adminConfig.sysCacheToast'), type: 'success' }) }
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
            { labelKey: 'adminConfig.sysFrontend', value: 'React + Vite',    color: '#a78bfa' },
            { labelKey: 'adminConfig.sysDB',       value: 'Supabase (PG)',   color: '#34d399' },
            { labelKey: 'adminConfig.sysDeploy',   value: 'Render',          color: '#fb923c' },
            { labelKey: 'adminConfig.sysPayments', value: 'PayXpert/PayPal', color: '#f472b6' },
            { labelKey: 'adminConfig.sysStorage',  value: 'Supabase S3',     color: '#60a5fa' },
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
            { label: 'Pasarela de pagos', descKey: 'adminConfig.sysPayXpertDesc', color: '#a78bfa', icon: CardIcon },
          ].map(({ label, descKey, color, icon: Icon }) => (
            <div key={label}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', cursor: 'pointer', transition: 'border-color .2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = `${color}40`}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--hc-border)'}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
              <label className="cfg-label">{t('adminConfig.sysResetInputLabel')}</label>
              <StyledInput value={resetInput} onChange={e => setResetInput(e.target.value)} placeholder="ELIMINAR" autoFocus
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

/* ─────────────────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────────────────── */
function SectionHeader({ title, desc }) {
  return (
    <div style={{ paddingBottom: '4px' }}>
      <h2 style={{ fontFamily: F.display, fontWeight: 700, fontSize: '17px', color: 'var(--hc-text)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
      {desc && <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', fontFamily: F.body }}>{desc}</p>}
    </div>
  )
}

function Block({ label, sublabel, children }) {
  return (
    <div className="cfg-card">
      {label && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--hc-border)' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{label}</p>
          {sublabel && <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>{sublabel}</p>}
        </div>
      )}
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

function FormGroup({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label className="cfg-label">{label}</label>
        {hint && <span style={{ fontSize: '10px', color: 'var(--hc-muted)', fontFamily: F.body, opacity: 0.7 }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function StyledInput({ error, style, onFocus, onBlur, ...props }) {
  return (
    <input
      className="cfg-input"
      data-error={error ? 'true' : undefined}
      style={{ ...style }}
      {...props}
    />
  )
}

function PasswordInput({ show, onToggle, error, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <StyledInput type={show ? 'text' : 'password'} error={error} style={{ paddingRight: '44px' }} {...props} />
      <button type="button" onClick={onToggle} tabIndex={-1}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--hc-muted)', cursor: 'pointer', background: 'none', border: 'none', background: 'none', padding: 0, display: 'flex', transition: 'color .15s' }}
        onMouseEnter={e => e.currentTarget.style.color='var(--hc-text)'}
        onMouseLeave={e => e.currentTarget.style.color='var(--hc-muted)'}>
        {show ? <EyeOffIcon style={{ width: '15px', height: '15px' }} /> : <EyeIcon style={{ width: '15px', height: '15px' }} />}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className="cfg-toggle"
      style={{ background: checked ? 'var(--hc-accent)' : 'var(--hc-border-strong)', boxShadow: checked ? '0 0 12px var(--hc-shadow)' : 'none' }}>
      <span className="cfg-toggle-knob" style={{ left: checked ? '23px' : '3px' }} />
    </button>
  )
}

function SaveButton({ saving, saved, label }) {
  const { t } = useTranslation()
  return (
    <button type="submit" disabled={saving || saved}
      className={`cfg-btn ${saved ? 'cfg-btn-success' : 'cfg-btn-primary'}`}
      style={{ opacity: (saving || saved) ? 0.8 : 1 }}>
      {saving ? <Spinner size="xs" /> : saved ? <CheckIcon style={{ width: '14px', height: '14px' }} /> : null}
      {saved ? t('adminConfig.savedLabel') : (label ?? t('adminConfig.saveBtn'))}
    </button>
  )
}

function LoadingSkeleton({ rows = 3 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ height: '44px', borderRadius: '10px', background: 'var(--hc-surface-2)', opacity: 1 - i * 0.15, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

function passwordStrength(pw, t) {
  if (!pw) return { score: 0, label: '', color: 'var(--hc-muted)' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  const labels = [t('adminConfig.pwdStrengthWeak'),t('adminConfig.pwdStrengthFair'),t('adminConfig.pwdStrengthGood'),t('adminConfig.pwdStrengthStrong')]
  const colors = ['#ef4444','#f59e0b','#3b82f6','#22c55e']
  return { score: s, label: labels[s-1] ?? labels[0], color: colors[s-1] ?? '#ef4444' }
}

/* ─────────────────────────────────────────────────────────
   ICONS
───────────────────────────────────────────────────────── */
const sv = { fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round', strokeLinejoin:'round' }
function UserIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> }
function ShieldIcon(p)    { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M12 2l8 4v5c0 5-3.5 9.7-8 11C7.5 20.7 4 16 4 11V6l8-4z"/></svg> }
function BellIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> }
function PaletteIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg> }
function CogIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
function MailIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function LockIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> }
function AlertIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function CheckIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><polyline points="20 6 9 17 4 12"/></svg> }
function CopyIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> }
function EyeIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> }
function EyeOffIcon(p)    { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> }
function RefreshIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> }
function TrashLiteIcon(p) { return <svg viewBox="0 0 24 24" {...sv} {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> }
function RestoreIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> }
function DBIcon(p)        { return <svg viewBox="0 0 24 24" {...sv} {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> }
function ServerIcon(p)    { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> }
function CardIcon(p)      { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
function ShoppingIcon(p)  { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> }
function TruckIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> }
function SkullIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M12 2a9 9 0 00-9 9c0 3.07 1.54 5.78 3.9 7.43V21h10v-2.57A9 9 0 0012 2z"/><line x1="9" y1="17" x2="9" y2="21"/><line x1="15" y1="17" x2="15" y2="21"/><circle cx="9" cy="10" r="1.5" fill="currentColor" strokeWidth="0"/><circle cx="15" cy="10" r="1.5" fill="currentColor" strokeWidth="0"/></svg> }
function KeyIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg> }
function DownloadIcon(p)  { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
function StoreIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M3 9l1-6h16l1 6"/><path d="M3 9a2 2 0 002 2 2 2 0 002-2 2 2 0 002 2 2 2 0 002-2 2 2 0 002 2 2 2 0 002-2"/><path d="M5 21V11a2 2 0 012-2h10a2 2 0 012 2v10"/><line x1="9" y1="21" x2="9" y2="15"/><line x1="15" y1="21" x2="15" y2="15"/></svg> }
function DatabaseIcon(p)  { return <svg viewBox="0 0 24 24" {...sv} {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> }
function PinIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function ClockIcon(p)     { return <svg viewBox="0 0 24 24" {...sv} {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function PercentIcon(p)   { return <svg viewBox="0 0 24 24" {...sv} {...p}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg> }
function ZapIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
function BoxIcon(p)       { return <svg viewBox="0 0 24 24" {...sv} {...p}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> }
