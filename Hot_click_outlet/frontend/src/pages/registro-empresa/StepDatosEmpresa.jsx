import { motion } from 'framer-motion'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import ErrMsg from '../auth/ErrMsg'
import { STEP_MOTION } from './registroEmpresaHelpers'

export default function StepDatosEmpresa({
  form, error, onCampo, onTelefono, onSubmit, onAtras,
}) {
  return (
    <motion.form key="s1" {...STEP_MOTION} onSubmit={onSubmit} className="space-y-4">
      <Input label="Nombre del negocio *" placeholder="Ej: Mi Tienda Tica"
        value={form.nombreEmpresa} onChange={onCampo('nombreEmpresa')} autoFocus required />
      <Input label="Correo del negocio" type="email" placeholder="contacto@minegocio.com"
        value={form.correoEmpresa} onChange={onCampo('correoEmpresa')} hint="Opcional" />
      <PhoneField label="Teléfono del negocio"
        value={form.telefonoEmpresa} onChange={onTelefono} />
      {error && <ErrMsg>{error}</ErrMsg>}
      <div className="flex gap-2.5">
        <button type="button" onClick={onAtras} className="hc-btn hc-btn-outline px-4">← Atrás</button>
        <button type="submit" className="hc-btn hc-btn-primary hc-btn-lg flex-1"
          style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px rgba(231,59,51,0.3)' }}>
          Siguiente →
        </button>
      </div>
    </motion.form>
  )
}
