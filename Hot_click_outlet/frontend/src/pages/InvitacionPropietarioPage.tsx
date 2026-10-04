import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { prefijoPorPlan } from '@/utils/planPaths'
import { mensajeApi } from '@/prototipo/compartido/enlaceInvitacion'
import { Boton, Campo } from '@/prototipo/compartido/ui'
import EntradaPagina from '@/prototipo/compartido/motion/EntradaPagina'
import PantallaExitoWizard from '@/prototipo/compartido/motion/PantallaExitoWizard'
import type { AuthResponse } from '@/types/auth'

type InvitacionPublica = {
  nombreComercial?: string
  logoUrl?: string | null
  plan?: string
}

type Aceptacion = AuthResponse & { plan?: string; otpEnviado?: boolean }

export default function InvitacionPropietarioPage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const sesion = useAuthStore((s) => Boolean(s.token))
  const nombreSesion = useAuthStore((s) => s.userName)
  const [info, setInfo] = useState<InvitacionPublica | null>(null)
  const [carga, setCarga] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modo, setModo] = useState<'registro' | 'login'>('registro')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [telefono, setTelefono] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState<Aceptacion | null>(null)
  const [tokenCargado, setTokenCargado] = useState(token)

  if (token !== tokenCargado) {
    setTokenCargado(token)
    setCarga(true)
    setInfo(null)
    setError(null)
    setListo(null)
  }

  useEffect(() => {
    let cancelado = false
    api.get<InvitacionPublica>(`/public/invitaciones/${encodeURIComponent(token)}`)
      .then(({ data }) => { if (!cancelado) setInfo(data) })
      .catch((err) => { if (!cancelado) setError(mensajeApi(err, 'Este enlace ya no está disponible.')) })
      .finally(() => { if (!cancelado) setCarga(false) })
    return () => { cancelado = true }
  }, [token])

  async function aceptar(body: Record<string, string> | null) {
    setEnviando(true)
    setError(null)
    try {
      const { data } = await api.post<Aceptacion>(
        `/public/invitaciones/${encodeURIComponent(token)}/aceptar`,
        body ?? {},
      )
      setListo(data)
    } catch (err) {
      setError(mensajeApi(err, 'No pudimos asignar el negocio. Intentá de nuevo.'))
    } finally {
      setEnviando(false)
    }
  }

  function entrar() {
    if (!listo?.accessToken) return
    useTenantStore.setState({ loaded: false, loading: false })
    useAuthStore.getState().login(listo)
    navigate(prefijoPorPlan(listo.plan))
  }

  return (
    <div className="hc-seller-theme min-h-dvh bg-hc-bg text-hc-text">
      <EntradaPagina className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-10">
        {carga ? <p className="text-sm text-hc-muted">Cargando el negocio…</p> : null}
        {!carga && error && !info ? (
          <div>
            <h1 className="font-display text-2xl font-bold">Enlace no disponible</h1>
            <p className="mt-2 text-sm text-hc-muted">{error}</p>
          </div>
        ) : null}
        {info && !listo ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              void aceptar(modo === 'registro'
                ? { modo: 'registro', nombre, apellido, correo, password, telefono }
                : { modo: 'login', correo, password })
            }}
          >
            {info.logoUrl ? (
              <img src={info.logoUrl} alt="" className="size-16 rounded-xl object-cover" />
            ) : null}
            <h1 className="font-display text-2xl font-bold">{info.nombreComercial ?? 'Un negocio'}</h1>
            <p className="text-sm text-hc-muted">
              Te lo asignaron en HotClick. Creá tu cuenta o entrá con la que ya tenés para quedar como propietario.
            </p>
            {sesion ? (
              <Boton type="button" disabled={enviando} onClick={() => void aceptar(null)}>
                {enviando ? 'Asignando…' : `Aceptar con ${nombreSesion ?? 'mi cuenta'}`}
              </Boton>
            ) : null}
            <div className="flex gap-2">
              <button type="button" className="min-h-11 flex-1 rounded-xl border border-hc-border text-sm font-semibold" onClick={() => setModo('registro')} aria-pressed={modo === 'registro'}>
                Soy nuevo
              </button>
              <button type="button" className="min-h-11 flex-1 rounded-xl border border-hc-border text-sm font-semibold" onClick={() => setModo('login')} aria-pressed={modo === 'login'}>
                Ya tengo cuenta
              </button>
            </div>
            {modo === 'registro' ? (
              <>
                <Campo etiqueta="Nombre" value={nombre} onChange={setNombre} />
                <Campo etiqueta="Apellido" value={apellido} onChange={setApellido} />
                <Campo etiqueta="Teléfono" value={telefono} onChange={setTelefono} />
              </>
            ) : null}
            <Campo etiqueta="Correo" type="email" value={correo} onChange={setCorreo} />
            <Campo etiqueta="Contraseña" type="password" value={password} onChange={setPassword} help={modo === 'registro' ? 'Mínimo 8 caracteres, una mayúscula y un número.' : undefined} />
            {error ? <p className="text-sm text-hc-primary">{error}</p> : null}
            <Boton type="submit" disabled={enviando}>
              {enviando ? 'Asignando…' : 'Aceptar el negocio'}
            </Boton>
          </form>
        ) : null}
        {listo ? (
          <PantallaExitoWizard
            titulo={`Ya sos propietario de ${info?.nombreComercial ?? 'este negocio'}`}
            mensaje={listo.otpEnviado
              ? 'Te enviamos un código para confirmar el correo. Podés entrar a la guía ahora.'
              : 'La guía te lleva en orden: bodega, producto y cobro.'}
            accion={<Boton onClick={entrar}>Entrar a mi negocio</Boton>}
          />
        ) : null}
      </EntradaPagina>
    </div>
  )
}
