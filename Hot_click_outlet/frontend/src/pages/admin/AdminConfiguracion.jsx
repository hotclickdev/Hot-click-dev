import { useState, useEffect } from 'react'
import AdminLayout from '@/layouts/AdminLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import Spinner from '@/components/ui/Spinner'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'

const TABS = [
  { id: 'cuenta', label: 'Mi Cuenta', icon: <UserIcon /> },
  { id: 'seguridad', label: 'Seguridad & 2FA', icon: <ShieldIcon /> },
  { id: 'sistema', label: 'Sistema', icon: <CogIcon /> },
]

export default function AdminConfiguracion() {
  const toast = useToast()
  const { userId, userEmail, userName, setUserName, refreshToken } = useAuthStore()
  const [tab, setTab] = useState('cuenta')

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-[#e8e8ed]">Configuración</h1>
          <p className="text-sm text-[#8e8e9a] mt-1">Administrá tu cuenta y las opciones del sistema</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-[#4f7cff] text-white shadow-lg'
                  : 'text-[#8e8e9a] hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="w-4 h-4">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'cuenta'   && <TabCuenta userId={userId} userEmail={userEmail} setUserName={setUserName} toast={toast} />}
        {tab === 'seguridad' && <TabSeguridad refreshToken={refreshToken} toast={toast} />}
        {tab === 'sistema'  && <TabSistema toast={toast} />}
      </div>
    </AdminLayout>
  )
}

/* ─────────────────── TAB CUENTA ─────────────────── */
function TabCuenta({ userId, userEmail, setUserName, toast }) {
  const [form, setForm] = useState({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
      toast({ message: 'Datos actualizados correctamente', type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al guardar', type: 'error' })
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <Card title="Información de la cuenta" subtitle="Actualizá tus datos personales">
      <form onSubmit={handleSave} className="space-y-4">
        {/* Correo (readonly) */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8e8e9a] uppercase tracking-wider">Correo electrónico</label>
          <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/8 text-[#8e8e9a] text-sm font-mono">
            {userEmail}
          </div>
          <p className="text-xs text-[#8e8e9a]/60">El correo no se puede cambiar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} placeholder="Tu nombre" />
          <Input label="Apellido paterno" value={form.apellidoPaterno} onChange={set('apellidoPaterno')} placeholder="Apellido" />
          <Input label="Apellido materno" value={form.apellidoMaterno} onChange={set('apellidoMaterno')} placeholder="Segundo apellido" />
          <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} placeholder="+506 8888-8888" />
        </div>

        <div className="pt-2">
          <Button type="submit" loading={saving}>Guardar cambios</Button>
        </div>
      </form>
    </Card>
  )
}

/* ─────────────────── TAB SEGURIDAD ─────────────────── */
function TabSeguridad({ refreshToken, toast }) {
  return (
    <div className="space-y-5">
      <CambiarContrasena refreshToken={refreshToken} toast={toast} />
      <Gestion2FA toast={toast} />
    </div>
  )
}

function CambiarContrasena({ refreshToken, toast }) {
  const [form, setForm] = useState({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.nuevaContrasena.length < 6) { toast({ message: 'La nueva contraseña debe tener al menos 6 caracteres', type: 'error' }); return }
    if (form.nuevaContrasena !== form.confirmar) { toast({ message: 'Las contraseñas no coinciden', type: 'error' }); return }
    setSaving(true)
    try {
      await api.post('/auth/change-password', {
        contrasenaActual: form.contrasenaActual,
        nuevaContrasena:  form.nuevaContrasena,
        refreshToken:     refreshToken ?? '',
      })
      setForm({ contrasenaActual: '', nuevaContrasena: '', confirmar: '' })
      toast({ message: 'Contraseña actualizada. Otras sesiones han sido cerradas', type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al cambiar contraseña', type: 'error' })
    } finally { setSaving(false) }
  }

  return (
    <Card title="Cambiar contraseña" subtitle="Usá una contraseña segura de al menos 6 caracteres">
      <form onSubmit={handleSave} className="space-y-4">
        <Input label="Contraseña actual" type="password" value={form.contrasenaActual} onChange={set('contrasenaActual')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nueva contraseña" type="password" value={form.nuevaContrasena} onChange={set('nuevaContrasena')} required />
          <Input label="Confirmar nueva contraseña" type="password" value={form.confirmar} onChange={set('confirmar')} required />
        </div>
        <div className="pt-1">
          <Button type="submit" loading={saving}>Actualizar contraseña</Button>
        </div>
      </form>
    </Card>
  )
}

function Gestion2FA({ toast }) {
  const [status, setStatus]       = useState(null)   // null | true | false
  const [loading, setLoading]     = useState(true)
  const [step, setStep]           = useState('idle')  // idle | setup | disable
  const [qrData, setQrData]       = useState(null)    // { secret, qrUri }
  const [code, setCode]           = useState('')
  const [password, setPassword]   = useState('')
  const [working, setWorking]     = useState(false)

  const load2FAStatus = () => {
    setLoading(true)
    api.get('/auth/2fa/status')
      .then(({ data }) => setStatus(data.data?.enabled ?? false))
      .catch(() => setStatus(false))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load2FAStatus() }, [])

  const startSetup = async () => {
    setWorking(true)
    try {
      const { data } = await api.post('/auth/2fa/setup')
      setQrData(data.data)
      setStep('setup')
      setCode('')
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al iniciar configuración', type: 'error' })
    } finally { setWorking(false) }
  }

  const activate = async () => {
    if (!code.trim()) { toast({ message: 'Ingresá el código de 6 dígitos', type: 'error' }); return }
    setWorking(true)
    try {
      await api.post('/auth/2fa/activate', { code })
      setStatus(true)
      setStep('idle')
      setQrData(null)
      setCode('')
      toast({ message: '2FA activado correctamente', type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Código incorrecto', type: 'error' })
    } finally { setWorking(false) }
  }

  const disable = async () => {
    if (!password || !code) { toast({ message: 'Completá la contraseña y el código', type: 'error' }); return }
    setWorking(true)
    try {
      await api.post('/auth/2fa/disable', { contrasena: password, code })
      setStatus(false)
      setStep('idle')
      setPassword('')
      setCode('')
      toast({ message: '2FA desactivado', type: 'success' })
    } catch (err) {
      toast({ message: err.response?.data?.message ?? 'Error al desactivar 2FA', type: 'error' })
    } finally { setWorking(false) }
  }

  const cancel = () => { setStep('idle'); setCode(''); setPassword(''); setQrData(null) }

  return (
    <Card
      title="Autenticación de dos factores (2FA)"
      subtitle="Protegé tu cuenta con una capa extra de seguridad usando Google Authenticator o Authy"
    >
      {loading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="space-y-5">
          {/* Estado actual */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/8">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${status ? 'bg-green-500/15' : 'bg-[#8e8e9a]/10'}`}>
                <ShieldIcon className={status ? 'text-green-400' : 'text-[#8e8e9a]'} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#e8e8ed]">
                  2FA está <span className={status ? 'text-green-400' : 'text-[#8e8e9a]'}>{status ? 'activado' : 'desactivado'}</span>
                </p>
                <p className="text-xs text-[#8e8e9a] mt-0.5">
                  {status ? 'Tu cuenta está protegida con autenticación de dos factores' : 'Activalo para mayor seguridad en tu cuenta'}
                </p>
              </div>
            </div>
            {step === 'idle' && (
              status
                ? <Button variant="secondary" onClick={() => setStep('disable')} className="text-red-400 border-red-500/20 hover:bg-red-500/10">Desactivar</Button>
                : <Button onClick={startSetup} loading={working}>Activar 2FA</Button>
            )}
          </div>

          {/* Setup flow */}
          {step === 'setup' && qrData && (
            <div className="space-y-4 p-4 rounded-xl border border-[#4f7cff]/20 bg-[#4f7cff]/5">
              <p className="text-sm font-semibold text-[#e8e8ed]">Configurar Google Authenticator</p>

              {/* QR Code */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="shrink-0 p-3 bg-white rounded-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData.qrUri)}`}
                    alt="QR 2FA"
                    className="w-44 h-44"
                  />
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-xs text-[#8e8e9a] mb-1">1. Abrí Google Authenticator o Authy</p>
                    <p className="text-xs text-[#8e8e9a] mb-1">2. Escaneá el código QR <span className="text-white font-medium">o ingresá la clave manual:</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <p className="text-xs text-[#8e8e9a] mb-1 uppercase tracking-wider font-medium">Clave secreta</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-[#e8e8ed] font-mono tracking-widest break-all">{qrData.secret}</code>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(qrData.secret); toast({ message: 'Clave copiada', type: 'success' }) }}
                        className="shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#8e8e9a] hover:text-white transition-colors"
                        title="Copiar clave"
                      >
                        <CopyIcon />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-[#8e8e9a]">3. Ingresá el código de 6 dígitos que genera la app:</p>
                </div>
              </div>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input
                    label="Código de verificación (6 dígitos)"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <Button onClick={activate} loading={working} disabled={code.length !== 6}>Activar</Button>
                <Button variant="secondary" onClick={cancel}>Cancelar</Button>
              </div>
            </div>
          )}

          {/* Disable flow */}
          {step === 'disable' && (
            <div className="space-y-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <p className="text-sm font-semibold text-[#e8e8ed]">Desactivar 2FA</p>
              <p className="text-xs text-[#8e8e9a]">Para confirmar, ingresá tu contraseña y el código actual de tu app de autenticación.</p>
              <Input label="Contraseña actual" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Input
                label="Código de autenticación"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
              <div className="flex gap-3">
                <Button onClick={disable} loading={working} className="bg-red-600 hover:bg-red-700 border-red-600">Desactivar 2FA</Button>
                <Button variant="secondary" onClick={cancel}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/* ─────────────────── TAB SISTEMA ─────────────────── */
function TabSistema({ toast }) {
  const [clearing, setClearing] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const clearCache = async () => {
    setClearing(true)
    try {
      await api.get('/marcas/publicas')
      toast({ message: 'Caché de catálogo actualizado', type: 'success' })
    } catch {
      toast({ message: 'Error al actualizar caché', type: 'error' })
    } finally { setClearing(false) }
  }

  const clearLocalData = () => {
    const keysToKeep = ['hotclick-auth']
    Object.keys(localStorage).forEach((key) => {
      if (!keysToKeep.includes(key)) localStorage.removeItem(key)
    })
    toast({ message: 'Datos locales limpiados correctamente', type: 'success' })
  }

  const restoreDefaults = () => {
    setRestoring(true)
    setTimeout(() => {
      localStorage.removeItem('hotclick-ui')
      toast({ message: 'Configuración de interfaz restaurada al valor predeterminado. Recargá la página.', type: 'success' })
      setRestoring(false)
    }, 600)
  }

  return (
    <div className="space-y-5">
      {/* Info del sistema */}
      <Card title="Información del sistema" subtitle="Estado actual de la plataforma HOTCLICK">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Versión', value: 'v1.0' },
            { label: 'Backend', value: 'Spring Boot 3.4' },
            { label: 'Base de datos', value: 'PostgreSQL (Supabase)' },
            { label: 'Frontend', value: 'React + Vite' },
            { label: 'Pasarela de pago', value: 'PayXpert / PayPal' },
            { label: 'Almacenamiento', value: 'Supabase Storage' },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-xl bg-white/3 border border-white/8">
              <p className="text-[10px] uppercase tracking-wider text-[#8e8e9a] mb-1">{label}</p>
              <p className="text-sm font-medium text-[#e8e8ed]">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Herramientas */}
      <Card title="Herramientas de mantenimiento" subtitle="Acciones para mantener el sistema en óptimas condiciones">
        <div className="space-y-3">
          <ToolRow
            icon={<RefreshIcon />}
            title="Actualizar caché del catálogo"
            description="Fuerza la recarga de marcas y productos públicos en caché"
            action={<Button variant="secondary" onClick={clearCache} loading={clearing} className="shrink-0">Actualizar</Button>}
          />
          <ToolRow
            icon={<TrashIcon />}
            title="Limpiar datos locales del navegador"
            description="Elimina caché local, historial de búsqueda y carrito abandonado del navegador"
            action={<Button variant="secondary" onClick={clearLocalData} className="shrink-0">Limpiar</Button>}
          />
          <ToolRow
            icon={<RestoreIcon />}
            title="Restaurar configuración de interfaz"
            description="Vuelve la UI al tema y preferencias por defecto (idioma, tema, tamaño de fuente)"
            action={<Button variant="secondary" onClick={restoreDefaults} loading={restoring} className="shrink-0">Restaurar</Button>}
          />
        </div>
      </Card>

      {/* Links rápidos */}
      <Card title="Acceso rápido" subtitle="Paneles externos de la infraestructura">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Supabase', desc: 'Base de datos y storage', icon: <DBIcon /> },
            { label: 'Render', desc: 'Servidor de producción', icon: <ServerIcon /> },
            { label: 'SendGrid', desc: 'Emails transaccionales', icon: <MailIcon /> },
            { label: 'PayXpert', desc: 'Pasarela de pago', icon: <CardIcon /> },
          ].map(({ label, desc, icon }) => (
            <div key={label} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/3 border border-white/8 hover:border-white/15 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-[#4f7cff]/10 flex items-center justify-center text-[#4f7cff] shrink-0">{icon}</div>
              <div>
                <p className="text-sm font-semibold text-[#e8e8ed]">{label}</p>
                <p className="text-xs text-[#8e8e9a]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ─────────────────── Helpers ─────────────────── */
function Card({ title, subtitle, children }) {
  return (
    <div className="bg-[#111114] border border-white/8 rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#e8e8ed]">{title}</h2>
        {subtitle && <p className="text-xs text-[#8e8e9a] mt-0.5">{subtitle}</p>}
      </div>
      <div className="border-t border-white/5 pt-4">{children}</div>
    </div>
  )
}

function ToolRow({ icon, title, description, action }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/8">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[#8e8e9a] shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#e8e8ed]">{title}</p>
        <p className="text-xs text-[#8e8e9a] mt-0.5">{description}</p>
      </div>
      {action}
    </div>
  )
}

/* ─────────────────── Icons ─────────────────── */
const ic = 'w-4 h-4'
const sv = { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function UserIcon()    { return <svg className={ic} {...sv}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> }
function ShieldIcon()  { return <svg className={ic} {...sv}><path d="M12 2l8 4v5c0 5-3.5 9.7-8 11C7.5 20.7 4 16 4 11V6l8-4z"/></svg> }
function CogIcon()     { return <svg className={ic} {...sv}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> }
function CopyIcon()    { return <svg className="w-3.5 h-3.5" {...sv}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> }
function RefreshIcon() { return <svg className={ic} {...sv}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> }
function TrashIcon()   { return <svg className={ic} {...sv}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> }
function RestoreIcon() { return <svg className={ic} {...sv}><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> }
function DBIcon()      { return <svg className={ic} {...sv}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> }
function ServerIcon()  { return <svg className={ic} {...sv}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> }
function MailIcon()    { return <svg className={ic} {...sv}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> }
function CardIcon()    { return <svg className={ic} {...sv}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> }
