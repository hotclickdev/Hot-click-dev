import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Modal from '@/components/ui/Modal'
import TrustGlyph from '@/components/ui/TrustGlyph'
import CartModal from './CartModal'
import type { ReactNode } from 'react'
import type { LoginFlow } from './useLoginFlow'

const CODIGO_VACIO = ['', '', '', '', '', '']

/**
 * Marco del login: Figma `28:1143` ("Tu cuenta") y `44:1660` ("Verificación"). Barra interna con flecha atrás,
 * sin barra inferior ni pie en móvil; en escritorio, header mínimo y la misma columna centrada.
 * Conserva el modal de recuperación de carrito y el selector de modo de administrador.
 */
export default function LoginPageLayout({ children, flow }: { children: ReactNode; flow: LoginFlow }) {
  const { t } = useTranslation()
  const {
    step, setStep, setCode2FA, setError, setUseRecovery, twoFaMethods,
    showCartRecovery, recoveryCart, addItem, setShowCartRecovery,
    navigate, recoveryDest, showAdminModal, setShowAdminModal,
  } = flow

  const enVerificacion = step !== 'login'
  /** Dentro de la verificación la flecha vuelve al paso anterior (igual que el botón "Volver" de cada paso). */
  const volverDePaso = () => {
    setCode2FA([...CODIGO_VACIO])
    setError('')
    setUseRecovery(false)
    setStep(step === 'email-otp' && twoFaMethods.length > 1 ? 'picker' : 'login')
  }

  return (
    <MainLayout
      variante="interna"
      titulo={enVerificacion ? t('login.barraVerificacion') : t('login.barraCuenta')}
      atras={enVerificacion ? volverDePaso : undefined}
      encabezadoEscritorio="minimo"
    >
      <div className="mx-auto w-full max-w-[420px] bg-hc-n-0 flex flex-col pb-0 max-lg:min-h-[calc(100dvh-51px)] lg:my-10 lg:rounded-[18px] lg:border lg:border-hc-n-200">
        {children}
      </div>

      <CartModal
        open={showCartRecovery}
        cart={recoveryCart}
        addItem={addItem}
        onClose={() => setShowCartRecovery(false)}
        onDone={() => navigate(recoveryDest, { replace: true })}
      />

      <Modal open={showAdminModal} title={t('login.adminModal')} variante="clasica">
        <div className="space-y-3">
          <p className="text-sm mb-4" style={{ color: 'var(--hc-muted)' }}>{t('login.adminModalSub')}</p>
          {[
            { icono: 'monitor', label: t('login.enterAdmin'), sub: t('login.enterAdminSub'), dest: '/admin' },
            { icono: 'bolsa', label: t('login.enterClient'), sub: t('login.enterClientSub'), dest: '/' },
          ].map(({ icono, label, sub, dest }) => (
            <button type="button" key={dest} onClick={() => { setShowAdminModal(false); navigate(dest) }}
              className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-colors hover:bg-[color-mix(in_srgb,var(--hc-accent)_5%,transparent)]"
              style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--hc-surface-3)', color: 'var(--hc-accent)' }}>
                <TrustGlyph tipo={icono} className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>{label}</div>
                <div className="text-xs" style={{ color: 'var(--hc-muted)' }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </MainLayout>
  )
}
