import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import type { ChangeEvent } from 'react'
import type { FormNegocio } from './registrarNegocioTypes'

/** Campos de nombre, teléfono y correo del negocio. */
export default function DatosNegocioFields({
  form, onCampo, onTelefono,
}: {
  form: FormNegocio
  onCampo: (field: keyof FormNegocio) => (e: ChangeEvent<HTMLInputElement>) => void
  onTelefono: (val: string) => void
}) {
  return (
    <>
      <Input
        label="Nombre del negocio *"
        placeholder="Ej: Mi Tienda Tica"
        value={form.nombreEmpresa}
        onChange={onCampo('nombreEmpresa')}
        required
      />
      <Input
        label="Nombre comercial (opcional)"
        placeholder="Como aparecerá en la tienda"
        value={form.nombreComercial}
        onChange={onCampo('nombreComercial')}
      />
      <PhoneField
        label="Teléfono del negocio (opcional)"
        value={form.telefonoEmpresa}
        onChange={onTelefono}
      />
      <Input
        label="Correo del negocio"
        type="email"
        value={form.correoEmpresa}
        onChange={onCampo('correoEmpresa')}
        placeholder="negocio@ejemplo.com"
      />
    </>
  )
}
