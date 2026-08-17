import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import { authService } from '@/services/authService'
import { haciendaService } from '@/services/haciendaService'
import RegistrarNegocioLayout from './registrar-negocio/RegistrarNegocioLayout'
import RegistrarNegocioHeadline from './registrar-negocio/RegistrarNegocioHeadline'
import RegistrarNegocioCard from './registrar-negocio/RegistrarNegocioCard'
import DatosNegocioFields from './registrar-negocio/DatosNegocioFields'
import HaciendaVerificacion from './registrar-negocio/HaciendaVerificacion'
import AcuerdoYSubmit from './registrar-negocio/AcuerdoYSubmit'

/** Página de registro de negocio — orquesta estado, envío y secciones visuales. */
export default function RegistrarNegocioPage() {
  const navigate = useNavigate()
  const toast    = useToast()
  const login    = useAuthStore((s) => s.login)
  const { userEmail, userName } = useAuthStore()

  const [form, setForm] = useState({
    nombreEmpresa:   '',
    nombreComercial: '',
    telefonoEmpresa: '',
    correoEmpresa:   userEmail || '',
  })

  // Hacienda verification state
  const [cedula,           setCedula]           = useState('')
  const [verificando,      setVerificando]       = useState(false)
  const [haciendaResult,   setHaciendaResult]   = useState(null)   // ContribuyenteDTO | null
  const [haciendaError,    setHaciendaError]    = useState('')
  const [declaraInscrito,  setDeclaraInscrito]  = useState(false)

  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [aceptaAcuerdo, setAceptaAcuerdo] = useState(false)

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const verificarHacienda = async () => {
    const c = cedula.trim().replace(/\D/g, '')
    if (!c || c.length < 9) { setHaciendaError('Ingresá una cédula válida (9 o más dígitos)'); return }
    setHaciendaError('')
    setVerificando(true)
    setHaciendaResult(null)
    setDeclaraInscrito(false)
    try {
      const { data } = await haciendaService.getContribuyente(c)
      setHaciendaResult(data)
    } catch {
      setHaciendaError('No se pudo consultar Hacienda. Intentá de nuevo.')
    } finally {
      setVerificando(false)
    }
  }

  const haciendaValida = haciendaResult?.inscrito === true && declaraInscrito

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!aceptaAcuerdo) { setError('Debés aceptar el Acuerdo de Vendedores para continuar'); return }
    if (!form.nombreEmpresa.trim()) { setError('El nombre del negocio es requerido'); return }
    if (cedula && !haciendaValida) {
      setError('Verificá tu inscripción en Hacienda antes de continuar')
      return
    }
    setError(''); setLoading(true)
    authService.registrarConsentimiento('VENDEDOR')
    try {
      const payload = {
        ...form,
        ...(haciendaValida && {
          cedulaJuridica:    cedula.trim(),
          inscritoHacienda:  true,
          regimenTributario: haciendaResult.regimen,
          nombreHacienda:    haciendaResult.nombre,
        }),
      }
      const { data } = await authService.upgradeEmprendedor(payload)
      login(data?.data ?? data)
      toast({ message: '¡Negocio registrado! Bienvenido al panel de emprendedor.', type: 'success' })
      navigate('/admin', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message
      setError(typeof msg === 'string' ? msg : 'Error al registrar el negocio')
    } finally { setLoading(false) }
  }

  return (
    <RegistrarNegocioLayout onSkip={() => navigate('/')}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <RegistrarNegocioHeadline userName={userName} />
        <RegistrarNegocioCard>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DatosNegocioFields
              form={form}
              onCampo={set}
              onTelefono={(val) => setForm(p => ({ ...p, telefonoEmpresa: val }))}
            />
            <HaciendaVerificacion
              cedula={cedula}
              setCedula={setCedula}
              setHaciendaResult={setHaciendaResult}
              setHaciendaError={setHaciendaError}
              setDeclaraInscrito={setDeclaraInscrito}
              verificando={verificando}
              haciendaResult={haciendaResult}
              haciendaError={haciendaError}
              declaraInscrito={declaraInscrito}
              onVerificar={verificarHacienda}
            />
            <AcuerdoYSubmit
              aceptaAcuerdo={aceptaAcuerdo}
              onAceptaChange={e => setAceptaAcuerdo(e.target.checked)}
              error={error}
              loading={loading}
            />
          </form>
        </RegistrarNegocioCard>
        <p className="text-center text-xs mt-4" style={{ color: 'var(--hc-muted)' }}>
          Tu negocio quedará pendiente de aprobación. Te avisamos por correo.
        </p>
      </motion.div>
    </RegistrarNegocioLayout>
  )
}
