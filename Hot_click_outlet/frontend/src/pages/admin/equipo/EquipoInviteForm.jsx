import PhoneField from '@/components/ui/PhoneField'
import EquipoField from './EquipoField'
import { ROL_CONFIG, ROLES_ASIGNABLES, generatePassword } from './equipoHelpers'

/**
 * @param {{
 *   form: { nombre: string, correo: string, password: string, telefono: string, rolEnEmpresa: string }
 *   errors: Record<string, string>
 *   saving: boolean
 *   showPwd: boolean
 *   onChange: (patch: object) => void
 *   onShowPwd: (value: boolean | ((v: boolean) => boolean)) => void
 *   onCancel: () => void
 *   onSubmit: (e: import('react').FormEvent) => void
 * }} props
 */
export default function EquipoInviteForm({
  form,
  errors,
  saving,
  showPwd,
  onChange,
  onShowPwd,
  onCancel,
  onSubmit,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl p-5 space-y-4"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
    >
      <h2 className="font-semibold text-sm" style={{ color: 'var(--hc-text)' }}>Nuevo miembro</h2>

      <div>
        <p className="text-xs font-medium block mb-2" style={{ color: 'var(--hc-muted)' }}>Rol en el negocio</p>
        <div className="grid grid-cols-2 gap-2">
          {ROLES_ASIGNABLES.map((r) => {
            const cfg = ROL_CONFIG[r]
            const active = form.rolEnEmpresa === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => onChange({ rolEnEmpresa: r })}
                className="flex flex-col gap-0.5 px-4 py-3 rounded-xl text-left transition-all"
                style={{
                  border: `2px solid ${active ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  backgroundColor: active
                    ? 'color-mix(in srgb, var(--hc-accent) 8%, transparent)'
                    : 'var(--hc-surface-2)',
                }}
              >
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${cfg.color}`}>{cfg.label}</span>
                <span className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{cfg.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <EquipoField label="Nombre completo" error={errors.nombre}>
          <input
            value={form.nombre}
            onChange={(e) => onChange({ nombre: e.target.value })}
            placeholder="Ej: María González"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--hc-surface-2)',
              border: `1px solid ${errors.nombre ? '#ef4444' : 'var(--hc-border)'}`,
              color: 'var(--hc-text)',
            }}
          />
        </EquipoField>
        <EquipoField label="Correo electrónico" error={errors.correo}>
          <input
            type="email"
            value={form.correo}
            onChange={(e) => onChange({ correo: e.target.value })}
            placeholder="correo@ejemplo.com"
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{
              backgroundColor: 'var(--hc-surface-2)',
              border: `1px solid ${errors.correo ? '#ef4444' : 'var(--hc-border)'}`,
              color: 'var(--hc-text)',
            }}
          />
        </EquipoField>
        <EquipoField label="Contraseña de acceso" error={errors.password}>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => onChange({ password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 pr-9 rounded-xl text-sm outline-none font-mono"
                style={{
                  backgroundColor: 'var(--hc-surface-2)',
                  border: `1px solid ${errors.password ? '#ef4444' : 'var(--hc-border)'}`,
                  color: 'var(--hc-text)',
                }}
              />
              <button
                type="button"
                onClick={() => onShowPwd((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity hover:opacity-70"
                style={{ color: 'var(--hc-muted)' }}
                title={showPwd ? 'Ocultar' : 'Mostrar'}
              >
                {showPwd
                  ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )
                  : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                onChange({ password: generatePassword() })
                onShowPwd(true)
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-opacity hover:opacity-80"
              style={{
                backgroundColor: 'var(--hc-surface-2)',
                border: '1px solid var(--hc-border)',
                color: 'var(--hc-accent)',
              }}
              title="Generar contraseña segura automáticamente"
            >
              Generar
            </button>
          </div>
        </EquipoField>
        <EquipoField label="Teléfono (opcional)">
          <PhoneField
            value={form.telefono}
            onChange={(val) => onChange({ telefono: val })}
            hint="Opcional"
          />
        </EquipoField>
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm"
          style={{ color: 'var(--hc-muted)' }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          {saving ? 'Guardando…' : 'Agregar miembro'}
        </button>
      </div>
    </form>
  )
}
