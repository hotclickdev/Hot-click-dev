/**
 * Badge y titular del registro de emprendimiento.
 */
export default function EmprendimientoHeader() {
  return (
    <>
      {/* Badge */}
      <div className="flex items-center gap-3 mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ background: 'color-mix(in srgb, var(--hc-primary) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-primary) 22%, transparent)', color: 'var(--hc-primary)', letterSpacing: '0.06em' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--hc-primary)] animate-pulse"></span>
          <span>Registro de emprendimiento</span>
        </div>
      </div>

      {/* Headline */}
      <div className="mb-7">
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', color: 'var(--hc-text)' }}>Registrá tu</h1>
        <h1 className="font-black leading-[1.0] tracking-tight"
          style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', color: 'var(--hc-primary)' }}>negocio</h1>
        <div className="flex items-center gap-2 mt-3">
          <div className="w-5 h-[2px] rounded-full bg-[var(--hc-primary)]" />
          <p className="text-sm font-medium" style={{ color: 'var(--hc-muted)' }}>Completá los datos y empezá a vender hoy.</p>
        </div>
      </div>
    </>
  )
}
