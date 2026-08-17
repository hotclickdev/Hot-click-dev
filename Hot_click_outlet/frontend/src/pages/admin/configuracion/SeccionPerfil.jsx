import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PhoneField from '@/components/ui/PhoneField'
import { authService } from '@/services/authService'
import { adminService } from '@/services/orderService'
import useAuthStore from '@/store/authStore'
import SeccionNotificaciones from './SeccionNotificaciones'
import {
  F, Block, FormGroup, StyledInput, SaveButton, LoadingSkeleton, SectionHeader, MailIcon, CheckIcon,
} from './configUi'

export default function SeccionPerfil({ userId, userEmail, userName, setUserName, toast }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ nombre: '', apellidoPaterno: '', apellidoMaterno: '', telefono: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const { userRole, login: storeLogin } = useAuthStore()
  const navigate = useNavigate()
  const isEmprendedor = userRole === 'EMPRENDEDOR'
  const [showNuevoNegocio, setShowNuevoNegocio]   = useState(false)
  const [negocioNombre,    setNegocioNombre]       = useState('')
  const [negocioCorreo,    setNegocioCorreo]       = useState('')
  const [negocioTelefono,  setNegocioTelefono]     = useState('')
  const [savingNegocio,    setSavingNegocio]       = useState(false)

  useEffect(() => {
    if (!userId) return
    adminService.getUsuario(userId)
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
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps -- montaje por userId

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleCrearNegocio = async (e) => {
    e.preventDefault()
    if (!negocioNombre.trim()) return
    if (!negocioCorreo.trim()) { toast({ message: 'El correo oficial del negocio es requerido', type: 'error' }); return }
    setSavingNegocio(true)
    try {
      const { data } = await authService.nuevoNegocio({
        nombreEmpresa:   negocioNombre.trim(),
        correoEmpresa:   negocioCorreo.trim().toLowerCase(),
        telefonoEmpresa: negocioTelefono.trim() || undefined,
      })
      const authData = data?.data ?? data
      storeLogin(authData)
      toast({ message: '¡Negocio creado! Ahora estás trabajando en el nuevo negocio.', type: 'success' })
      setShowNuevoNegocio(false)
      setNegocioNombre('')
      setNegocioCorreo('')
      setNegocioTelefono('')
      navigate('/admin')
    } catch (err) {
      toast({ message: err?.response?.data?.message ?? 'Error al crear el negocio', type: 'error' })
    } finally { setSavingNegocio(false) }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { toast({ message: t('adminConfig.perfilErrorName'), type: 'error' }); return }
    setSaving(true)
    try {
      await adminService.updateUsuario(userId, form)
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
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--hc-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: F.display, boxShadow: '0 4px 20px rgba(23,71,168,0.35)' }}>
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

      {/* Crear otro negocio — solo EMPRENDEDOR */}
      {isEmprendedor && (
        <Block>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.display, margin: 0 }}>Crear otro negocio</p>
              <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', fontFamily: F.body }}>
                Agregá un segundo negocio a tu cuenta. Podés alternar entre ambos al hacer login.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNuevoNegocio(v => !v)}
              style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, fontFamily: F.body, background: 'var(--hc-accent)', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + Crear negocio
            </button>
          </div>

          {showNuevoNegocio && (
            <form onSubmit={handleCrearNegocio} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  value={negocioNombre}
                  onChange={e => setNegocioNombre(e.target.value)}
                  placeholder="Nombre del negocio *"
                  required
                  style={{ flex: 1, minWidth: '180px', padding: '9px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)', fontSize: '13px', fontFamily: F.body, outline: 'none' }}
                />
                <input
                  type="email"
                  value={negocioCorreo}
                  onChange={e => setNegocioCorreo(e.target.value)}
                  placeholder="Correo oficial del negocio *"
                  required
                  style={{ flex: 1, minWidth: '200px', padding: '9px 14px', borderRadius: '10px', background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)', fontSize: '13px', fontFamily: F.body, outline: 'none' }}
                />
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <PhoneField
                    value={negocioTelefono}
                    onChange={setNegocioTelefono}
                    hint="Opcional"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={savingNegocio || !negocioNombre.trim() || !negocioCorreo.trim()}
                  style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, fontFamily: F.body, background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', opacity: savingNegocio || !negocioNombre.trim() || !negocioCorreo.trim() ? 0.5 : 1 }}
                >
                  {savingNegocio ? 'Creando…' : 'Confirmar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNuevoNegocio(false); setNegocioNombre(''); setNegocioCorreo(''); setNegocioTelefono('') }}
                  style={{ padding: '9px 14px', borderRadius: '10px', fontSize: '13px', fontFamily: F.body, background: 'transparent', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </Block>
      )}

      {/* Notificaciones fusionadas acá para EMPRENDEDOR — el mockup aprobado
          (Front para cliente EPN/) no tiene una pestaña propia para esto. */}
      {isEmprendedor && <SeccionNotificaciones toast={toast} soloVentas />}
    </div>
  )
}
