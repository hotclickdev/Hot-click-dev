import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, WHATSAPP } from './contactoHelpers'

export default function ContactoCanales() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <motion.a
        {...fadeUp(0.15)}
        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(t('contacto.waDefault'))}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 p-5 bg-[#111114] border border-white/8 rounded-2xl hover:border-green-500/30 hover:bg-green-500/5 transition-all group"
      >
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8e8e9a] mb-0.5">WhatsApp</p>
          <p className="text-sm font-semibold text-green-400 group-hover:text-green-300 transition-colors">+506 8666-7888</p>
          <p className="text-xs text-[#8e8e9a] mt-0.5">{t('contacto.waHint')}</p>
        </div>
        <IconFlecha className="group-hover:text-green-400" />
      </motion.a>

      <motion.a
        {...fadeUp(0.2)}
        href="mailto:hotclick.cr@gmail.com"
        className="flex items-center gap-4 p-5 bg-[#111114] border border-white/8 rounded-2xl hover:border-[#4f7cff]/30 hover:bg-[#4f7cff]/5 transition-all group"
      >
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#4f7cff]/10 border border-[#4f7cff]/20 flex items-center justify-center group-hover:bg-[#4f7cff]/20 transition-colors">
          <svg className="w-5 h-5 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8e8e9a] mb-0.5">Email</p>
          <p className="text-sm font-semibold text-[#4f7cff] group-hover:text-[#3d6ee0] transition-colors truncate">hotclick.cr@gmail.com</p>
        </div>
        <IconFlecha className="group-hover:text-[#4f7cff]" />
      </motion.a>

      <motion.div {...fadeUp(0.25)} className="flex items-center gap-4 p-5 bg-[#111114] border border-white/8 rounded-2xl">
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
          <BanderaCostaRica />
        </div>
        <div>
          <p className="text-xs text-[#8e8e9a] mb-0.5">{t('contacto.country')}</p>
          <p className="text-sm font-semibold text-[#e8e8ed]">Costa Rica</p>
        </div>
      </motion.div>

      <motion.div {...fadeUp(0.3)} className="p-5 bg-[#4f7cff]/8 border border-[#4f7cff]/20 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-[#4f7cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-semibold text-[#4f7cff]">{t('contacto.schedule')}</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-sm text-[#e8e8ed]">{t('contacto.weekdays')}</span>
            </div>
            <span className="text-sm font-medium text-[#e8e8ed] tabular-nums">{t('contacto.weekdaysHours')}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8e8e9a]/40 flex-shrink-0" />
              <span className="text-sm text-[#8e8e9a]">{t('contacto.weekend')}</span>
            </div>
            <span className="text-sm text-[#8e8e9a]">{t('contacto.closed')}</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function IconFlecha({ className = '' }) {
  return (
    <svg className={`w-4 h-4 text-[#8e8e9a] transition-colors flex-shrink-0 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

/** Bandera CR (franjas 1-1-2-1-1) — reemplazo del emoji, mismo recuadro. */
function BanderaCostaRica() {
  return (
    <svg viewBox="0 0 30 18" className="w-7 h-4" aria-hidden="true">
      <rect width="30" height="3" y="0" fill="#002b7f" />
      <rect width="30" height="3" y="3" fill="#fff" />
      <rect width="30" height="6" y="6" fill="#ce1126" />
      <rect width="30" height="3" y="12" fill="#fff" />
      <rect width="30" height="3" y="15" fill="#002b7f" />
    </svg>
  )
}
