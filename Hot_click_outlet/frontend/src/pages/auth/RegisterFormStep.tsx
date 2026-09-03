import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'
import PhoneField from '@/components/ui/PhoneField'
import Input from '@/components/ui/Input'
import CartModal from './CartModal'
import EmprendimientoCloud from './EmprendimientoCloud'
import EmprendimientoForm from './EmprendimientoForm'
import RegisterHeader from './RegisterHeader'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { TFunction } from 'i18next'
import { useState, type Dispatch, type FormEvent, type SetStateAction, type ChangeEvent } from 'react'
import type { RegistroCompradorForm } from './useRegisterFlow'
import type { CarritoRecuperable } from './CartModal'
import type { Producto } from '@/types/producto'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const BUYER = {
  color: 'var(--hc-accent)',
  glow:  'color-mix(in srgb, var(--hc-accent) 22%, transparent)',
  bg:    'color-mix(in srgb, var(--hc-accent) 8%, transparent)',
  ring:  'color-mix(in srgb, var(--hc-accent) 32%, transparent)',
}

/**
 * Formulario de registro (comprador) y modo emprendedor.
 */
export default function RegisterFormStep({
  t, modo, form, setForm, error, loading, actualizarCampo,
  onSubmit, onVolver,
  showCartRecovery, recoveryCart, addItem, onCloseCart, onDoneCart,
}: {
  t: TFunction
  modo: string
  form: RegistroCompradorForm
  setForm: Dispatch<SetStateAction<RegistroCompradorForm>>
  error: string
  loading: boolean
  actualizarCampo: (field: keyof RegistroCompradorForm) => (e: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: FormEvent) => void
  onVolver: () => void
  showCartRecovery: boolean
  recoveryCart: CarritoRecuperable | null
  addItem: (product: Producto, qty?: number) => void
  onCloseCart: () => void
  onDoneCart: () => void
}) {
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hc-bg)' }}>

      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 45% at 80% 20%, color-mix(in srgb, var(--hc-accent) 10%, transparent), transparent 65%)` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 35% 40% at 5% 80%, rgba(245,158,11,0.08), transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.35] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
          style={{ fontSize: '18vw', color: 'color-mix(in srgb, var(--hc-text) 4%, transparent)', transform: 'rotate(-3deg)' }}>
          REGISTRO
        </span>
      </div>

      <RegisterHeader />

      {/* Contenido */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">

            {/* ── MODO COMPRADOR ── */}
            {modo === 'comprador' && (
              <motion.div key="comprador"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">

                {/* Columna izquierda */}
                <div>
                  <div className="flex flex-wrap gap-2 mb-5">
                    <span
                      className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold min-h-[44px]"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--hc-primary) 12%, transparent)', color: 'var(--hc-text)', border: '1px solid var(--hc-border)' }}
                    >
                      {t('register.quieroComprar')}
                    </span>
                    <Link
                      to="/registro-empresa"
                      className="inline-flex items-center px-3 py-2 rounded-xl text-sm font-semibold min-h-[44px]"
                      style={{ color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
                    >
                      {t('register.quieroVender')}
                    </Link>
                  </div>
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 mb-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                      style={{ background: BUYER.bg, border: `1px solid ${BUYER.ring}`, color: BUYER.color, letterSpacing: '0.06em' }}>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BUYER.color }}></span>
                      <span>Creá tu cuenta gratis</span>
                    </div>
                    <div className="h-px flex-1 max-w-[60px]" style={{ background: `linear-gradient(90deg, ${BUYER.ring}, transparent)` }} />
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="mb-6">
                    <h1 className="font-black leading-[1.0] tracking-tight" style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)', color: 'var(--hc-text)' }}>
                      {t('register.title')}
                    </h1>
                    <h1 className="font-black leading-[1.0] tracking-tight"
                      style={{ fontSize: 'clamp(2.2rem, 5vw, 3rem)',
                        background: `linear-gradient(120deg, ${BUYER.color} 0%, color-mix(in srgb, ${BUYER.color} 65%, var(--hc-blue-300)) 100%)`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      en HotClick
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-5 h-[2px] rounded-full" style={{ background: BUYER.color }} />
                      <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>{t('register.subtitle')}</p>
                    </div>
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 4px 32px var(--hc-shadow)' }}>
                    <div className="h-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${BUYER.color}, transparent)` }} />
                    <div className="p-5 sm:p-7">
                      <form onSubmit={onSubmit} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <Input label={`${t('register.name')} *`} value={form.nombre} onChange={actualizarCampo('nombre')} required placeholder="Juan" maxLength={100} />
                          <Input label={`${t('register.lastName')} *`} value={form.apellidoPaterno} onChange={actualizarCampo('apellidoPaterno')} required placeholder="Pérez" maxLength={100} />
                        </div>
                        <Input label={t('register.motherLastName')} value={form.apellidoMaterno} onChange={actualizarCampo('apellidoMaterno')} placeholder={t('common.optional')} maxLength={100} />
                        <Input label={`${t('register.email')} *`} type="email" value={form.correo} onChange={actualizarCampo('correo')} required placeholder="tu@email.com" maxLength={150} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="hc-input-label">{t('register.phone')}</label>
                            <PhoneField value={form.telefono} onChange={(val) => setForm(f => ({ ...f, telefono: val }))} required />
                          </div>
                          <Input label={`${t('register.identification')} *`} value={form.identificacion} onChange={actualizarCampo('identificacion')} required placeholder="1-2345-6789" maxLength={20} />
                        </div>
                        <Input label={`${t('register.password')} *`} type="password"
                          value={form.contrasenaHash} onChange={actualizarCampo('contrasenaHash')}
                          required minLength={8} maxLength={128} placeholder="Mínimo 8 caracteres" hint="Mínimo 8 caracteres" />
                        {error && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            className="text-sm rounded-xl px-3 py-2.5"
                            style={{ color: 'var(--hc-danger)', background: 'color-mix(in srgb, var(--hc-danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 20%, transparent)' }}>
                            {error}
                          </motion.div>
                        )}
                        <label
                          className="flex items-start gap-2.5 cursor-pointer rounded-xl p-3"
                          style={{
                            border: `1px solid ${aceptaTerminos ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                            background: aceptaTerminos ? 'color-mix(in srgb, var(--hc-accent) 5%, transparent)' : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            required
                            checked={aceptaTerminos}
                            onChange={(e) => setAceptaTerminos(e.target.checked)}
                            className="mt-0.5 shrink-0"
                            style={{ accentColor: 'var(--hc-accent)', width: 15, height: 15 }}
                          />
                          <span className="text-xs leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
                            {t('register.terms')}{' '}
                            <Link to="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: BUYER.color }}>
                              {t('register.termsLink')}
                            </Link>
                            {' '}{t('register.termsAnd')}{' '}
                            <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: BUYER.color }}>
                              {t('register.privacyLink')}
                            </Link>.
                          </span>
                        </label>
                        <button type="submit" disabled={loading || !aceptaTerminos}
                          className="group inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-bold text-sm text-white w-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
                          style={{ background: BUYER.color, boxShadow: `0 0 32px ${BUYER.ring}` }}>
                          {loading ? 'Enviando código…' : (
                            <TextoFlecha iconClassName="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1">
                              {t('register.sendCode')}
                            </TextoFlecha>
                          )}
                        </button>
                      </form>
                      {CLERK_ENABLED && <SocialLoginButtons mode="signUp" />}
                      <p className="text-center text-sm mt-4" style={{ color: 'var(--hc-muted)' }}>
                        {t('register.alreadyAccount')}{' '}
                        <Link to="/login" className="font-semibold" style={{ color: BUYER.color }}>{t('register.login')}</Link>
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Columna derecha — cloud */}
                <div>
                  <EmprendimientoCloud />
                </div>
              </motion.div>
            )}

            {/* ── MODO EMPRENDEDOR ── */}
            {modo === 'emprendedor' && (
              <motion.div key="emprendedor"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}
                className="max-w-[460px] mx-auto">
                <EmprendimientoForm onVolver={onVolver} />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <CartModal open={showCartRecovery} cart={recoveryCart} addItem={addItem}
        onClose={onCloseCart} onDone={onDoneCart} />
    </div>
  )
}
