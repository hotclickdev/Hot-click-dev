import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import AuthLayout from '@/layouts/AuthLayout'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'

export default function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', telefono: '', identificacion: '', contrasenaHash: '',
  })

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.contrasenaHash.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setError('')
    setLoading(true)
    try {
      await authService.register(form)
      setSuccess(true)
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data
      setError(typeof msg === 'string' ? msg : 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111114] border border-white/8 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-[#e8e8ed] mb-2">¡Solicitud enviada!</h2>
          <p className="text-sm text-[#8e8e9a] mb-6 leading-relaxed">
            Tu cuenta fue creada exitosamente. Un administrador debe aprobar tu solicitud antes de que puedas ingresar.
            Recibirás una notificación por correo cuando sea aprobada.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Ir al login
          </Button>
        </motion.div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="bg-[#111114] border border-white/8 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#e8e8ed] mb-1">Crear cuenta</h1>
          <p className="text-sm text-[#8e8e9a]">Únete a HOTCLICK</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} required placeholder="Juan" />
            <Input label="Apellido *" value={form.apellidoPaterno} onChange={set('apellidoPaterno')} required placeholder="Pérez" />
          </div>
          <Input label="Apellido materno" value={form.apellidoMaterno} onChange={set('apellidoMaterno')} placeholder="Opcional" />
          <Input label="Correo *" type="email" value={form.correo} onChange={set('correo')} required placeholder="tu@email.com" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono *" type="tel" value={form.telefono} onChange={set('telefono')} required placeholder="8888-8888" />
            <Input label="Identificación *" value={form.identificacion} onChange={set('identificacion')} required placeholder="1-2345-6789" />
          </div>
          <Input label="Contraseña *" type="password" value={form.contrasenaHash} onChange={set('contrasenaHash')} required minLength={6} placeholder="Mínimo 6 caracteres" hint="Mínimo 6 caracteres" />

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5"
            >
              {error}
            </motion.p>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Crear cuenta
          </Button>
        </form>

        <p className="text-center text-xs text-[#8e8e9a] mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#4f7cff] hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
