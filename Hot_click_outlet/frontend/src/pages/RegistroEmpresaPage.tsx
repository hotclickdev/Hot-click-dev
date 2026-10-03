import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import type { TurnstileInstance } from '@marsidev/react-turnstile'
import { authService } from '@/services/authService'
import useAuthStore from '@/store/authStore'
import Seo from '@/components/seo/Seo'
import { isTokenAlive } from '@/utils/authToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { destinoVender, RUTA_REGISTRO_EMPRESA, RUTA_REGISTRAR_NEGOCIO } from '@/utils/destinoVender'
import { mensajeErrorAuth } from './auth/authHelpers'
import { authDataRegistroEmpresa, MIN_PASSWORD, type RegistroEmpresaForm } from './registro-empresa/registroEmpresaHelpers'
import { leerPlanQuery, type PlanQueryId } from './registro-empresa/planQueryParam'
import { destinoTrasAlta, planAlta } from './registro-empresa/altaVendedorPlanes'
import { AltaHeader, AltaPasos } from './registro-empresa/AltaVendedorUI'
import PasoPlan from './registro-empresa/PasoPlan'
import PasoNegocio, { type ConsentimientosAlta } from './registro-empresa/PasoNegocio'
import PasoListo from './registro-empresa/PasoListo'

type Fase = 'plan' | 'negocio' | 'listo'

/**
 * Alta de vendedor (visitante) — propuesta de Diseño aprobada el 3-oct-2026 sobre la base de Figma.
 * Paso 1 Plan → Paso 2 Tu negocio → Paso 3 Activar (Pyme/Plus en /registro-empresa/activar-plan) o "¡Listo!" (Emprendedor).
 * Reemplaza el diseño viejo (aside marino con degradados, badge pulsante, tarjeta con línea degradada).
 */
export default function RegistroEmpresaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loginStore = useAuthStore((s) => s.login)
  const token = useAuthStore((s) => s.token)
  const userRole = useAuthStore((s) => s.userRole)
  const empresaId = useAuthStore((s) => s.empresaId)

  const planInicial = leerPlanQuery(searchParams.toString())
  const [plan, setPlan] = useState<PlanQueryId>(planInicial ?? 'emprendedor')
  const [fase, setFase] = useState<Fase>(planInicial ? 'negocio' : 'plan')
  /** BUG-03: el destino post-alta se fija ANTES de loginStore, así el guard de sesión no gana la carrera. */
  const [destinoPost, setDestinoPost] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [consentimientos, setConsentimientos] = useState<ConsentimientosAlta>({ terminos: false, acuerdo: false })
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const [form, setForm] = useState<RegistroEmpresaForm>({
    nombreEmpresa: '', correoEmpresa: '', telefonoEmpresa: '',
    nombreAdmin: '', correoAdmin: '', passwordAdmin: '', telefonoAdmin: '',
    inscritoTributacion: true,
  })

  if (destinoPost) return <Navigate to={destinoPost} replace />
  const destino = destinoVender({ tokenVivo: isTokenAlive(token), rol: userRole, empresaId })
  if (fase !== 'listo' && destino !== RUTA_REGISTRO_EMPRESA) return <Navigate to={destino} replace />

  const planElegido = planAlta(plan)
  const paso = fase === 'plan' ? 0 : fase === 'negocio' ? 1 : 2

  const actualizarCampo = (campo: keyof RegistroEmpresaForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [campo]: e.target.value }))

  const elegirPlan = (id: PlanQueryId) => {
    setPlan(id)
    setFase('negocio')
    navigate({ search: `?plan=${id}` }, { replace: true })
    window.scrollTo({ top: 0 })
  }

  const resetTurnstile = () => {
    turnstileRef.current?.reset()
    setTurnstileToken('')
  }

  const validar = (): string => {
    if (!form.nombreEmpresa.trim()) return 'Escribí el nombre de tu negocio.'
    if (!form.correoAdmin.trim()) return 'Escribí tu correo para entrar al panel.'
    if (form.passwordAdmin.length < MIN_PASSWORD) return `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`
    if (!consentimientos.terminos) return 'Aceptá los Términos y la Política de Privacidad para continuar.'
    if (!consentimientos.acuerdo) return 'Para continuar, aceptá el Acuerdo de Vendedores.'
    return ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const problema = validar()
    setError(problema)
    if (problema) return
    setLoading(true)
    try {
      const { data } = await authService.registroEmpresa({
        nombreEmpresa: form.nombreEmpresa.trim(),
        correoEmpresa: form.correoEmpresa.trim().toLowerCase() || undefined,
        telefonoEmpresa: form.telefonoEmpresa.trim() || undefined,
        nombreAdmin: form.nombreAdmin.trim() || undefined,
        correoAdmin: form.correoAdmin.trim().toLowerCase(),
        passwordAdmin: form.passwordAdmin,
        telefonoAdmin: form.telefonoAdmin.trim() || undefined,
        inscritoTributacion: form.inscritoTributacion,
        ...(turnstileToken ? { turnstileToken } : {}),
      })
      const authData = authDataRegistroEmpresa(data)
      if (!authData?.accessToken) {
        setError('No pudimos terminar el registro. Intentá de nuevo.')
        resetTurnstile()
        return
      }
      const siguiente = destinoTrasAlta(plan)
      if (siguiente) setDestinoPost(siguiente)
      else setFase('listo')
      loginStore(authData)
      authService.registrarConsentimiento('REGISTRO')
      authService.registrarConsentimiento('VENDEDOR')
    } catch (err: unknown) {
      setError(mensajeErrorAuth(err, '') || 'No pudimos crear tu cuenta. Revisá los datos e intentá de nuevo.')
      resetTurnstile()
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Seo
        title="Empezá a vender en HotClick — Registrá tu negocio"
        description="Creá tu tienda en HotClick: elegí tu plan, contanos de tu negocio y empezá a vender en todo Costa Rica."
        url="https://hotclick.lat/registro-empresa"
      />
      <div className="min-h-screen bg-hc-n-50 font-[family-name:var(--hc-font-text)] text-hc-n-900">
        <AltaHeader
          derecha={fase === 'listo' ? null : (
            <>¿Ya tenés cuenta?{' '}
              <Link to={rutaLoginConRetorno(RUTA_REGISTRAR_NEGOCIO)} className="font-semibold text-hc-blue-600">Ingresar</Link>
            </>
          )}
        />
        <main className={`mx-auto flex w-full flex-col gap-5 px-4 pb-12 pt-5 lg:pt-8 ${fase === 'plan' ? 'max-w-[960px]' : 'max-w-[640px]'}`}>
          <AltaPasos paso={paso} />
          {fase === 'plan' ? <PasoPlan plan={plan} onPlan={setPlan} onElegir={elegirPlan} /> : null}
          {fase === 'negocio' ? (
            <PasoNegocio
              plan={planElegido}
              form={form}
              consentimientos={consentimientos}
              error={error}
              loading={loading}
              turnstileRef={turnstileRef}
              turnstileToken={turnstileToken}
              onCampo={actualizarCampo}
              onTelefono={(v) => setForm((p) => ({ ...p, telefonoEmpresa: v }))}
              onTelefonoAdmin={(v) => setForm((p) => ({ ...p, telefonoAdmin: v }))}
              onInscrito={(v) => setForm((p) => ({ ...p, inscritoTributacion: v }))}
              onConsentimiento={(campo, v) => setConsentimientos((p) => ({ ...p, [campo]: v }))}
              onTurnstileToken={setTurnstileToken}
              onCambiarPlan={() => setFase('plan')}
              onAtras={() => setFase('plan')}
              onSubmit={handleSubmit}
            />
          ) : null}
          {fase === 'listo' ? <PasoListo nombreNegocio={form.nombreEmpresa.trim()} /> : null}
        </main>
      </div>
    </>
  )
}
