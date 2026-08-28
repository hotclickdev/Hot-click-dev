import { motion } from 'framer-motion'
import PhoneField from '@/components/ui/PhoneField'
import Input from '@/components/ui/Input'
import ErrMsg from '../ErrMsg'
import TextoFlecha from '@/components/ui/TextoFlecha'
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react'
import type { FormEmprendimiento } from '../EmprendimientoForm'

/**
 * Paso 0 — datos del negocio.
 */
export default function EmprendimientoPasoNegocio({
  form, error, actualizarCampo, setForm, onSubmit,
}: {
  form: FormEmprendimiento
  error: string
  actualizarCampo: (field: keyof FormEmprendimiento) => (e: ChangeEvent<HTMLInputElement>) => void
  setForm: Dispatch<SetStateAction<FormEmprendimiento>>
  onSubmit: (e: FormEvent) => void
}) {
  return (
    <motion.form key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
      onSubmit={onSubmit} className="space-y-4">
      <Input label="Nombre del negocio *" placeholder="Ej: Mi Tienda Tica"
        value={form.nombreEmpresa} onChange={actualizarCampo('nombreEmpresa')} autoFocus required maxLength={150} />
      <Input label="Correo del negocio" type="email" placeholder="contacto@minegocio.com"
        value={form.correoEmpresa} onChange={actualizarCampo('correoEmpresa')} hint="Opcional" maxLength={150} />
      <PhoneField label="Teléfono del negocio"
        value={form.telefonoEmpresa} onChange={(val) => setForm(p => ({ ...p, telefonoEmpresa: val }))} />
      {error && <ErrMsg>{error}</ErrMsg>}
      <button type="submit" className="hc-btn hc-btn-primary hc-btn-lg w-full"
        style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
        <TextoFlecha>Continuar</TextoFlecha>
      </button>
    </motion.form>
  )
}
