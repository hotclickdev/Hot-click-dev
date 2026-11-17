import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Seo from '@/components/seo/Seo'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'
import { contrasenaAceptable } from './recuperar/recuperarHelpers'

type Invitacion = { negocio: string; rolEnEmpresa: string; correo: string; cuentaExiste: boolean }

const ROLES: Record<string, string> = {
  ADMIN: 'Admin', EDITOR: 'Editor', LECTOR: 'Lector', CAJERO: 'Cajero',
}

function mensajeError(err: unknown, porDefecto: string): string {
  const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
  return m || porDefecto
}

/** Aceptar una invitación al equipo con el enlace de un solo uso del correo (cuenta nueva o existente). */
export default function AceptarInvitacionEquipoPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const sesionCorreo = useAuthStore((s) => s.userEmail)
  const [inv, setInv] = useState<Invitacion | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'invalida' | 'lista' | 'hecho'>('cargando')
  const [contrasena, setContrasena] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let cancelado = false
    api.get(`/auth/equipo-invitacion/${encodeURIComponent(token)}`)
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
    if (!inv) return
    if (contrasena !== repetir) { setError('Las contraseñas no coinciden'); return }
    setEnviando(true); setError('')
    try {
      await api.post(`/auth/equipo-invitacion/${encodeURIComponent(token)}/aceptar-cuenta-nueva`, { contrasena })
      setEstado('hecho')
    } catch (err) {
      setError(mensajeError(err, 'No pudimos aceptar la invitación'))
    } finally {
      setEnviando(false)
    }
  }

  async function aceptarExistente() {
    setEnviando(true); setError('')
    try {
      await api.post(`/equipo-invitaciones/${encodeURIComponent(token)}/aceptar`)
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
                <Link to={`/login?redirect=${encodeURIComponent(`/equipo/invitacion/${token}`)}`}
                  className="rounded-xl bg-hc-blue-600 px-4 py-2 text-center text-sm font-medium text-white">
                  Iniciar sesión
                </Link>
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
