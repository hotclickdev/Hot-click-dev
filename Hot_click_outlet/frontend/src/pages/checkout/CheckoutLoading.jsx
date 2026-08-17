import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'

export default function CheckoutLoading({ estado }) {
  const { t } = useTranslation()
  const msg = estado === 'redirecting'
    ? t('checkout.redirectingPayment', { defaultValue: 'Redirigiendo al pago seguro…' })
    : t('checkout.preparing')
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-32 text-center flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-[#4f7cff] border-t-transparent animate-spin" />
        <p className="text-[#e8e8ed] text-lg font-medium">{msg}</p>
        <p className="text-[#8e8e9a] text-sm">{t('checkout.dontClose')}</p>
      </div>
    </MainLayout>
  )
}
