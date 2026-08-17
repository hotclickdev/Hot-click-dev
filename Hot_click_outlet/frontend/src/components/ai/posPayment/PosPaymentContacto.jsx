import { motion, AnimatePresence } from 'framer-motion'
import PosPaymentField from './PosPaymentField'

/**
 * Datos de contacto y dirección condicional del checkout embebido.
 */
export default function PosPaymentContacto({
  nombre, setNombre,
  telefono, setTelefono,
  email, setEmail,
  direccion, setDireccion,
  needsAddress,
}) {
  return (
    <div className="space-y-2">
      <PosPaymentField label="Tu nombre" value={nombre} onChange={setNombre} placeholder="Nombre completo" required />
      <PosPaymentField label="Teléfono" value={telefono} onChange={setTelefono} placeholder="8888-7777" type="tel" required />
      <PosPaymentField label="Email (opcional)" value={email} onChange={setEmail} placeholder="para confirmación" type="email" />
      <AnimatePresence>
        {needsAddress && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <PosPaymentField label="Dirección de entrega" value={direccion} onChange={setDireccion}
              placeholder="Provincia, cantón, señas exactas" required />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
