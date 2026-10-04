import { useCallback, useEffect, useState } from 'react'
import { adminService } from '@/services/orderService'
import {
  enlaceWhatsapp,
  etiquetaEstadoInvitacion,
  mensajeApi,
  type EstadoInvitacion,
} from '@/prototipo/compartido/enlaceInvitacion'
import { nombreVisibleEmpresa, type EmpresaLista } from './empresasHelpers'

type Estado = {
  estado?: EstadoInvitacion | string
  expiraEn?: string | null
  correoDestino?: string | null
  telefonoDestino?: string | null
}

type Enlace = {
  url?: string
  expiraEn?: string
  estado?: string
}

export default function AsignarPropietarioPanel({ empresa }: { empresa: EmpresaLista }) {
  const nombre = nombreVisibleEmpresa(empresa) ?? 'tu negocio'
  const [estado, setEstado] = useState<Estado | null>(null)
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [url, setUrl] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const { data } = await adminService.getInvitacionPropietario(empresa.id)
      setEstado(data as Estado)
    } catch (err) {
      setError(mensajeApi(err, 'No pudimos ver el enlace de este negocio.'))
    }
  }, [empresa.id])

  useEffect(() => {
    let cancelado = false
    adminService.getInvitacionPropietario(empresa.id)
      .then(({ data }) => { if (!cancelado) setEstado(data as Estado) })
      .catch((err) => { if (!cancelado) setError(mensajeApi(err, 'No pudimos ver el enlace de este negocio.')) })
    return () => { cancelado = true }
  }, [empresa.id])

  async function generar(conCorreo: boolean) {
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      const { data } = await adminService.crearInvitacionPropietario(empresa.id, {
        correo: conCorreo ? correo.trim() : '',
        telefono: telefono.trim(),
      })
      const enlace = data as Enlace
      setUrl(enlace.url ?? null)
      setAviso(conCorreo && correo.trim()
        ? 'Enlace listo y correo enviado. Si ya había otro, ese dejó de servir.'
        : 'Enlace listo. El anterior, si existía, dejó de servir.')
      await cargar()
    } catch (err) {
      setError(mensajeApi(err, 'No pudimos crear el enlace. Intentá de nuevo.'))
    } finally {
      setGuardando(false)
    }
  }

  async function revocar() {
    setGuardando(true)
    setError(null)
    try {
      await adminService.revocarInvitacionPropietario(empresa.id)
      setUrl(null)
      setAviso('Enlace revocado.')
      await cargar()
    } catch (err) {
      setError(mensajeApi(err, 'No pudimos revocar el enlace.'))
    } finally {
      setGuardando(false)
    }
  }

  async function copiar() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setAviso('Enlace copiado.')
    } catch {
      setError('No pudimos copiarlo. Seleccionalo y copialo a mano.')
    }
  }

  function whatsapp() {
    if (!url) {
      setError('Primero generá el enlace.')
      return
    }
    window.open(enlaceWhatsapp(telefono || estado?.telefonoDestino, url, nombre), '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="rounded-xl border border-hc-border bg-hc-surface p-4" data-testid="asignar-propietario">
      <h2 className="text-sm font-semibold">Asignar a un propietario</h2>
      <p className="mt-1 text-xs text-hc-muted">
        Entrá como soporte, cargá bodega y productos, y después mandá este enlace. Quien lo abre se registra o entra y queda como dueño. Es de un solo uso y vence en 7 días.
      </p>
      <p className="mt-2 text-xs font-semibold" data-testid="estado-invitacion">
        {etiquetaEstadoInvitacion(estado?.estado ?? 'NINGUNA', estado?.expiraEn)}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold">
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-hc-border bg-hc-bg px-3 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          WhatsApp
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="50688887777"
            className="mt-1 min-h-11 w-full rounded-xl border border-hc-border bg-hc-bg px-3 text-sm font-normal"
          />
        </label>
      </div>
      {url ? (
        <p className="mt-3 break-all rounded-lg bg-hc-bg px-3 py-2 text-xs" data-testid="url-invitacion">{url}</p>
      ) : null}
      {aviso ? <p className="mt-2 text-xs text-hc-muted">{aviso}</p> : null}
      {error ? <p className="mt-2 text-sm text-hc-primary">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={guardando} className="min-h-11 rounded-xl bg-hc-primary px-4 text-sm font-bold text-white disabled:opacity-60" onClick={() => void generar(Boolean(correo.trim()))}>
          {correo.trim() ? 'Enviar por correo' : 'Crear enlace'}
        </button>
        <button type="button" className="min-h-11 rounded-xl border border-hc-border px-4 text-sm font-semibold" onClick={whatsapp}>
          Enviar por WhatsApp
        </button>
        <button type="button" className="min-h-11 rounded-xl border border-hc-border px-4 text-sm font-semibold" onClick={() => void copiar()}>
          Copiar enlace
        </button>
        <button type="button" disabled={guardando} className="min-h-11 rounded-xl px-4 text-sm font-semibold text-hc-muted" onClick={() => void revocar()}>
          Revocar
        </button>
      </div>
    </section>
  )
}
