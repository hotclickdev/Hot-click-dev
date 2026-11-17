import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Seo from '@/components/seo/Seo'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'
import { contrasenaAceptable } from './recuperar/recuperarHelpers'
import { capturarTokenDeUrl, guardarParaLogin, olvidarToken, tomarToken } from '@/utils/invitacionToken'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import { RUTA_INVITACION } from '@/utils/sanitizarUrl'

type Invitacion = { negocio: string; rolEnEmpresa: string; correo: string; cuentaExiste: boolean }

const ROLES: Record<string, string> = {
  ADMIN: 'Admin', EDITOR: 'Editor', LECTOR: 'Lector', CAJERO: 'Cajero',
}

function mensajeError(err: unknown, porDefecto: string): string {
  const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return m || porDefecto
}

/**
 * Aceptar una invitación al equipo con el enlace de un solo uso del correo (cuenta nueva o existente).
 * El token llega en el fragmento (`#t=`), se guarda en memoria y se borra de la barra YA; viaja solo en el body de la API.
 */
export default function AceptarInvitacionEquipoPage() {
  const [token, setToken] = useState<string | null>(() => { capturarTokenDeUrl(); return tomarToken() })
  const navigate = useNavigate()
  const sesionCorreo = useAuthStore((s) => s.userEmail)
  const [inv, setInv] = useState<Invitacion | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'invalida' | 'lista' | 'hecho'>(token ? 'cargando' : 'invalida')
  const [contrasena, setContrasena] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const yendoALogin = useRef(false)

  // Un enlace pegado con la página ya abierta cambia solo el hash: se lee otra vez y se limpia igual.
  useEffect(() => {
    const alCambiarHash = () => { if (capturarTokenDeUrl()) setToken(tomarToken()) }
    globalThis.addEventListener('hashchange', alCambiarHash)
    return () => globalThis.removeEventListener('hashchange', alCambiarHash)
  }, [])

  // Al salir de la página no queda el token en memoria ni en sessionStorage (salvo el salto a /login, ya guardado).
  useEffect(() => () => { if (!yendoALogin.current) olvidarToken() }, [])

  useEffect(() => {
    if (!token) return // enlace sin token: el estado inicial ya es 'invalida'
    let cancelado = false
    api.post('/auth/equipo-invitacion/consultar', { token })
      .then((r) => {
        if (cancelado) return
        setInv((r.data as { data: Invitacion }).data)
        setEstado('lista')
      })
      .catch(() => { if (!cancelado) setEstado('invalida') })
    return () => { cancelado = true }
  }, [token])

  async function aceptarNueva(e: FormEvent) {
    e.preventDefault()
    if (!inv || !token) return
    if (contrasena !== repetir) { setError('Las contraseñas no coinciden'); return }
    setEnviando(true); setError('')
    try {
      await api.post('/auth/equipo-invitacion/aceptar-cuenta-nueva', { token, contrasena })
      olvidarToken()
      setEstado('hecho')
    } catch (err) {
      setError(mensajeError(err, 'No pudimos aceptar la invitación'))
    } finally {
      setEnviando(false)
    }
  }

  function irALogin() {
    if (token) guardarParaLogin(token) // sessionStorage de un solo uso: NUNCA en path ni query
    yendoALogin.current = true
    navigate(rutaLoginConRetorno(RUTA_INVITACION))
  }

  async function aceptarExistente() {
    if (!token) return
    setEnviando(true); setError('')
    try {
      await api.post('/equipo-invitaciones/aceptar', { token })
      olvidarToken()
      setEstado('hecho')
    } catch (err) {
      setError(mensajeError(err, 'No pudimos aceptar la invitación'))
    } finally {
      setEnviando(false)
    }
  }

  const rol = inv ? (ROLES[inv.rolEnEmpresa] ?? inv.rolEnEmpresa) : ''
  const sesionCoincide = Boolean(inv && sesionCorreo && sesionCorreo.toLowerCase() === inv.correo.toLowerCase())

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col gap-4 px-4 py-10">
      <Seo title="Invitación al equipo" description="Aceptá tu invitación al equipo de un negocio en HotClick." noindex />
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">Invitación al equipo</h1>
      {estado === 'cargando' && <p className="text-sm text-hc-n-600">Cargando…</p>}
      {estado === 'invalida' && (
        <p role="alert" className="text-sm text-hc-n-700">
          Esta invitación ya no es válida (puede estar usada, vencida o reemplazada). Pedile a quien te invitó que te envíe una nueva.
        </p>
      )}
      {estado === 'hecho' && (
        <>
          <p className="text-sm text-hc-n-700">Listo: ya sos parte del equipo.</p>
          <button type="button" onClick={() => navigate('/login')}
            className="rounded-xl bg-hc-blue-600 px-4 py-2 text-sm font-medium text-white">
            Iniciar sesión
          </button>
        </>
      )}
      {estado === 'lista' && inv && (
        <>
          <p className="text-sm text-hc-n-700">
            Te invitaron a sumarte a <strong>{inv.negocio}</strong> como <strong>{rol}</strong>. Esta invitación es de un solo uso y solo sirve para <strong>{inv.correo}</strong>.
          </p>
          {inv.cuentaExiste ? (
            sesionCoincide ? (
              <button type="button" disabled={enviando} onClick={aceptarExistente}
                className="rounded-xl bg-hc-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {enviando ? 'Aceptando…' : 'Aceptar invitación'}
              </button>
            ) : (
              <>
                <p className="text-sm text-hc-n-700">
                  Para aceptar, iniciá sesión con tu cuenta de <strong>{inv.correo}</strong>.
                </p>
                <button type="button" onClick={irALogin}
                  className="rounded-xl bg-hc-blue-600 px-4 py-2 text-center text-sm font-medium text-white">
                  Iniciar sesión
                </button>
              </>
            )
          ) : (
            <form onSubmit={aceptarNueva} className="flex flex-col gap-3">
              <label className="text-sm text-hc-n-700">Elegí tu contraseña
                <input type="password" autoComplete="new-password" required value={contrasena} maxLength={72}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm text-hc-n-700">Repetí la contraseña
                <input type="password" autoComplete="new-password" required value={repetir} maxLength={72}
                  onChange={(e) => setRepetir(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-hc-n-200 px-3 py-2 text-sm" />
              </label>
              <p className="text-xs text-hc-n-600">Mínimo 8 caracteres, con una mayúscula y un número.</p>
              <button type="submit" disabled={enviando || !contrasenaAceptable(contrasena, inv.correo) || !repetir}
                className="rounded-xl bg-hc-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {enviando ? 'Guardando…' : 'Definir contraseña y aceptar'}
              </button>
            </form>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        </>
      )}
    </main>
  )
}
