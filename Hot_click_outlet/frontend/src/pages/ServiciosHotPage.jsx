import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import useAuthStore from '@/store/authStore'
import { servicioService } from '@/services/servicioService'
import { useQuery } from '@tanstack/react-query'

const ESTADO_STYLES = {
  PENDIENTE:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  EN_BUSQUEDA:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  ENCONTRADO:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  NO_ENCONTRADO:{ color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CANCELADO:    { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

function EstadoBadge({ estado }) {
  const { t } = useTranslation()
  const cfg = ESTADO_STYLES[estado] || ESTADO_STYLES.PENDIENTE
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {t(`serviciosPage.status.${estado}`, { defaultValue: estado })}
    </span>
  )
}

export default function ServiciosHotPage() {
  const { t } = useTranslation()
  const { token, userName } = useAuthStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState('solicitar')
  const [fotos, setFotos] = useState([])         // { file, preview, url }
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const [form, setForm] = useState({
    descripcion: '',
    presupuesto: '',
    nombreContacto: '',
    telefonoContacto: '',
  })

  const { data: misSolicitudes, isLoading: loadingMias, refetch } = useQuery({
    queryKey: ['mis-solicitudes-servicio'],
    queryFn: () => servicioService.misSolicitudes().then(r => r.data),
    enabled: !!token && tab === 'mis-solicitudes',
  })

  const handleFotoChange = async (e) => {
    const files = Array.from(e.target.files).slice(0, 3 - fotos.length)
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const nuevas = await Promise.all(files.map(async (file) => {
        const preview = URL.createObjectURL(file)
        const res = await servicioService.subirFoto(file)
        return { file, preview, url: res.data }
      }))
      setFotos(prev => [...prev, ...nuevas].slice(0, 3))
    } catch {
      setError(t('serviciosPage.uploadErrorFull'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const quitarFoto = (idx) => {
    setFotos(prev => prev.filter((_, i) => i !== idx))
  }

  const handleEnviar = async (e) => {
    e.preventDefault()
    if (!form.descripcion.trim()) { setError(t('serviciosPage.errorDescRequired')); return }
    if (!token) {
      if (!form.nombreContacto.trim()) { setError(t('serviciosPage.errorNameRequired')); return }
      if (!form.telefonoContacto.trim()) { setError(t('serviciosPage.errorPhoneRequired')); return }
    }
    setSending(true)
    setError('')
    try {
      await servicioService.crear({
        ...form,
        fotosUrls: fotos.length ? JSON.stringify(fotos.map(f => f.url)) : null,
      })
      setSuccess(true)
      setForm({ descripcion: '', presupuesto: '', nombreContacto: '', telefonoContacto: '' })
      setFotos([])
    } catch {
      setError(t('serviciosPage.sendErrorFull'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--hc-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(var(--hc-accent-rgb,220,38,38),0.08) 0%, transparent 70%)' }} />
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
            {t('serviciosPage.newService')}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4 leading-tight"
            style={{ fontFamily: "'Barlow', sans-serif", color: 'var(--hc-text)' }}>
            {t('serviciosPage.title')} <span style={{ color: 'var(--hc-accent)' }}>HOT</span>
          </h1>
          <p className="text-lg mb-2" style={{ color: 'var(--hc-muted)' }}>
            {t('serviciosPage.heroSubtitle')} <strong style={{ color: 'var(--hc-text)' }}>{t('serviciosPage.heroSubtitleStrong')}</strong>
          </p>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            {t('serviciosPage.heroDesc')}
          </p>
        </motion.div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { n: '1', icon: '📸', titleKey: 'step1Title', descKey: 'step1Desc' },
            { n: '2', icon: '🔍', titleKey: 'step2Title', descKey: 'step2Desc' },
            { n: '3', icon: '🤝', titleKey: 'step3Title', descKey: 'step3Desc' },
          ].map(step => (
            <motion.div key={step.n}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * Number(step.n), duration: 0.4 }}
              className="p-5 rounded-2xl text-center"
              style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
              <div className="text-3xl mb-3">{step.icon}</div>
              <div className="text-xs font-bold mb-1" style={{ color: 'var(--hc-accent)' }}>{t('serviciosPage.step')} {step.n}</div>
              <div className="font-bold mb-1" style={{ color: 'var(--hc-text)' }}>{t(`serviciosPage.${step.titleKey}`)}</div>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t(`serviciosPage.${step.descKey}`)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <section className="max-w-2xl mx-auto px-4 pb-24">
        {token && (
          <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
            {[
              { key: 'solicitar', label: t('serviciosPage.tabNewRequest') },
              { key: 'mis-solicitudes', label: t('serviciosPage.tabMine') },
            ].map(tab2 => (
              <button key={tab2.key} onClick={() => setTab(tab2.key)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  backgroundColor: tab === tab2.key ? 'var(--hc-accent)' : 'transparent',
                  color: tab === tab2.key ? '#fff' : 'var(--hc-muted)',
                }}>
                {tab2.label}
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        <AnimatePresence mode="wait">
          {tab === 'solicitar' && (
            <motion.div key="form"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {success ? (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}
                  className="text-center py-16 rounded-2xl"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <div className="text-5xl mb-4">🎉</div>
                  <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--hc-text)' }}>
                    {t('serviciosPage.successTitle')}
                  </h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--hc-muted)' }}>
                    {t('serviciosPage.successSub2')}
                  </p>
                  <button onClick={() => { setSuccess(false); setTab(token ? 'mis-solicitudes' : 'solicitar') }}
                    className="px-6 py-2 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                    {token ? t('serviciosPage.viewMine') : t('serviciosPage.newRequestBtn')}
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleEnviar} className="rounded-2xl p-6 space-y-5"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <h2 className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>
                    {t('serviciosPage.formH2')}
                  </h2>

                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                      {t('serviciosPage.descLabelFull')} <span style={{ color: 'var(--hc-accent)' }}>*</span>
                    </label>
                    <textarea rows={4}
                      placeholder={t('serviciosPage.descPhFull')}
                      value={form.descripcion}
                      onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none focus:ring-2"
                      style={{
                        backgroundColor: 'var(--hc-surface-2)',
                        border: '1px solid var(--hc-border)',
                        color: 'var(--hc-text)',
                      }} />
                  </div>

                  {/* Fotos */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                      {t('serviciosPage.photosLabelFull')}
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {fotos.map((f, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden"
                          style={{ border: '1px solid var(--hc-border)' }}>
                          <img src={f.preview} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => quitarFoto(i)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                            ×
                          </button>
                        </div>
                      ))}
                      {fotos.length < 3 && (
                        <button type="button" onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                          className="w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 text-xs transition-all"
                          style={{
                            border: '2px dashed var(--hc-border)',
                            color: 'var(--hc-muted)',
                            backgroundColor: uploading ? 'var(--hc-surface-2)' : 'transparent',
                          }}>
                          {uploading ? (
                            <div className="w-5 h-5 rounded-full border-2 animate-spin"
                              style={{ borderColor: 'var(--hc-muted)', borderTopColor: 'var(--hc-accent)' }} />
                          ) : (
                            <>
                              <span className="text-2xl leading-none">+</span>
                              <span>{t('serviciosPage.photoBtn')}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={handleFotoChange} />
                  </div>

                  {/* Presupuesto */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                      {t('serviciosPage.budgetLabelFull')}
                    </label>
                    <input type="text"
                      placeholder={t('serviciosPage.budgetPhFull')}
                      value={form.presupuesto}
                      onChange={e => setForm(f => ({ ...f, presupuesto: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{
                        backgroundColor: 'var(--hc-surface-2)',
                        border: '1px solid var(--hc-border)',
                        color: 'var(--hc-text)',
                      }} />
                  </div>

                  {/* Datos contacto (solo si no hay sesión) */}
                  {!token && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                          {t('serviciosPage.nameLabel2')} <span style={{ color: 'var(--hc-accent)' }}>*</span>
                        </label>
                        <input type="text" placeholder={t('serviciosPage.namePh')}
                          value={form.nombreContacto}
                          onChange={e => setForm(f => ({ ...f, nombreContacto: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--hc-muted)' }}>
                          {t('serviciosPage.phoneLabel')} <span style={{ color: 'var(--hc-accent)' }}>*</span>
                        </label>
                        <input type="tel" placeholder="8888-8888"
                          value={form.telefonoContacto}
                          onChange={e => setForm(f => ({ ...f, telefonoContacto: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
                      </div>
                    </div>
                  )}

                  {!token && (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-muted)' }}>
                      {t('serviciosPage.loginPrompt')}{' '}
                      <button type="button" onClick={() => navigate('/login')} className="font-semibold underline"
                        style={{ color: 'var(--hc-accent)' }}>
                        {t('serviciosPage.loginLink2')}
                      </button>{' '}{t('serviciosPage.loginSuffix')}
                    </p>
                  )}

                  {error && (
                    <p className="text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-500">{error}</p>
                  )}

                  <button type="submit" disabled={sending || uploading}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                    {sending ? t('serviciosPage.sending') : t('serviciosPage.submit')}
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* Mis solicitudes */}
          {tab === 'mis-solicitudes' && token && (
            <motion.div key="mis"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {loadingMias ? (
                <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
                  <div className="w-8 h-8 rounded-full border-2 animate-spin mx-auto mb-3"
                    style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
                  {t('serviciosPage.loading')}
                </div>
              ) : !misSolicitudes?.length ? (
                <div className="text-center py-16 rounded-2xl"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <div className="text-4xl mb-3">📋</div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--hc-text)' }}>{t('serviciosPage.noReqTitle2')}</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>{t('serviciosPage.noReqSub2')}</p>
                  <button onClick={() => setTab('solicitar')}
                    className="px-5 py-2 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
                    {t('serviciosPage.makeRequest')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {misSolicitudes.map(s => {
                    const fotos = s.fotosUrls ? JSON.parse(s.fotosUrls) : []
                    return (
                      <div key={s.id} className="p-4 rounded-2xl"
                        style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--hc-text)' }}>
                            {s.descripcion}
                          </p>
                          <EstadoBadge estado={s.estado} />
                        </div>
                        {s.presupuesto && (
                          <p className="text-xs mb-2" style={{ color: 'var(--hc-muted)' }}>
                            {t('serviciosPage.budgetShowLabel')} {s.presupuesto}
                          </p>
                        )}
                        {fotos.length > 0 && (
                          <div className="flex gap-2 mb-2">
                            {fotos.map((url, i) => (
                              <img key={i} src={url} alt=""
                                className="w-14 h-14 rounded-lg object-cover"
                                style={{ border: '1px solid var(--hc-border)' }} />
                            ))}
                          </div>
                        )}
                        {s.notasAdmin && (
                          <div className="mt-2 px-3 py-2 rounded-lg text-xs"
                            style={{ backgroundColor: 'var(--hc-surface-2)', color: 'var(--hc-text)' }}>
                            <span className="font-semibold">{t('serviciosPage.hotclickNote')}</span> {s.notasAdmin}
                          </div>
                        )}
                        <p className="text-xs mt-2" style={{ color: 'var(--hc-muted)' }}>
                          {new Date(s.fechaCreacion).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Footer />
    </div>
  )
}
