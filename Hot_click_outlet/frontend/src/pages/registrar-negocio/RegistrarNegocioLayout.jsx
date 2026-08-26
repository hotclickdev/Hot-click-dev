import { Link } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import TextoFlecha from '@/components/ui/TextoFlecha'

/** Chrome de fondo, header y contenedor de `/registrar-negocio`. */
export default function RegistrarNegocioLayout({ onSkip, children }) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--hc-bg)' }}>

      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 60% 50% at 70% 25%, rgba(231,59,51,0.1), transparent 65%)` }} />
      </div>
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(var(--hc-border) 1px,transparent 1px),linear-gradient(90deg,var(--hc-border) 1px,transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b"
        style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-glass-bg)', backdropFilter: 'blur(16px)' }}>
        <Link to="/" className="flex items-center gap-2.5">
          <BrandLogo size={28} wordmarkSize={15} />
        </Link>
        <button type="button" onClick={onSkip} className="hc-btn hc-btn-ghost hc-btn-sm">
          <TextoFlecha>Hacer esto después</TextoFlecha>
        </button>
      </header>

      {/* Contenido */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[480px]">
          {children}
        </div>
      </main>
    </div>
  )
}
