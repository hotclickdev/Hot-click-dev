import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Boton } from '../compartido/ui'
import { useSellerRuta } from '../compartido/SellerPlanContext'
import { equipoService } from '@/services/equipoService'
import { useToast } from '@/components/ui/Toast'
import { isValidEmail } from '@/utils/validators'
import {
  ESTADO_LABEL,
  FORMULARIO_EQUIPO_VACIO,
  ROL_CONFIG,
  ROLES_ASIGNABLES,
  mensajeErrorEquipo,
  type FormularioEquipo,
  type MiembroEquipo,
} from '@/pages/admin/equipo/equipoHelpers'

/**
 * Mi Equipo — PLAN PYME (Figma 305:339 / 352:9116) con API `/empresa/equipo`.
 */
export default function EquipoPage() {
  const ruta = useSellerRuta()
  const toast = useToast()
  const [miembros, setMiembros] = useState<MiembroEquipo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  useEffect(() => {
    let vivo = true
    equipoService.getAll()
      .then(({ data }) => {
        if (!vivo) return
        setMiembros(listaMiembros(data))
        setError(null)
      })
      .catch((err: unknown) => {
        console.error('[EquipoPage]', err)
        if (!vivo) return
        setMiembros([])
        setError('No se pudo cargar el equipo.')
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => { vivo = false }
  }, [])

  const visibles = miembros.filter((m) => m.estado === 1 || m.estado === 5)

  return (
    <main className="px-5 pb-10 pt-8 md:px-12 md:py-12" data-mm="seller-equipo">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link to={ruta('opciones')} className="mb-2 inline-block text-sm font-medium text-hc-primary md:hidden">
            ← Volver
          </Link>
          <h1 className="font-display text-[22px] font-bold md:text-[28px]">Mi Equipo</h1>
          <p className="mt-1 text-xs text-hc-muted md:text-sm">Miembros con acceso a esta tienda</p>
        </div>
        <Boton onClick={() => setMostrarForm(true)}>+ Invitar miembro</Boton>
      </div>

      {cargando ? <p className="mt-4 text-sm text-hc-muted">Cargando equipo…</p> : null}
      {error ? <p className="mt-4 text-sm text-hc-danger">{error}</p> : null}
      {!cargando && visibles.length === 0 ? (
        <p className="mt-6 text-sm text-hc-muted">Todavía no hay miembros invitados.</p>
      ) : null}

      <ul className="mt-6 flex flex-col gap-3">
        {visibles.map((item) => (
          <FilaMiembro key={String(item.id)} miembro={item} />
        ))}
      </ul>

      {mostrarForm ? (
        <FormularioInvitar
          onCerrar={() => setMostrarForm(false)}
          onInvitado={(nuevo) => {
            setMiembros((prev) => [...prev, nuevo])
            setMostrarForm(false)
            toast({ message: 'Miembro invitado', type: 'success' })
          }}
        />
      ) : null}

      <p className="mt-6 hidden text-xs text-hc-muted md:block">
        También desde <a className="font-medium text-hc-primary" href={ruta('opciones')}>Opciones</a>.
      </p>
    </main>
  )
}

function listaMiembros(data: unknown): MiembroEquipo[] {
  const wrapped = data as { data?: MiembroEquipo[] } | null
  return wrapped?.data ?? (Array.isArray(data) ? data as MiembroEquipo[] : [])
}

function FilaMiembro({ miembro }: { miembro: MiembroEquipo }) {
  const nombre = miembro.nombre ?? miembro.correo ?? 'Miembro'
  const letra = nombre.slice(0, 1).toUpperCase()
  const rol = ROL_CONFIG[miembro.rolEnEmpresa ?? '']?.label ?? miembro.rolEnEmpresa ?? '—'
  const estado = ESTADO_LABEL[miembro.estado ?? 1] ?? 'Activo'
  const activo = miembro.estado === 1
  return (
    <li className="flex items-center gap-3 rounded-[10px] border border-hc-border bg-hc-surface p-3.5 md:px-4 md:py-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--hc-n-100)] text-sm font-bold text-hc-muted md:size-12 md:text-base">
        {letra}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold md:text-[15px]">{nombre}</p>
        <p className="text-xs text-hc-muted md:text-[13px]">{rol}</p>
      </div>
      <span
        className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-semibold md:text-xs"
        style={{
          background: activo ? 'var(--hc-success-bg)' : 'var(--hc-n-100)',
          color: activo ? 'var(--hc-success)' : 'var(--hc-muted)',
        }}
      >
        {estado}
      </span>
    </li>
  )
}

function FormularioInvitar({
  onCerrar,
  onInvitado,
}: {
  onCerrar: () => void
  onInvitado: (m: MiembroEquipo) => void
}) {
  const toast = useToast()
  const [form, setForm] = useState<FormularioEquipo>(FORMULARIO_EQUIPO_VACIO)
  const [guardando, setGuardando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!form.nombre.trim() || !isValidEmail(form.correo) || form.password.length < 6) {
      toast({ message: 'Nombre, correo válido y contraseña de 6+ caracteres', type: 'error' })
      return
    }
    setGuardando(true)
    try {
      const { data } = await equipoService.invitar({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        password: form.password,
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
        rolEnEmpresa: form.rolEnEmpresa,
      })
      const creado = (data as { data?: MiembroEquipo })?.data ?? {
        id: Date.now(),
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        rolEnEmpresa: form.rolEnEmpresa,
        estado: 1,
      }
      onInvitado(creado)
    } catch (err: unknown) {
      toast({ message: mensajeErrorEquipo(err, 'Error al agregar miembro'), type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      className="mt-6 space-y-3 rounded-xl border border-hc-border bg-hc-surface p-4 md:max-w-lg"
      onSubmit={(e) => void enviar(e)}
    >
      <p className="text-sm font-semibold">Invitar miembro</p>
      <input
        className="min-h-11 w-full rounded-lg border border-hc-border bg-[#F8F9FB] px-3 text-sm"
        placeholder="Nombre"
        value={form.nombre}
        onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
      />
      <input
        className="min-h-11 w-full rounded-lg border border-hc-border bg-[#F8F9FB] px-3 text-sm"
        placeholder="Correo"
        type="email"
        value={form.correo}
        onChange={(e) => setForm((s) => ({ ...s, correo: e.target.value }))}
      />
      <input
        className="min-h-11 w-full rounded-lg border border-hc-border bg-[#F8F9FB] px-3 text-sm"
        placeholder="Contraseña temporal"
        type="password"
        value={form.password}
        onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
      />
      <select
        className="min-h-11 w-full rounded-lg border border-hc-border bg-[#F8F9FB] px-3 text-sm"
        value={form.rolEnEmpresa}
        onChange={(e) => setForm((s) => ({ ...s, rolEnEmpresa: e.target.value }))}
      >
        {ROLES_ASIGNABLES.map((rol) => (
          <option key={rol} value={rol}>{ROL_CONFIG[rol]?.label ?? rol}</option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        <Boton type="submit">{guardando ? 'Enviando…' : 'Enviar invitación'}</Boton>
        <button type="button" className="min-h-11 px-3 text-sm font-semibold text-hc-muted" onClick={onCerrar}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
