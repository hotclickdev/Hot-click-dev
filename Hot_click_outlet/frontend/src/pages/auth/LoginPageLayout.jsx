import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Modal from '@/components/ui/Modal'
import ForgotPasswordModal from './ForgotPasswordModal'
import { A } from './authUi'
import LoginHeader from './LoginHeader'
import CartModal from './CartModal'

/**
 * Marco visual de login: fondo, header, badge, footer y modales.
 */
export default function LoginPageLayout({ children, flow }) {
  const {
    showCartRecovery, recoveryCart, addItem, setShowCartRecovery,
    navigate, recoveryDest, showAdminModal, t, setShowAdminModal,
    showForgot, setShowForgot,
  } = flow

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hc-bg)' }}>

      {/* ── Fondo ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 55% at 75% 30%, color-mix(in srgb, var(--hc-accent) 11%, transparent), transparent 65%)` }} />
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 45% 50% at 15% 75%, color-mix(in srgb, var(--hc-accent) 7%, transparent), transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.3] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px, transparent 1px), linear-gradient(90deg, var(--hc-border) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        <span className="font-black uppercase tracking-[-0.02em] whitespace-nowrap leading-none"
          style={{ fontSize: '22vw', color: 'color-mix(in srgb, var(--hc-text) 3.5%, transparent)', transform: 'rotate(-4deg)' }}>
          ACCESO
        </span>
      </div>

      <LoginHeader />

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[430px]">

          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            className="flex items-center gap-3 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: A.bg, border: `1px solid ${A.ring}`, color: A.color, letterSpacing: '0.06em' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: A.color }}></span>
              <span>COSTA RICA · E-COMMERCE</span>
            </div>
            <div className="h-px flex-1 max-w-[60px]" style={{ background: `linear-gradient(90deg, ${A.ring}, transparent)` }} />
          </motion.div>

          {children}
        </div>
      </main>

      <footer className="relative z-10 text-center py-4 text-xs border-t"
        style={{ borderColor: 'var(--hc-border)', color: 'var(--hc-muted)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(8px)' }}>
        © {new Date().getFullYear()} HotClick · Costa Rica ·{' '}
        <Link to="/informacion" style={{ color: A.color }}>Términos</Link>
      </footer>

      <CartModal
        open={showCartRecovery}
        cart={recoveryCart}
        addItem={addItem}
        onClose={() => setShowCartRecovery(false)}
        onDone={() => navigate(recoveryDest, { replace: true })}
      />

      <Modal open={showAdminModal} title={t('login.adminModal')}>
        <div className="space-y-3">
          <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>{t('login.adminModalSub')}</p>
          {[
            { icon: '⚙', label: t('login.enterAdmin'), sub: t('login.enterAdminSub'), dest: '/admin' },
            { icon: '🛍', label: t('login.enterClient'), sub: t('login.enterClientSub'), dest: '/' },
          ].map(({ icon, label, sub, dest }) => (
            <button type="button" key={dest} onClick={() => { setShowAdminModal(false); navigate(dest) }}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:bg-[color-mix(in_srgb,var(--hc-accent)_5%,transparent)]"
              style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--hc-surface-3)', fontSize: '1.1rem' }}>{icon}</div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{label}</div>
                <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} />
    </div>
  )
}
