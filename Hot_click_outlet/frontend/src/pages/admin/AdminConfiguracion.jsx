import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import AdminLayout from '@/layouts/AdminLayout'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'
import api from '@/services/api'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'
import QRCode from 'qrcode'

/* ── Saved notifications prefs key ── */
const NOTIF_KEY = 'hotclick-notif-prefs'
const defaultNotifPrefs = {
  emailPedidos: true,
  emailGuia: true,
  emailFallido: true,
  sonidoNuevoPedido: false,
}

export default function AdminConfiguracion() {
  const { t } = useTranslation()
  const toast  = useToast()
  const { userId, userEmail, userName, setUserName, refreshToken } = useAuthStore()
  const [section, setSection]   = useState('perfil')
  const [twoFAOn, setTwoFAOn]   = useState(false)

  const nav = [
    { id: 'perfil',         label: t('adminConfig.navPerfil'),         icon: UserIcon },
    { id: 'seguridad',      label: t('adminConfig.navSeguridad'),      icon: ShieldIcon,  badge: !twoFAOn ? '!' : null },
    { id: 'notificaciones', label: t('adminConfig.navNotificaciones'), icon: BellIcon },
    { id: 'apariencia',     label: t('adminConfig.navApariencia'),     icon: PaletteIcon },
    { id: 'sistema',        label: t('adminConfig.navSistema'),        icon: CogIcon },
  ]

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 700 }}
              className="text-2xl text-[#e8e8ed] tracking-tight">{t('adminConfig.title')}</h1>
          <p className="text-sm text-[#8e8e9a] mt-0.5">{t('adminConfig.subtitle')}</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* ── Left nav ── */}
          <aside className="w-52 shrink-0 hidden md:block">
            <nav className="space-y-0.5">
              {nav.map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setSection(id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group"
                  style={{
                    background: section === id ? 'rgba(79,124,255,0.12)' : 'transparent',
                    color: section === id ? '#e8e8ed' : '#8e8e9a',
                    border: section === id ? '1px solid rgba(79,124,255,0.2)' : '1px solid transparent',
                    boxShadow: section === id ? 'inset 3px 0 0 #4f7cff' : 'none',
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: section === id ? '#4f7cff' : 'inherit' }} />
                  <span className="flex-1 font-medium">{label}</span>
                  {badge && (
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center shrink-0">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Divider + version */}
            <div className="mt-6 pt-4 border-t border-white/5 px-3">
              <p className="text-[10px] text-[#8e8e9a]/50 uppercase tracking-widest">HOTCLICK</p>
              <p className="text-[11px] text-[#8e8e9a]/40 mt-0.5">v1.0 · Admin Panel</p>
            </div>
          </aside>

          {/* ── Mobile nav (horizontal pills) ── */}
          <div className="md:hidden w-full mb-4 flex gap-1.5 overflow-x-auto pb-1">
            {nav.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 relative"
                style={{
                  background: section === id ? '#4f7cff' : 'rgba(255,255,255,0.05)',
                  color: section === id ? '#fff' : '#8e8e9a',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {badge && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] font-bold text-black flex items-center justify-center">{badge}</span>}
              </button>
            ))}
          </div>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0">
            {section === 'perfil'         && <SeccionPerfil userId={userId} userEmail={userEmail} userName={userName} setUserName={setUserName} toast={toast} />}
            {section === 'seguridad'      && <SeccionSeguridad refreshToken={refreshToken} toast={toast} onTwoFAChange={setTwoFAOn} />}
            {section === 'notificaciones' && <SeccionNotificaciones toast={toast} />}
            {section === 'apariencia'     && <SeccionApariencia />}
            {section === 'sistema'        && <SeccionSistema toast={toast} />}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

/* ══════════════════════════════════════════════════════
   SECCIÓN PERFIL
══════════════════════════════════════════════════════ */
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

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

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
    <div className="space-y-5">
      <SectionHeader title={t('adminConfig.perfilTitle')} desc={t('adminConfig.perfilDesc')} />

      {/* Avatar row */}
      <Block>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg,#4f7cff,#8c5cf6)', color: '#fff', fontFamily: '"DM Sans",sans-serif' }}
          >
            {initials.toUpperCase() || 'HC'}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e8e8ed]">{form.nombre || userName || 'Admin'} {form.apellidoPaterno}</p>
            <p className="text-xs text-[#8e8e9a] mt-0.5 font-mono">{userEmail}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              <span className="text-[11px] text-[#8e8e9a]">{t('adminConfig.perfilActive')}</span>
            </div>
          </div>
        </div>
      </Block>

      {/* Form */}
      <Block>
        <form onSubmit={handleSave} className="space-y-5">
          {/* Email readonly */}
          <FormGroup label={t('adminConfig.perfilEmailLabel')} hint={t('adminConfig.perfilEmailHint')}>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/3 border border-white/8 text-[#8e8e9a] text-sm font-mono">
              <MailIcon className="w-4 h-4 shrink-0 opacity-40" />
              {userEmail}
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8e8e9a]/60 uppercase tracking-wider">{t('adminConfig.perfilReadOnly')}</span>
            </div>
          </FormGroup>

          <Divider />

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
              <StyledInput value={form.telefono} onChange={set('telefono')} placeholder={t('adminConfig.perfilPhonePh')} type="tel" />
            </FormGroup>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <SaveButton saving={saving} saved={saved} />
            {saved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />{t('adminConfig.perfilSavedLabel')}</span>}
          </div>
        </form>
      </Block>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SECCIÓN SEGURIDAD
══════════════════════════════════════════════════════ */
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
    <div className="space-y-5">
      <SectionHeader title={t('adminConfig.navSeguridad')} desc={t('adminConfig.pwdSubtitle')} />

      {/* Security score */}
      <Block>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#e8e8ed]">{t('adminConfig.secScore')}</p>
            <p className="text-xs text-[#8e8e9a] mt-0.5">{t('adminConfig.secScoreBase')}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: scoreColor }}>{scoreLabel}</p>
            <div className="flex gap-1 mt-1 justify-end">
              {[1, 2].map(i => (
                <div key={i} className="w-8 h-1.5 rounded-full transition-all duration-500"
                     style={{ background: i <= score ? scoreColor : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
          </div>
        </div>
        {!twoFAEnabled && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <span className="text-amber-400 shrink-0"><AlertIcon className="w-4 h-4" /></span>
            <p className="text-xs text-amber-300/90">{t('adminConfig.secEnable2FA')}</p>
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
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const strength = passwordStrength(form.nuevaContrasena, t)

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.nuevaContrasena.length < 6) { toast({ message: t('adminConfig.pwdMin6'), type: 'error' }); return }
    if (form.nuevaContrasena !== form.confirmar) { toast({ message: t('adminConfig.pwdNoMatch'), type: 'error' }); return }
    setSaving(true)
    try {
      await api.post('/auth/change-password', {
        contrasenaActual: form.contrasenaActual,
        nuevaContrasena:  form.nuevaContrasena,
        refreshToken:     refreshToken ?? '',
      })
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
      <form onSubmit={handleSave} className="space-y-4">
        <FormGroup label={t('adminConfig.pwdCurrentLabel')}>
          <PasswordInput value={form.contrasenaActual} onChange={set('contrasenaActual')} show={showCurrent} onToggle={() => setShowCurrent(p => !p)} placeholder={t('adminConfig.pwdCurrentPh')} required />
        </FormGroup>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormGroup label={t('adminConfig.pwdNewLabel')}>
              <PasswordInput value={form.nuevaContrasena} onChange={set('nuevaContrasena')} show={showNew} onToggle={() => setShowNew(p => !p)} placeholder={t('adminConfig.pwdNewPh')} required />
            </FormGroup>
            {form.nuevaContrasena && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                         style={{ background: i < strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: strength.color }}>{strength.label}</p>
              </div>
            )}
          </div>
          <FormGroup label={t('adminConfig.pwdConfirmLabel')}>
            <PasswordInput value={form.confirmar} onChange={set('confirmar')} show={showNew} onToggle={() => setShowNew(p => !p)} placeholder={t('adminConfig.pwdConfirmPh')} required
              error={form.confirmar && form.confirmar !== form.nuevaContrasena} />
          </FormGroup>
        </div>

        <div className="flex items-center gap-3">
          <SaveButton saving={saving} saved={saved} label={t('adminConfig.pwdUpdateBtn')} />
          {saved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />{t('adminConfig.pwdUpdatedLabel')}</span>}
        </div>
      </form>
    </Block>
  )
}

function Panel2FA({ enabled, loading, toast, onEnabled, onDisabled }) {
  const { t } = useTranslation()
  const [step, setStep]         = useState('idle') // idle | setup | disable | regen
  const [qrData, setQrData]     = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [code, setCode]         = useState(['','','','','',''])
  const [password, setPassword] = useState('')
  const [working, setWorking]   = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState(null) // shown in modal after activate/regen
  const [copiedAll, setCopiedAll] = useState(false)
  const inputRefs = useRef([])

  const codeStr = code.join('')

  // Generate QR data URL client-side when qrData changes
  useEffect(() => {
    if (!qrData?.qrUri) { setQrDataUrl(null); return }
    QRCode.toDataURL(qrData.qrUri, { width: 160, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(null))
  }, [qrData])

  const handleDigit = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next  = [...code]; next[i] = digit
    setCode(next)
    if (digit && i < 5) inputRefs.current[i+1]?.focus()
  }

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i-1]?.focus()
      const next = [...code]; next[i-1] = ''; setCode(next)
    }
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
      setQrData(data.data)
      setStep('setup')
      resetCode()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('adminConfig.tfaErrorInit'), type: 'error' })
    } finally { setWorking(false) }
  }

  const activate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterCode'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await api.post('/auth/2fa/activate', { code: codeStr })
      onEnabled()
      setStep('idle')
      setQrData(null)
      setQrDataUrl(null)
      resetCode()
      setCopiedAll(false)
      setRecoveryCodes(data.data?.recoveryCodes ?? null)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('adminConfig.tfaWrongCode'), type: 'error' })
    } finally { setWorking(false) }
  }

  const disable = async () => {
    if (!password || codeStr.length !== 6) { toast({ message: t('adminConfig.tfaFillAll'), type: 'error' }); return }
    setWorking(true)
    try {
      await api.post('/auth/2fa/disable', { contrasena: password, code: codeStr })
      onDisabled()
      setStep('idle')
      setPassword('')
      resetCode()
      toast({ message: t('adminConfig.tfaDisabledToast'), type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('adminConfig.tfaErrorDisable'), type: 'error' })
    } finally { setWorking(false) }
  }

  const regenerate = async () => {
    if (codeStr.length !== 6) { toast({ message: t('adminConfig.tfaEnterTotp'), type: 'error' }); return }
    setWorking(true)
    try {
      const { data } = await authService.regenerateRecoveryCodes(codeStr)
      setStep('idle')
      resetCode()
      setCopiedAll(false)
      setRecoveryCodes(data.data?.recoveryCodes ?? null)
      toast({ message: t('adminConfig.tfaCodesRegen'), type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('adminConfig.tfaErrorRegen'), type: 'error' })
    } finally { setWorking(false) }
  }

  const cancel = () => { setStep('idle'); resetCode(); setPassword(''); setQrData(null); setQrDataUrl(null) }

  const copyAllCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopiedAll(true)
    toast({ message: t('adminConfig.tfaCopiedToast'), type: 'success' })
  }

  const downloadCodes = () => {
    const blob = new Blob([
      'HOTCLICK — Códigos de recuperación 2FA\n',
      '========================================\n',
      'Guardá estos códigos en un lugar seguro.\n',
      'Cada código solo se puede usar una vez.\n\n',
      recoveryCodes.join('\n'),
      '\n',
    ], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'hotclick-recovery-codes.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  // OTP digit inputs (shared between setup and disable/regen)
  const OtpInputs = ({ accent = '#4f7cff' }) => (
    <div className="flex gap-2" onPaste={handlePaste}>
      {code.map((d, i) => (
        <input key={i} ref={el => inputRefs.current[i] = el}
          type="text" inputMode="numeric" maxLength={1}
          value={d} onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
          className="w-10 h-11 rounded-xl text-center text-base font-bold font-mono outline-none transition-all"
          style={{
            background: d ? `${accent}20` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${d ? `${accent}60` : 'rgba(255,255,255,0.12)'}`,
            color: '#e8e8ed',
          }}
        />
      ))}
    </div>
  )

  return (
    <>
      <Block label={t('adminConfig.tfaTitle')} sublabel={t('adminConfig.tfaSubtitle')}>
        {loading ? <div className="flex justify-center py-6"><Spinner /></div> : (
          <div className="space-y-4">
            {/* Status row */}
            <div className="flex items-center justify-between p-3.5 rounded-xl"
                 style={{ background: enabled ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${enabled ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                     style={{ background: enabled ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)' }}>
                  {enabled ? <LockIcon className="w-4 h-4 text-green-400" /> : <AlertIcon className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: enabled ? '#4ade80' : '#fbbf24' }}>
                    {enabled ? t('adminConfig.tfaEnabledStatus') : t('adminConfig.tfaDisabledStatus')}
                  </p>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">
                    {enabled ? t('adminConfig.tfaProtected') : t('adminConfig.tfaRecommend')}
                  </p>
                </div>
              </div>
              {step === 'idle' && (
                enabled
                  ? <button onClick={() => setStep('disable')} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-colors">{t('adminConfig.tfaDeactivateBtn')}</button>
                  : <button onClick={startSetup} disabled={working} className="text-xs px-3 py-1.5 rounded-lg bg-[#4f7cff] text-white hover:bg-[#4f7cff]/80 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                      {working ? <Spinner size="xs" /> : null} {t('adminConfig.tfaActivateBtn')}
                    </button>
              )}
            </div>

            {/* Recovery codes shortcut — only when enabled and idle */}
            {enabled && step === 'idle' && (
              <div className="flex items-center justify-between px-3.5 py-3 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center gap-3">
                  <KeyIcon className="w-4 h-4 text-[#8e8e9a] shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#e8e8ed]">{t('adminConfig.tfaRecoveryCodes')}</p>
                    <p className="text-xs text-[#8e8e9a] mt-0.5">{t('adminConfig.tfaRecoveryDesc')}</p>
                  </div>
                </div>
                <button onClick={() => { setStep('regen'); resetCode() }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">
                  {t('adminConfig.tfaRegenBtn')}
                </button>
              </div>
            )}

            {/* Setup flow */}
            {step === 'setup' && qrData && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.18)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-[#4f7cff] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  <p className="text-sm font-semibold text-[#e8e8ed]">{t('adminConfig.tfaStep1')}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="shrink-0 p-3 bg-white rounded-2xl shadow-xl">
                    {qrDataUrl
                      ? <img src={qrDataUrl} alt="Código QR 2FA" className="w-40 h-40 block" />
                      : <div className="w-40 h-40 flex items-center justify-center"><Spinner /></div>
                    }
                  </div>

                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-[#8e8e9a]">{t('adminConfig.tfaStep2Desc')}</p>

                    <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[10px] uppercase tracking-widest text-[#8e8e9a] mb-1.5">{t('adminConfig.tfaSetupKey')}</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[13px] text-[#e8e8ed] font-mono tracking-widest break-all leading-relaxed flex-1">{qrData.secret}</code>
                        <button type="button"
                          onClick={() => { navigator.clipboard.writeText(qrData.secret); toast({ message: t('adminConfig.tfaKeyCopied'), type: 'success' }) }}
                          className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#8e8e9a' }}>
                          <CopyIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#4f7cff] text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                      <p className="text-xs text-[#8e8e9a]">{t('adminConfig.tfaStep2Label')}</p>
                    </div>
                  </div>
                </div>

                <OtpInputs accent="#4f7cff" />

                <div className="flex gap-2.5 pt-1">
                  <button onClick={activate} disabled={codeStr.length !== 6 || working}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#4f7cff] text-white transition-all disabled:opacity-40 hover:bg-[#4f7cff]/80">
                    {working ? <Spinner size="xs" /> : <CheckIcon className="w-4 h-4" />}
                    {t('adminConfig.tfaActivateSubmit')}
                  </button>
                  <button onClick={cancel} className="px-4 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">
                    {t('adminConfig.tfaCancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Disable flow */}
            {step === 'disable' && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <p className="text-sm font-semibold text-[#e8e8ed]">{t('adminConfig.tfaDisableTitle')}</p>
                <p className="text-xs text-[#8e8e9a]">{t('adminConfig.tfaDisableDesc')}</p>
                <FormGroup label={t('adminConfig.tfaCurrentPwd')}>
                  <StyledInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('adminConfig.pwdCurrentPh')} />
                </FormGroup>
                <div>
                  <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider block mb-2">{t('adminConfig.tfaAuthCode')}</label>
                  <OtpInputs accent="#ef4444" />
                </div>
                <div className="flex gap-2.5">
                  <button onClick={disable} disabled={working || !password || codeStr.length !== 6}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-40">
                    {working ? <Spinner size="xs" /> : null} {t('adminConfig.tfaDisableSubmit')}
                  </button>
                  <button onClick={cancel} className="px-4 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}

            {/* Regenerate recovery codes flow */}
            {step === 'regen' && (
              <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="flex items-center gap-2">
                  <KeyIcon className="w-4 h-4 text-purple-400" />
                  <p className="text-sm font-semibold text-[#e8e8ed]">{t('adminConfig.tfaRegenTitle')}</p>
                </div>
                <p className="text-xs text-[#8e8e9a]">{t('adminConfig.tfaRegenDesc')}</p>
                <div>
                  <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider block mb-2">{t('adminConfig.tfaAuthCode')}</label>
                  <OtpInputs accent="#a855f7" />
                </div>
                <div className="flex gap-2.5">
                  <button onClick={regenerate} disabled={working || codeStr.length !== 6}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: '#7c3aed', color: '#fff' }}>
                    {working ? <Spinner size="xs" /> : <RefreshIcon className="w-4 h-4" />}
                    {t('adminConfig.tfaRegenSubmit')}
                  </button>
                  <button onClick={cancel} className="px-4 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">{t('adminConfig.tfaCancel')}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Block>

      {/* Recovery codes modal */}
      {recoveryCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#111114', border: '1px solid rgba(168,85,247,0.3)' }}>
            <div className="px-6 pt-6 pb-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(168,85,247,0.15)' }}>
                <KeyIcon className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e8e8ed]">{t('adminConfig.tfaModalTitle')}</h3>
                <p className="text-xs text-[#8e8e9a] mt-1 leading-relaxed">
                  {t('adminConfig.tfaModalDesc')}
                </p>
              </div>
            </div>

            <div className="mx-6 mb-4 p-4 rounded-xl space-y-1.5" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {recoveryCodes.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <code className="text-sm font-mono tracking-widest text-[#e8e8ed]">{c}</code>
                  <span className="text-[10px] px-1.5 py-0.5 rounded text-[#8e8e9a]" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    #{i + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="mx-6 mb-4 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertIcon className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300/90">{t('adminConfig.tfaModalWarning')}</p>
            </div>

            <div className="px-6 pb-5 flex gap-2.5">
              <button onClick={copyAllCodes}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
                style={{ background: copiedAll ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copiedAll ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: copiedAll ? '#4ade80' : '#e8e8ed' }}>
                {copiedAll ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                {copiedAll ? t('adminConfig.tfaCopiedAll') : t('adminConfig.tfaCopyAll')}
              </button>
              <button onClick={downloadCodes}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 justify-center"
                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)', color: '#c084fc' }}>
                <DownloadIcon className="w-4 h-4" />
                {t('adminConfig.tfaDownload')}
              </button>
              <button onClick={() => setRecoveryCodes(null)}
                className="px-4 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">
                {t('adminConfig.tfaClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════
   SECCIÓN NOTIFICACIONES
══════════════════════════════════════════════════════ */
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
    <div className="space-y-5">
      <SectionHeader title={t('adminConfig.notifTitle')} desc={t('adminConfig.notifDesc')} />
      <Block>
        <div className="space-y-1">
          {items.map(({ key, icon: Icon, titleKey, descKey }, idx) => (
            <div key={key}>
              {idx > 0 && <Divider />}
              <div className="flex items-center gap-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#8e8e9a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e8ed]">{t(titleKey)}</p>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">{t(descKey)}</p>
                </div>
                <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block label={t('adminConfig.notifWaTitle')} sublabel={t('adminConfig.notifWaSubtitle')}>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/3 border border-white/8 text-[#8e8e9a] text-sm font-mono">
              <span className="text-green-400 text-base">📱</span>
              +506 8974-5370
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/5 uppercase tracking-wider">Andrés Zúñiga</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#8e8e9a]/60 mt-2">{t('adminConfig.notifWaNote')}</p>
      </Block>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SECCIÓN APARIENCIA
══════════════════════════════════════════════════════ */
function SeccionApariencia() {
  const { t } = useTranslation()
  const { theme, setTheme, fontSize, setFontSize, highContrast, setHighContrast, reduceMotion, setReduceMotion } = useUiStore()

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
    <div className="space-y-5">
      <SectionHeader title={t('adminConfig.apTitle')} desc={t('adminConfig.apDesc')} />

      {/* Theme */}
      <Block label={t('adminConfig.apThemeTitle')} sublabel={t('adminConfig.apThemeSubtitle')}>
        <div className="flex gap-3">
          {themes.map(th => (
            <button key={th.id} onClick={() => setTheme(th.id)}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
              style={{ border: `1px solid ${theme === th.id ? '#4f7cff' : 'rgba(255,255,255,0.08)'}`, background: theme === th.id ? 'rgba(79,124,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
              <div className="w-12 h-8 rounded-lg border border-white/10 overflow-hidden relative" style={{ background: th.bg }}>
                <div className="absolute top-1.5 left-1.5 w-3 h-1 rounded-sm" style={{ background: th.accent, opacity: 0.8 }} />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 rounded-sm bg-white/10" />
              </div>
              <p className="text-xs font-medium" style={{ color: theme === th.id ? '#4f7cff' : '#8e8e9a' }}>{t(th.labelKey)}</p>
              {theme === th.id && <CheckIcon className="w-3.5 h-3.5 text-[#4f7cff]" />}
            </button>
          ))}
        </div>
      </Block>

      {/* Font size */}
      <Block label={t('adminConfig.apFontTitle')} sublabel={t('adminConfig.apFontSubtitle')}>
        <div className="flex gap-2">
          {sizes.map(s => (
            <button key={s.id} onClick={() => setFontSize(s.id)}
              className="flex-1 py-2 rounded-xl text-sm transition-all"
              style={{ border: `1px solid ${fontSize === s.id ? '#4f7cff' : 'rgba(255,255,255,0.08)'}`, background: fontSize === s.id ? 'rgba(79,124,255,0.1)' : 'rgba(255,255,255,0.03)', color: fontSize === s.id ? '#4f7cff' : '#8e8e9a', fontWeight: fontSize === s.id ? 600 : 400 }}>
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </Block>

      {/* Accessibility toggles */}
      <Block label={t('adminConfig.apAccessTitle')}>
        <div className="space-y-1">
          {[
            { key: 'highContrast', labelKey: 'adminConfig.apHighContrast',   descKey: 'adminConfig.apHighContrastDesc',   value: highContrast, fn: setHighContrast },
            { key: 'reduceMotion', labelKey: 'adminConfig.apReduceMotion',   descKey: 'adminConfig.apReduceMotionDesc',   value: reduceMotion, fn: setReduceMotion },
          ].map(({ key, labelKey, descKey, value, fn }, idx) => (
            <div key={key}>
              {idx > 0 && <Divider />}
              <div className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#e8e8ed]">{t(labelKey)}</p>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">{t(descKey)}</p>
                </div>
                <Toggle checked={value} onChange={() => fn(!value)} />
              </div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SECCIÓN SISTEMA
══════════════════════════════════════════════════════ */
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
    try {
      await api.get('/health')
      setHealthOk(true)
      toast({ message: t('adminConfig.sysHealthOkToast'), type: 'success' })
    } catch {
      setHealthOk(false)
      toast({ message: t('adminConfig.sysHealthFailToast'), type: 'error' })
    } finally { setChecking(false) }
  }

  const clearLocalData = () => {
    const keep = ['hotclick-auth', 'hotclick-ui']
    Object.keys(localStorage).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k) })
    toast({ message: t('adminConfig.sysLocalToast'), type: 'success' })
  }

  const restoreUI = () => {
    setRestoring(true)
    setTimeout(() => {
      localStorage.removeItem('hotclick-ui')
      toast({ message: t('adminConfig.sysRestoreToast'), type: 'success' })
      setRestoring(false)
    }, 700)
  }

  const openResetModal = () => { setResetInput(''); setResetModal(true) }
  const closeResetModal = () => { setResetModal(false); setResetInput('') }

  const handleReset = async () => {
    if (resetInput !== 'ELIMINAR') return
    setResetting(true)
    try {
      await api.post('/admin/reset-datos')
      toast({ message: t('adminConfig.sysResetToast'), type: 'success' })
      closeResetModal()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? t('adminConfig.sysResetError'), type: 'error' })
    } finally { setResetting(false) }
  }

  const forceRefreshCache = async () => {
    setClearing(true)
    try {
      await api.get('/marcas/publicas')
      toast({ message: t('adminConfig.sysCacheToast'), type: 'success' })
    } catch { toast({ message: t('adminConfig.sysCacheError'), type: 'error' }) }
    finally { setClearing(false) }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title={t('adminConfig.sysTitle')} desc={t('adminConfig.sysDesc')} />

      {/* System info */}
      <Block label={t('adminConfig.sysInfoTitle')}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { labelKey: 'adminConfig.sysBackend',  value: 'Spring Boot 3.4', color: '#4f7cff' },
            { labelKey: 'adminConfig.sysFrontend', value: 'React + Vite',    color: '#a78bfa' },
            { labelKey: 'adminConfig.sysDB',       value: 'Supabase (PG)',   color: '#34d399' },
            { labelKey: 'adminConfig.sysDeploy',   value: 'Render',          color: '#fb923c' },
            { labelKey: 'adminConfig.sysPayments', value: 'PayXpert/PayPal', color: '#f472b6' },
            { labelKey: 'adminConfig.sysStorage',  value: 'Supabase S3',     color: '#60a5fa' },
          ].map(({ labelKey, value, color }) => (
            <div key={labelKey} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8e8e9a' }}>{t(labelKey)}</p>
              <p className="text-sm font-semibold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </Block>

      {/* Health check */}
      <Block label={t('adminConfig.sysHealthTitle')} sublabel={t('adminConfig.sysHealthSubtitle')}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: healthOk === null ? '#8e8e9a' : healthOk ? '#22c55e' : '#ef4444' }} />
            <span className="text-sm" style={{ color: healthOk === null ? '#8e8e9a' : healthOk ? '#4ade80' : '#f87171' }}>
              {healthOk === null ? t('adminConfig.sysHealthUnknown') : healthOk ? t('adminConfig.sysHealthOk') : t('adminConfig.sysHealthFail')}
            </span>
          </div>
          <button onClick={checkHealth} disabled={checking}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8ed' }}>
            {checking ? <Spinner size="xs" /> : <RefreshIcon className="w-4 h-4" />}
            {t('adminConfig.sysCheckBtn')}
          </button>
        </div>
      </Block>

      {/* Maintenance tools */}
      <Block label={t('adminConfig.sysMaintenanceTitle')}>
        <div className="space-y-1">
          {[
            { icon: RefreshIcon,   titleKey: 'adminConfig.sysCacheTitle',   descKey: 'adminConfig.sysCacheDesc',   loading: clearing,  action: forceRefreshCache, labelKey: 'adminConfig.sysCacheBtn' },
            { icon: TrashLiteIcon, titleKey: 'adminConfig.sysLocalTitle',   descKey: 'adminConfig.sysLocalDesc',   loading: false,     action: clearLocalData,    labelKey: 'adminConfig.sysLocalBtn' },
            { icon: RestoreIcon,   titleKey: 'adminConfig.sysRestoreTitle', descKey: 'adminConfig.sysRestoreDesc', loading: restoring, action: restoreUI,          labelKey: 'adminConfig.sysRestoreBtn' },
          ].map(({ icon: Icon, titleKey, descKey, loading, action, labelKey }, idx) => (
            <div key={title}>
              {idx > 0 && <Divider />}
              <div className="flex items-center gap-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#8e8e9a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e8ed]">{t(titleKey)}</p>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">{t(descKey)}</p>
                </div>
                <button onClick={action} disabled={loading}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8ed' }}>
                  {loading ? <Spinner size="xs" /> : null}
                  {t(labelKey)}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* Zona peligrosa */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2.5" style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
          <SkullIcon className="w-4 h-4 text-red-500 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-red-400">{t('adminConfig.sysDangerTitle')}</p>
            <p className="text-xs text-[#8e8e9a] mt-0.5">{t('adminConfig.sysDangerDesc')}</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <TrashLiteIcon className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#e8e8ed]">{t('adminConfig.sysResetTitle')}</p>
              <p className="text-xs text-[#8e8e9a] mt-1 leading-relaxed">{t('adminConfig.sysResetDesc')}</p>
            </div>
            <button
              onClick={openResetModal}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              <SkullIcon className="w-3.5 h-3.5" />
              {t('adminConfig.sysResetBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de reset */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#111114', border: '1px solid rgba(239,68,68,0.3)' }}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <SkullIcon className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#e8e8ed]">{t('adminConfig.sysModalTitle')}</h3>
                <p className="text-xs text-[#8e8e9a] mt-1 leading-relaxed">{t('adminConfig.sysModalDesc')}</p>
              </div>
            </div>

            {/* Warning list */}
            <div className="mx-6 mb-4 p-3.5 rounded-xl space-y-2" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
              {[
                t('adminConfig.sysResetItem1'),
                t('adminConfig.sysResetItem2'),
                t('adminConfig.sysResetItem3'),
                t('adminConfig.sysResetItem4'),
                t('adminConfig.sysResetItem5'),
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-red-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {item}
                </div>
              ))}
              <div className="pt-1 border-t border-red-500/15 mt-2">
                <div className="flex items-center gap-2 text-xs text-green-400/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  {t('adminConfig.sysResetKeep')}
                </div>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="px-6 pb-2 space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8e8e9a' }}>
                {t('adminConfig.sysResetInputLabel')}
              </label>
              <StyledInput
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder="ELIMINAR"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && resetInput === 'ELIMINAR') handleReset() }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${resetInput === 'ELIMINAR' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#e8e8ed',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              />
            </div>

            {/* Actions */}
            <div className="px-6 py-5 flex gap-3 justify-end">
              <button
                onClick={closeResetModal}
                disabled={resetting}
                className="px-4 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                {t('adminConfig.sysResetCancel')}
              </button>
              <button
                onClick={handleReset}
                disabled={resetInput !== 'ELIMINAR' || resetting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-35"
                style={{ background: resetInput === 'ELIMINAR' ? '#dc2626' : 'rgba(239,68,68,0.2)', color: resetInput === 'ELIMINAR' ? '#fff' : '#f87171', boxShadow: resetInput === 'ELIMINAR' ? '0 2px 12px rgba(220,38,38,0.35)' : 'none' }}
              >
                {resetting ? <Spinner size="xs" /> : <SkullIcon className="w-4 h-4" />}
                {resetting ? t('adminConfig.sysResetDeleting') : t('adminConfig.sysResetConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External links */}
      <Block label={t('adminConfig.sysExternalTitle')}>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Supabase',  descKey: 'adminConfig.sysSupabaseDesc', color: '#3ecf8e', icon: DBIcon },
            { label: 'Render',    descKey: 'adminConfig.sysRenderDesc',   color: '#46e3b7', icon: ServerIcon },
            { label: 'SendGrid',  descKey: 'adminConfig.sysSendGridDesc', color: '#1a82e2', icon: MailIcon },
            { label: 'PayXpert',  descKey: 'adminConfig.sysPayXpertDesc', color: '#a78bfa', icon: CardIcon },
          ].map(({ label, descKey, color, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all group"
                 style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                 onMouseEnter={e => e.currentTarget.style.borderColor = `${color}40`}
                 onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e8e8ed]">{label}</p>
                <p className="text-[11px] text-[#8e8e9a]">{t(descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </Block>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   HELPERS & PRIMITIVES
══════════════════════════════════════════════════════ */
function SectionHeader({ title, desc }) {
  return (
    <div className="pb-1">
      <h2 className="text-lg font-bold text-[#e8e8ed]" style={{ fontFamily: '"DM Sans",system-ui,sans-serif' }}>{title}</h2>
      {desc && <p className="text-sm text-[#8e8e9a] mt-0.5">{desc}</p>}
    </div>
  )
}

function Block({ label, sublabel, children }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111114', border: '1px solid rgba(255,255,255,0.07)' }}>
      {label && (
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-[13px] font-semibold text-[#e8e8ed]">{label}</p>
          {sublabel && <p className="text-xs text-[#8e8e9a] mt-0.5">{sublabel}</p>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function FormGroup({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">{label}</label>
        {hint && <span className="text-[10px] text-[#8e8e9a]/50">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function StyledInput({ error, ...props }) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all duration-150"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
        color: '#e8e8ed',
        '--tw-ring-color': '#4f7cff',
      }}
      onFocus={e => { e.target.style.borderColor = '#4f7cff'; e.target.style.boxShadow = '0 0 0 3px rgba(79,124,255,0.12)' }}
      onBlur={e => { e.target.style.borderColor = error ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

function PasswordInput({ show, onToggle, error, ...props }) {
  return (
    <div className="relative">
      <StyledInput type={show ? 'text' : 'password'} error={error} {...props} />
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e9a] hover:text-white transition-colors">
        {show ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className="relative shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none"
      style={{ background: checked ? '#4f7cff' : 'rgba(255,255,255,0.1)', boxShadow: checked ? '0 0 12px rgba(79,124,255,0.4)' : 'none' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200"
            style={{ left: checked ? 'calc(100% - 1.375rem)' : '2px' }} />
    </button>
  )
}

function SaveButton({ saving, saved, label }) {
  const { t } = useTranslation()
  const defaultLabel = t('adminConfig.saveBtn')
  return (
    <button type="submit" disabled={saving || saved}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-70"
      style={{
        background: saved ? 'rgba(34,197,94,0.15)' : '#4f7cff',
        border: saved ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
        color: saved ? '#4ade80' : '#fff',
        boxShadow: !saved ? '0 2px 12px rgba(79,124,255,0.25)' : 'none',
      }}>
      {saving ? <Spinner size="xs" /> : saved ? <CheckIcon className="w-4 h-4" /> : null}
      {saved ? t('adminConfig.savedLabel') : (label ?? defaultLabel)}
    </button>
  )
}

function Divider() { return <div className="border-t border-white/5" /> }

function LoadingSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 rounded-xl bg-white/4" style={{ opacity: 1 - i * 0.15 }} />
      ))}
    </div>
  )
}

function passwordStrength(pw, t) {
  if (!pw) return { score: 0, label: '', color: '#8e8e9a' }
  let s = 0
  if (pw.length >= 8)  s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  const labels = [
    t('adminConfig.pwdStrengthWeak'),
    t('adminConfig.pwdStrengthFair'),
    t('adminConfig.pwdStrengthGood'),
    t('adminConfig.pwdStrengthStrong'),
  ]
  const colors = ['#ef4444','#f59e0b','#3b82f6','#22c55e']
  return { score: s, label: labels[s-1] ?? labels[0], color: colors[s-1] ?? '#ef4444' }
}

/* ══════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════ */
const sv = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
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
