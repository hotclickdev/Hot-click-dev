import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '@/services/orderService'
import { mensajeApi } from '@/prototipo/compartido/enlaceInvitacion'
import { rutaEspacioEmpresa } from './empresasHelpers'

type Creada = { id?: number | string }

export default function CrearNegocioForm({ onCreada }: { onCreada: () => void }) {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [plan, setPlan] = useState('EMPRENDEDOR')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    setGuardando(true)
    setError(null)
    try {
      const { data } = await adminService.crearEmpresa({
        nombreEmpresa: nombre.trim(),
        correoEmpresa: correo.trim(),
        telefonoEmpresa: telefono.trim(),
        plan,
      })
      const creada = data as Creada
      onCreada()
      if (creada?.id != null) navigate(rutaEspacioEmpresa(creada.id))
    } catch (err) {
      setError(mensajeApi(err, 'No pudimos crear el negocio. Revisá el nombre y el correo.'))
    } finally {
      setGuardando(false)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        className="min-h-11 rounded-xl bg-hc-primary px-4 text-sm font-bold text-white"
        onClick={() => setAbierto(true)}
      >
        Crear negocio
      </button>
    )
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-hc-border bg-hc-surface p-4"
      onSubmit={(e) => {
        e.preventDefault()
        void crear()
      }}
    >
      <p className="text-sm font-semibold">Negocio sin propietario</p>
      <p className="text-xs text-hc-muted">
        Después entrá como soporte para cargar la bodega y los productos, y asignalo con un enlace.
      </p>
      <label className="text-xs font-semibold">
        Nombre
        <input
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-hc-border bg-hc-bg px-3 text-sm font-normal"
        />
      </label>
      <label className="text-xs font-semibold">
        Correo del negocio
        <input
          required
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-hc-border bg-hc-bg px-3 text-sm font-normal"
        />
      </label>
      <label className="text-xs font-semibold">
        Teléfono
        <input
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-hc-border bg-hc-bg px-3 text-sm font-normal"
        />
      </label>
      <label className="text-xs font-semibold">
        Plan
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="mt-1 min-h-11 w-full rounded-xl border border-hc-border bg-hc-bg px-3 text-sm font-normal"
        >
          <option value="EMPRENDEDOR">Emprendedor</option>
          <option value="PYME">PYME</option>
          <option value="NEGOCIO_PLUS">Negocio Plus</option>
        </select>
      </label>
      {error ? <p className="text-sm text-hc-primary">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={guardando} className="min-h-11 flex-1 rounded-xl bg-hc-primary text-sm font-bold text-white disabled:opacity-60">
          {guardando ? 'Creando…' : 'Crear'}
        </button>
        <button type="button" className="min-h-11 rounded-xl border border-hc-border px-4 text-sm font-semibold" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
