import { useState, useEffect, useRef, useCallback } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'
import useUiStore from '@/store/uiStore'

/* ── Saved notifications prefs key ── */
const NOTIF_KEY = 'hotclick-notif-prefs'
const defaultNotifPrefs = {
  emailPedidos: true,
  emailGuia: true,
  emailFallido: true,
  sonidoNuevoPedido: false,
}

export default function AdminConfiguracion() {
  const toast  = useToast()
  const { userId, userEmail, userName, setUserName, refreshToken } = useAuthStore()
  const [section, setSection]   = useState('perfil')
  const [twoFAOn, setTwoFAOn]   = useState(false)

  const nav = [
    { id: 'perfil',         label: 'Perfil',           icon: UserIcon },
    { id: 'seguridad',      label: 'Seguridad & 2FA',  icon: ShieldIcon,  badge: !twoFAOn ? '!' : null },
    { id: 'notificaciones', label: 'Notificaciones',   icon: BellIcon },
    { id: 'apariencia',     label: 'Apariencia',       icon: PaletteIcon },
    { id: 'sistema',        label: 'Sistema',          icon: CogIcon },
  ]

  return (
    <AdminLayout>
      <div className="max-w-5xl">
        {/* Page header */}
        <div className="mb-6">
          <h1 style={{ fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 700 }}
              className="text-2xl text-[#e8e8ed] tracking-tight">Configuración</h1>
          <p className="text-sm text-[#8e8e9a] mt-0.5">Gestioná tu cuenta, seguridad y preferencias del sistema</p>
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
      .catch(() => toast({ message: 'Error al cargar datos', type: 'error' }))
      .finally(() => setLoading(false))
  }, [userId])

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast({ message: 'El nombre es requerido', type: 'error' }); return }
    setSaving(true)
    try {
      await api.put(`/usuarios/${userId}`, form)
      setUserName(form.nombre)
      setSaved(true)
      toast({ message: 'Perfil actualizado correctamente', type: 'success' })
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSkeleton rows={5} />

  const initials = (form.nombre?.[0] ?? '') + (form.apellidoPaterno?.[0] ?? '')

  return (
    <div className="space-y-5">
      <SectionHeader title="Información personal" desc="Tu nombre e información de contacto visible en el panel" />

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
              <span className="text-[11px] text-[#8e8e9a]">Cuenta activa · Admin</span>
            </div>
          </div>
        </div>
      </Block>

      {/* Form */}
      <Block>
        <form onSubmit={handleSave} className="space-y-5">
          {/* Email readonly */}
          <FormGroup label="Correo electrónico" hint="No se puede cambiar">
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/3 border border-white/8 text-[#8e8e9a] text-sm font-mono">
              <MailIcon className="w-4 h-4 shrink-0 opacity-40" />
              {userEmail}
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#8e8e9a]/60 uppercase tracking-wider">Solo lectura</span>
            </div>
          </FormGroup>

          <Divider />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label="Nombre *">
              <StyledInput value={form.nombre} onChange={set('nombre')} placeholder="Tu nombre" required />
            </FormGroup>
            <FormGroup label="Apellido paterno">
              <StyledInput value={form.apellidoPaterno} onChange={set('apellidoPaterno')} placeholder="Primer apellido" />
            </FormGroup>
            <FormGroup label="Apellido materno">
              <StyledInput value={form.apellidoMaterno} onChange={set('apellidoMaterno')} placeholder="Segundo apellido" />
            </FormGroup>
            <FormGroup label="Teléfono">
              <StyledInput value={form.telefono} onChange={set('telefono')} placeholder="+506 8888-8888" type="tel" />
            </FormGroup>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <SaveButton saving={saving} saved={saved} />
            {saved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />Guardado</span>}
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
  const scoreLabel = ['', 'Media', 'Alta', 'Máxima'][score] ?? 'Media'
  const scoreColor = score >= 2 ? '#22c55e' : '#f59e0b'

  return (
    <div className="space-y-5">
      <SectionHeader title="Seguridad & 2FA" desc="Contraseña y autenticación de dos factores" />

      {/* Security score */}
      <Block>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#e8e8ed]">Puntuación de seguridad</p>
            <p className="text-xs text-[#8e8e9a] mt-0.5">Basada en contraseña + 2FA</p>
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
            <p className="text-xs text-amber-300/90">Activá el 2FA para mejorar la seguridad de tu cuenta</p>
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
  const [form, setForm] = useState({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const strength = passwordStrength(form.nuevaContrasena)

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.nuevaContrasena.length < 6) { toast({ message: 'Mínimo 6 caracteres', type: 'error' }); return }
    if (form.nuevaContrasena !== form.confirmar) { toast({ message: 'Las contraseñas no coinciden', type: 'error' }); return }
    setSaving(true)
    try {
      await api.post('/auth/change-password', {
        contrasenaActual: form.contrasenaActual,
        nuevaContrasena:  form.nuevaContrasena,
        refreshToken:     refreshToken ?? '',
      })
      setForm({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
      setSaved(true)
      toast({ message: 'Contraseña actualizada · Otras sesiones cerradas', type: 'success' })
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al cambiar contraseña', type: 'error' })
    } finally { setSaving(false) }
  }

  return (
    <Block label="Contraseña" sublabel="Cambiá tu contraseña de acceso al panel">
      <form onSubmit={handleSave} className="space-y-4">
        <FormGroup label="Contraseña actual">
          <PasswordInput value={form.contrasenaActual} onChange={set('contrasenaActual')} show={showCurrent} onToggle={() => setShowCurrent(p => !p)} placeholder="••••••••" required />
        </FormGroup>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <FormGroup label="Nueva contraseña">
              <PasswordInput value={form.nuevaContrasena} onChange={set('nuevaContrasena')} show={showNew} onToggle={() => setShowNew(p => !p)} placeholder="Mínimo 6 caracteres" required />
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
          <FormGroup label="Confirmar contraseña">
            <PasswordInput value={form.confirmar} onChange={set('confirmar')} show={showNew} onToggle={() => setShowNew(p => !p)} placeholder="Repetí la contraseña" required
              error={form.confirmar && form.confirmar !== form.nuevaContrasena} />
          </FormGroup>
        </div>

        <div className="flex items-center gap-3">
          <SaveButton saving={saving} saved={saved} label="Actualizar contraseña" />
          {saved && <span className="text-xs text-green-400 flex items-center gap-1"><CheckIcon className="w-3.5 h-3.5" />Actualizada</span>}
        </div>
      </form>
    </Block>
  )
}

function Panel2FA({ enabled, loading, toast, onEnabled, onDisabled }) {
  const [step, setStep]     = useState('idle')   // idle | setup | disable
  const [qrData, setQrData] = useState(null)
  const [code, setCode]     = useState(['','','','','',''])
  const [password, setPassword] = useState('')
  const [working, setWorking]   = useState(false)
  const inputRefs = useRef([])

  const codeStr = code.join('')

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
      toast({ message: err.response?.data?.message ?? 'Error al iniciar configuración', type: 'error' })
    } finally { setWorking(false) }
  }

  const activate = async () => {
    if (codeStr.length !== 6) { toast({ message: 'Ingresá los 6 dígitos', type: 'error' }); return }
    setWorking(true)
    try {
      await api.post('/auth/2fa/activate', { code: codeStr })
      onEnabled()
      setStep('idle')
      setQrData(null)
      resetCode()
      toast({ message: '✓ 2FA activado correctamente', type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Código incorrecto', type: 'error' })
    } finally { setWorking(false) }
  }

  const disable = async () => {
    if (!password || codeStr.length !== 6) { toast({ message: 'Completá la contraseña y el código', type: 'error' }); return }
    setWorking(true)
    try {
      await api.post('/auth/2fa/disable', { contrasena: password, code: codeStr })
      onDisabled()
      setStep('idle')
      setPassword('')
      resetCode()
      toast({ message: '2FA desactivado', type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al desactivar', type: 'error' })
    } finally { setWorking(false) }
  }

  const cancel = () => { setStep('idle'); resetCode(); setPassword(''); setQrData(null) }

  return (
    <Block label="Autenticación de dos factores" sublabel="Protección extra con Google Authenticator o Authy">
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
                  2FA {enabled ? 'activado' : 'desactivado'}
                </p>
                <p className="text-xs text-[#8e8e9a] mt-0.5">
                  {enabled ? 'Cuenta protegida con verificación en dos pasos' : 'Recomendado: activá el 2FA para mayor seguridad'}
                </p>
              </div>
            </div>
            {step === 'idle' && (
              enabled
                ? <button onClick={() => setStep('disable')} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/25 text-red-400 hover:bg-red-500/10 transition-colors">Desactivar</button>
                : <button onClick={startSetup} disabled={working} className="text-xs px-3 py-1.5 rounded-lg bg-[#4f7cff] text-white hover:bg-[#4f7cff]/80 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {working ? <Spinner size="xs" /> : null} Activar 2FA
                  </button>
            )}
          </div>

          {/* Setup flow */}
          {step === 'setup' && qrData && (
            <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(79,124,255,0.06)', border: '1px solid rgba(79,124,255,0.18)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded-full bg-[#4f7cff] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <p className="text-sm font-semibold text-[#e8e8ed]">Escaneá el código QR</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* QR */}
                <div className="shrink-0 p-3 bg-white rounded-2xl shadow-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData.qrUri)}&margin=0`}
                    alt="Código QR 2FA"
                    className="w-40 h-40 block"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-xs text-[#8e8e9a]">Abrí <strong className="text-white">Google Authenticator</strong> o <strong className="text-white">Authy</strong> y escaneá el QR. Si no podés, ingresá la clave manual:</p>

                  {/* Secret key */}
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] uppercase tracking-widest text-[#8e8e9a] mb-1.5">Clave de configuración</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[13px] text-[#e8e8ed] font-mono tracking-widest break-all leading-relaxed flex-1">{qrData.secret}</code>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(qrData.secret); toast({ message: 'Clave copiada', type: 'success' }) }}
                        className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: '#8e8e9a' }}
                      >
                        <CopyIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#4f7cff] text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                    <p className="text-xs text-[#8e8e9a]">Ingresá el código de 6 dígitos que muestra la app:</p>
                  </div>
                </div>
              </div>

              {/* OTP boxes */}
              <div className="flex gap-2 justify-center sm:justify-start" onPaste={handlePaste}>
                {code.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-11 h-12 rounded-xl text-center text-lg font-bold font-mono outline-none transition-all duration-150"
                    style={{
                      background: d ? 'rgba(79,124,255,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${d ? 'rgba(79,124,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
                      color: '#e8e8ed',
                      boxShadow: d ? '0 0 0 3px rgba(79,124,255,0.12)' : 'none',
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={activate}
                  disabled={codeStr.length !== 6 || working}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#4f7cff] text-white transition-all disabled:opacity-40 hover:bg-[#4f7cff]/80"
                >
                  {working ? <Spinner size="xs" /> : <CheckIcon className="w-4 h-4" />}
                  Activar 2FA
                </button>
                <button onClick={cancel} className="px-4 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Disable flow */}
          {step === 'disable' && (
            <div className="rounded-2xl p-4 space-y-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <p className="text-sm font-semibold text-[#e8e8ed]">Confirmar desactivación</p>
              <p className="text-xs text-[#8e8e9a]">Ingresá tu contraseña y el código actual de tu app para desactivar el 2FA.</p>
              <FormGroup label="Contraseña actual">
                <StyledInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" />
              </FormGroup>
              <div>
                <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider block mb-2">Código de autenticación</label>
                <div className="flex gap-2" onPaste={handlePaste}>
                  {code.map((d, i) => (
                    <input key={i} ref={el => inputRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1}
                      value={d} onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                      className="w-10 h-11 rounded-xl text-center text-base font-bold font-mono outline-none transition-all"
                      style={{ background: d ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${d ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.12)'}`, color: '#e8e8ed' }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2.5">
                <button onClick={disable} disabled={working || !password || codeStr.length !== 6}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-40">
                  {working ? <Spinner size="xs" /> : null} Desactivar 2FA
                </button>
                <button onClick={cancel} className="px-4 py-2 rounded-xl text-sm text-[#8e8e9a] hover:text-white hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Block>
  )
}

/* ══════════════════════════════════════════════════════
   SECCIÓN NOTIFICACIONES
══════════════════════════════════════════════════════ */
function SeccionNotificaciones({ toast }) {
  const [prefs, setPrefs] = useState(() => {
    try { return { ...defaultNotifPrefs, ...JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}') } }
    catch { return defaultNotifPrefs }
  })

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next))
    toast({ message: 'Preferencias guardadas', type: 'success' })
  }

  const items = [
    { key: 'emailPedidos',      icon: ShoppingIcon, title: 'Email: nuevo pedido',         desc: 'Recibí un email cada vez que se crea un pedido nuevo' },
    { key: 'emailGuia',         icon: TruckIcon,    title: 'Email: guía asignada',         desc: 'Notificación al cliente cuando se asigna una guía de Correos CR' },
    { key: 'emailFallido',      icon: AlertIcon,    title: 'Email: pago fallido',          desc: 'Alerta cuando un pago no se completa correctamente' },
    { key: 'sonidoNuevoPedido', icon: BellIcon,     title: 'Sonido: nuevo pedido',         desc: 'Reproducir sonido en el navegador cuando llega un pedido' },
  ]

  return (
    <div className="space-y-5">
      <SectionHeader title="Notificaciones" desc="Configurá qué alertas querés recibir del sistema" />
      <Block>
        <div className="space-y-1">
          {items.map(({ key, icon: Icon, title, desc }, idx) => (
            <div key={key}>
              {idx > 0 && <Divider />}
              <div className="flex items-center gap-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#8e8e9a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e8ed]">{title}</p>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">{desc}</p>
                </div>
                <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block label="WhatsApp de negocio" sublabel="Número para el botón de contacto rápido en el panel">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/3 border border-white/8 text-[#8e8e9a] text-sm font-mono">
              <span className="text-green-400 text-base">📱</span>
              +506 8974-5370
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/5 uppercase tracking-wider">Andrés Zúñiga</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#8e8e9a]/60 mt-2">Configurado en CLAUDE.md · Contactar al desarrollador para cambiarlo</p>
      </Block>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   SECCIÓN APARIENCIA
══════════════════════════════════════════════════════ */
function SeccionApariencia() {
  const { theme, setTheme, fontSize, setFontSize, highContrast, setHighContrast, reduceMotion, setReduceMotion } = useUiStore()

  const themes = [
    { id: 'dark',  label: 'Oscuro', bg: '#0a0a0d', accent: '#4f7cff' },
    { id: 'light', label: 'Claro',  bg: '#f5f5f5', accent: '#4f7cff' },
  ]

  const sizes = [
    { id: 'base', label: 'Normal' },
    { id: 'lg',   label: 'Grande' },
    { id: 'xl',   label: 'Extra grande' },
  ]

  return (
    <div className="space-y-5">
      <SectionHeader title="Apariencia" desc="Personalizá el aspecto visual del panel de administración" />

      {/* Theme */}
      <Block label="Tema de color" sublabel="Elegí entre el modo oscuro o claro">
        <div className="flex gap-3">
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
              style={{ border: `1px solid ${theme === t.id ? '#4f7cff' : 'rgba(255,255,255,0.08)'}`, background: theme === t.id ? 'rgba(79,124,255,0.08)' : 'rgba(255,255,255,0.03)' }}>
              <div className="w-12 h-8 rounded-lg border border-white/10 overflow-hidden relative" style={{ background: t.bg }}>
                <div className="absolute top-1.5 left-1.5 w-3 h-1 rounded-sm" style={{ background: t.accent, opacity: 0.8 }} />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 h-1 rounded-sm bg-white/10" />
              </div>
              <p className="text-xs font-medium" style={{ color: theme === t.id ? '#4f7cff' : '#8e8e9a' }}>{t.label}</p>
              {theme === t.id && <CheckIcon className="w-3.5 h-3.5 text-[#4f7cff]" />}
            </button>
          ))}
        </div>
      </Block>

      {/* Font size */}
      <Block label="Tamaño de texto" sublabel="Ajustá el tamaño del texto en el panel">
        <div className="flex gap-2">
          {sizes.map(s => (
            <button key={s.id} onClick={() => setFontSize(s.id)}
              className="flex-1 py-2 rounded-xl text-sm transition-all"
              style={{ border: `1px solid ${fontSize === s.id ? '#4f7cff' : 'rgba(255,255,255,0.08)'}`, background: fontSize === s.id ? 'rgba(79,124,255,0.1)' : 'rgba(255,255,255,0.03)', color: fontSize === s.id ? '#4f7cff' : '#8e8e9a', fontWeight: fontSize === s.id ? 600 : 400 }}>
              {s.label}
            </button>
          ))}
        </div>
      </Block>

      {/* Accessibility toggles */}
      <Block label="Accesibilidad">
        <div className="space-y-1">
          {[
            { key: 'highContrast', label: 'Alto contraste', desc: 'Aumenta el contraste de colores para mejor legibilidad', value: highContrast, fn: setHighContrast },
            { key: 'reduceMotion', label: 'Reducir animaciones', desc: 'Desactivá las transiciones y efectos de movimiento', value: reduceMotion, fn: setReduceMotion },
          ].map(({ key, label, desc, value, fn }, idx) => (
            <div key={key}>
              {idx > 0 && <Divider />}
              <div className="flex items-center gap-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#e8e8ed]">{label}</p>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">{desc}</p>
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
      toast({ message: '✓ Servicio en línea y operativo', type: 'success' })
    } catch {
      setHealthOk(false)
      toast({ message: 'El servidor no respondió correctamente', type: 'error' })
    } finally { setChecking(false) }
  }

  const clearLocalData = () => {
    const keep = ['hotclick-auth', 'hotclick-ui']
    Object.keys(localStorage).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k) })
    toast({ message: 'Datos locales limpiados', type: 'success' })
  }

  const restoreUI = () => {
    setRestoring(true)
    setTimeout(() => {
      localStorage.removeItem('hotclick-ui')
      toast({ message: 'Interfaz restaurada · Recargá la página para ver los cambios', type: 'success' })
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
      toast({ message: 'Base de datos restablecida. Todos los datos fueron eliminados.', type: 'success' })
      closeResetModal()
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al restablecer datos', type: 'error' })
    } finally { setResetting(false) }
  }

  const forceRefreshCache = async () => {
    setClearing(true)
    try {
      await api.get('/marcas/publicas')
      toast({ message: 'Caché del catálogo actualizado', type: 'success' })
    } catch { toast({ message: 'Error al actualizar caché', type: 'error' }) }
    finally { setClearing(false) }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Sistema" desc="Estado del servidor y herramientas de mantenimiento" />

      {/* System info */}
      <Block label="Información de la plataforma">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Backend',      value: 'Spring Boot 3.4', color: '#4f7cff' },
            { label: 'Frontend',     value: 'React + Vite',    color: '#a78bfa' },
            { label: 'Base de datos',value: 'Supabase (PG)',   color: '#34d399' },
            { label: 'Deploy',       value: 'Render',          color: '#fb923c' },
            { label: 'Pagos',        value: 'PayXpert/PayPal', color: '#f472b6' },
            { label: 'Storage',      value: 'Supabase S3',     color: '#60a5fa' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8e8e9a' }}>{label}</p>
              <p className="text-sm font-semibold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </Block>

      {/* Health check */}
      <Block label="Estado del servidor" sublabel="Verificá que el backend esté respondiendo correctamente">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: healthOk === null ? '#8e8e9a' : healthOk ? '#22c55e' : '#ef4444' }} />
            <span className="text-sm" style={{ color: healthOk === null ? '#8e8e9a' : healthOk ? '#4ade80' : '#f87171' }}>
              {healthOk === null ? 'Sin verificar' : healthOk ? 'En línea y operativo' : 'Sin respuesta'}
            </span>
          </div>
          <button onClick={checkHealth} disabled={checking}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8ed' }}>
            {checking ? <Spinner size="xs" /> : <RefreshIcon className="w-4 h-4" />}
            Verificar
          </button>
        </div>
      </Block>

      {/* Maintenance tools */}
      <Block label="Herramientas de mantenimiento">
        <div className="space-y-1">
          {[
            { icon: RefreshIcon, title: 'Actualizar caché del catálogo', desc: 'Fuerza la recarga de marcas y productos en caché', loading: clearing, action: forceRefreshCache, label: 'Actualizar' },
            { icon: TrashLiteIcon, title: 'Limpiar datos locales',       desc: 'Elimina carrito, historial y datos temporales del navegador', loading: false, action: clearLocalData, label: 'Limpiar' },
            { icon: RestoreIcon, title: 'Restaurar interfaz',            desc: 'Vuelve la UI al estado por defecto (tema, fuente, idioma)', loading: restoring, action: restoreUI, label: 'Restaurar' },
          ].map(({ icon: Icon, title, desc, loading, action, label }, idx) => (
            <div key={title}>
              {idx > 0 && <Divider />}
              <div className="flex items-center gap-4 py-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-[#8e8e9a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#e8e8ed]">{title}</p>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">{desc}</p>
                </div>
                <button onClick={action} disabled={loading}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8e8ed' }}>
                  {loading ? <Spinner size="xs" /> : null}
                  {label}
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
            <p className="text-[13px] font-semibold text-red-400">Zona peligrosa</p>
            <p className="text-xs text-[#8e8e9a] mt-0.5">Acciones irreversibles sobre los datos del sistema</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(239,68,68,0.12)' }}>
              <TrashLiteIcon className="w-4 h-4 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#e8e8ed]">Restablecer todos los datos</p>
              <p className="text-xs text-[#8e8e9a] mt-1 leading-relaxed">
                Elimina <strong className="text-[#e8e8ed]">permanentemente</strong> todos los pedidos, productos, marcas, categorías, pagos y registros de negocio.
                La estructura de la base de datos se conserva. <strong className="text-red-400">Esta acción no se puede deshacer.</strong>
              </p>
            </div>
            <button
              onClick={openResetModal}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              <SkullIcon className="w-3.5 h-3.5" />
              Restablecer
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
                <h3 className="text-base font-bold text-[#e8e8ed]">¿Restablecer todos los datos?</h3>
                <p className="text-xs text-[#8e8e9a] mt-1 leading-relaxed">
                  Esta acción eliminará permanentemente todos los datos de negocio. <strong className="text-red-400">No hay forma de recuperarlos.</strong>
                </p>
              </div>
            </div>

            {/* Warning list */}
            <div className="mx-6 mb-4 p-3.5 rounded-xl space-y-2" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
              {[
                'Todos los pedidos y pagos',
                'Todos los productos, marcas y categorías',
                'Carritos, cotizaciones y facturas',
                'Historial de inventario y métricas',
                'Publicaciones, testimonios y premios',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-red-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {item}
                </div>
              ))}
              <div className="pt-1 border-t border-red-500/15 mt-2">
                <div className="flex items-center gap-2 text-xs text-green-400/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  Se conservan usuarios, roles y estructura de tablas
                </div>
              </div>
            </div>

            {/* Confirmation input */}
            <div className="px-6 pb-2 space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider" style={{ color: '#8e8e9a' }}>
                Escribí <span className="font-bold text-red-400">ELIMINAR</span> para confirmar
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
                Cancelar
              </button>
              <button
                onClick={handleReset}
                disabled={resetInput !== 'ELIMINAR' || resetting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-35"
                style={{ background: resetInput === 'ELIMINAR' ? '#dc2626' : 'rgba(239,68,68,0.2)', color: resetInput === 'ELIMINAR' ? '#fff' : '#f87171', boxShadow: resetInput === 'ELIMINAR' ? '0 2px 12px rgba(220,38,38,0.35)' : 'none' }}
              >
                {resetting ? <Spinner size="xs" /> : <SkullIcon className="w-4 h-4" />}
                {resetting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External links */}
      <Block label="Paneles externos">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Supabase',  desc: 'DB & Storage',        color: '#3ecf8e', icon: DBIcon },
            { label: 'Render',    desc: 'Servidor prod',       color: '#46e3b7', icon: ServerIcon },
            { label: 'SendGrid',  desc: 'Email transaccional', color: '#1a82e2', icon: MailIcon },
            { label: 'PayXpert',  desc: 'Pasarela de pagos',   color: '#a78bfa', icon: CardIcon },
          ].map(({ label, desc, color, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all group"
                 style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                 onMouseEnter={e => e.currentTarget.style.borderColor = `${color}40`}
                 onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#e8e8ed]">{label}</p>
                <p className="text-[11px] text-[#8e8e9a]">{desc}</p>
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

function SaveButton({ saving, saved, label = 'Guardar cambios' }) {
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
      {saved ? 'Guardado' : label}
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

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#8e8e9a' }
  let s = 0
  if (pw.length >= 8)  s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^a-zA-Z0-9]/.test(pw)) s++
  const labels = ['Muy débil','Débil','Moderada','Fuerte']
  const colors = ['#ef4444','#f59e0b','#3b82f6','#22c55e']
  return { score: s, label: labels[s-1] ?? 'Muy débil', color: colors[s-1] ?? '#ef4444' }
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
