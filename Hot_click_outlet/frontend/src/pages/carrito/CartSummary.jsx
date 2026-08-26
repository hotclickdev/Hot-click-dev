import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import ShippingProgress from '@/components/ui/ShippingProgress'
import { formatPrice } from '@/utils/format'
import { subtotalItem } from './cartHelpers'
import TextoFlecha from '@/components/ui/TextoFlecha'
import { LockIcon, WhatsAppIcon } from './cartIcons'

export default function CartSummary({ items, total, onCheckout, onWhatsApp }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-24 bg-[#111114] border border-white/8 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
    >
      <h2 className="font-semibold text-[#e8e8ed]">{t('cart.summary')}</h2>

      <div className="space-y-2 text-sm">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-[#8e8e9a]">
            <span className="truncate mr-2">{item.nombre} ×{item.cantidad}</span>
            <span className="shrink-0">{formatPrice(subtotalItem(item))}</span>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-white/8 flex justify-between font-bold text-[#e8e8ed]">
        <span>{t('cart.total')}</span>
        <span className="text-lg">{formatPrice(total)}</span>
      </div>

      <ShippingProgress total={total} />

      <div className="pt-2 space-y-2">
        <Button
          onClick={onCheckout}
          variant="primary"
          className="w-full"
          size="lg"
        >
          <LockIcon />
          {t('cart.payCard')}
        </Button>
        <button
          type="button"
          onClick={onWhatsApp}
          className="w-full min-h-11 inline-flex items-center justify-center gap-2 text-sm font-medium"
          style={{ color: 'var(--hc-muted)' }}
        >
          <WhatsAppIcon />
          {t('cart.orderWhatsapp')}
        </button>
        <Link to="/productos">
          <Button variant="ghost" className="w-full" size="md">
            <TextoFlecha dir="atras">{t('cart.keepShopping')}</TextoFlecha>
          </Button>
        </Link>
      </div>

      <p className="text-xs text-[#8e8e9a] text-center leading-relaxed">
        {t('cart.shipping')}<br />
        <span className="text-[10px]">{t('cart.shippingSub')}</span>
      </p>
    </motion.div>
  )
}
