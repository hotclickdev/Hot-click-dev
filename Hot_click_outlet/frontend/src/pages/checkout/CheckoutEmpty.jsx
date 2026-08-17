import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'

export default function CheckoutEmpty() {
  const { t } = useTranslation()
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-[#e8e8ed] text-lg mb-4">{t('checkout.cartEmpty')}</p>
        <Link to="/productos" className="px-6 py-2.5 rounded-xl bg-[#4f7cff] text-white font-medium">
          {t('checkout.continueShopping')}
        </Link>
      </div>
    </MainLayout>
  )
}
