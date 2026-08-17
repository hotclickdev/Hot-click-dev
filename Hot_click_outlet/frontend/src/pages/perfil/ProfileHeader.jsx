import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import useAuthStore from '@/store/authStore'
import { EmpresaIcon } from './perfilIcons'
import { roleLabel } from './perfilHelpers'

function EmpresaCard({ empresaNombre, empresaSlug }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 flex items-center justify-between gap-4"
      style={{ backgroundColor: 'var(--hc-surface)', borderColor: 'var(--hc-border)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--hc-accent)', opacity: 0.15 }}>
          <EmpresaIcon />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{empresaNombre}</p>
          {empresaSlug && <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--hc-muted)' }}>/{empresaSlug}</p>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link
          to="/admin/mi-empresa"
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          Configurar empresa
        </Link>
        <Link
          to="/admin"
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
        >
          Panel admin
        </Link>
      </div>
    </motion.div>
  )
}

export default function ProfileHeader({ twoFAEnabled, onLogout }) {
  const { t } = useTranslation()
  const { userName, userEmail, userRole, empresaNombre, empresaSlug } = useAuthStore()

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>
          {t('profile.datosTitle')}
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#111114] border border-white/8 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center gap-4"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-[#4f7cff]/20 flex items-center justify-center text-2xl font-bold text-[#4f7cff] shrink-0">
            {userName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-[#e8e8ed] truncate">{userName || 'Usuario'}</p>
            <p className="text-sm text-[#8e8e9a] truncate">{userEmail}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="accent">{roleLabel(userRole)}</Badge>
              {twoFAEnabled && <Badge variant="success">{t('profile.twoFAActive')}</Badge>}
            </div>
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={onLogout} className="self-start sm:self-center shrink-0">
          {t('profile.logout')}
        </Button>
      </motion.div>

      {userRole === 'EMPRENDEDOR' && empresaNombre && (
        <EmpresaCard empresaNombre={empresaNombre} empresaSlug={empresaSlug} />
      )}
    </>
  )
}
