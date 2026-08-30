import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'

type CheckoutLoadingProps = {
  estado: string
}

export default function CheckoutLoading({ estado }: CheckoutLoadingProps) {
  const { t } = useTranslation()
  const msg = estado === 'redirecting'
    ? t('checkout.redirectingPayment', { defaultValue: 'Redirigiendo al pago seguro…' })
    : t('checkout.preparing')
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: 'var(--hc-accent)', borderTopColor: 'transparent' }} />
        <p className="text-lg font-medium" style={{ color: 'var(--hc-text)' }}>{msg}</p>
        <p className="text-[#8e8e9a] text-sm">{t('checkout.dontClose')}</p>
      </div>
    </MainLayout>
  )
}
