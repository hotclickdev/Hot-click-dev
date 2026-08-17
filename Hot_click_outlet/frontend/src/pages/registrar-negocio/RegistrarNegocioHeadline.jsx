import { A } from './registrarNegocioTheme'

/** Badge y titular de bienvenida del registro de negocio. */
export default function RegistrarNegocioHeadline({ userName }) {
  return (
    <>
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
        style={{ background: A.bg, border: `1px solid ${A.ring}`, color: A.color, letterSpacing: '0.06em' }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: A.color }}></span>
        <span>REGISTRÁ TU NEGOCIO</span>
      </div>

      {/* Headline */}
      <div className="mb-7">
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2.2rem, 6vw, 3rem)', color: 'var(--hc-text)' }}>
          {userName ? `Hola, ${userName.split(' ')[0]}` : '¡Hola!'}
        </h1>
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2.2rem, 6vw, 3rem)', color: A.color }}>
          empezá a vender
        </h1>
        <p className="text-sm mt-3" style={{ color: 'var(--hc-muted)' }}>
          Completá los datos de tu negocio para acceder al panel de emprendedor.
        </p>
      </div>
    </>
  )
}
