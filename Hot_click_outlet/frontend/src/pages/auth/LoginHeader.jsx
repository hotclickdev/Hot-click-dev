import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'

export default function LoginHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b"
      style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(16px)' }}>
      <Link to="/" className="flex items-center gap-2.5">
        <BrandLogo size={28} wordmarkSize={15} />
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-sm hidden sm:block" style={{ color: 'var(--hc-muted)' }}>¿Primera vez?</span>
        <Link to="/registro" className="hc-btn hc-btn-ghost hc-btn-sm">Crear cuenta</Link>
      </div>
    </header>
  )
}
