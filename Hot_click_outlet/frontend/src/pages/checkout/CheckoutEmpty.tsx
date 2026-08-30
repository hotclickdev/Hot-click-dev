import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'

export default function CheckoutEmpty() {
  const { t } = useTranslation()
  return (
    <MainLayout>
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="text-lg mb-4" style={{ color: 'var(--hc-text)' }}>{t('checkout.cartEmpty')}</p>
        <Link to="/productos" className="hc-btn hc-btn-primary min-h-11">
          {t('checkout.continueShopping')}
        </Link>
      </div>
    </MainLayout>
  )
}
