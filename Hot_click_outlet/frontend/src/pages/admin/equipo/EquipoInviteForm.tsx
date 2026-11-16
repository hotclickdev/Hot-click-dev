import PhoneField from '@/components/ui/PhoneField'
import EquipoField from './EquipoField'
import { ROL_CONFIG, ROLES_ASIGNABLES, type FormularioEquipo } from './equipoHelpers'
import type { FormEvent } from 'react'

export type EquipoInviteFormProps = {
  form: FormularioEquipo
  errors: Record<string, string>
  saving: boolean
  onChange: (patch: Partial<FormularioEquipo>) => void
  onCancel: () => void
  onSubmit: (e: FormEvent) => void
}

export default function EquipoInviteForm({
  form,
  errors,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: EquipoInviteFormProps) {
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
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          La persona invitada recibirá un correo para crear su propia contraseña con un código de un solo uso.
        </p>
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
