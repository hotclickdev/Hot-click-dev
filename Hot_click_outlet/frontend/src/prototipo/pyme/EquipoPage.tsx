import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Boton, Campo } from '../compartido/ui'
import FormularioPorPasos from '../compartido/FormularioPorPasos'
import { useSellerRuta } from '../compartido/SellerPlanContext'
import { equipoService } from '@/services/equipoService'
import { useToast } from '@/components/ui/Toast'
import {
  ESTADO_LABEL,
  FORMULARIO_EQUIPO_VACIO,
  ROL_CONFIG,
  ROLES_ASIGNABLES,
  generatePassword,
  mensajeErrorEquipo,
  type FormularioEquipo,
  type MiembroEquipo,
} from '@/pages/admin/equipo/equipoHelpers'
import { PASOS_INVITAR_EQUIPO, validarPasoInvitarEquipo } from './equipoPasos'

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
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState<FormularioEquipo>(FORMULARIO_EQUIPO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const idPaso = PASOS_INVITAR_EQUIPO[paso]?.id

  function setCampo<K extends keyof FormularioEquipo>(clave: K, valor: FormularioEquipo[K]) {
    setForm((prev) => ({ ...prev, [clave]: valor }))
  }

  async function enviar() {
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
    <div className="mt-6 rounded-xl border border-hc-border bg-hc-surface p-4 md:max-w-lg">
      <p className="mb-4 text-sm font-semibold">Invitar miembro</p>
      <FormularioPorPasos
        pasos={PASOS_INVITAR_EQUIPO}
        pasoActual={paso}
        onPasoChange={setPaso}
        validarPaso={(i) => validarPasoInvitarEquipo(i, form)}
        onFinalizar={enviar}
        etiquetaFinal="Enviar invitación"
        enviando={guardando}
      >
        {idPaso === 'persona' ? (
          <Campo
            etiqueta="Nombre completo"
            value={form.nombre}
            onChange={(v) => setCampo('nombre', v)}
            placeholder="Ej. María González"
          />
        ) : null}
        {idPaso === 'contacto' ? (
          <>
            <Campo
              etiqueta="Correo"
              type="email"
              value={form.correo}
              onChange={(v) => setCampo('correo', v)}
              placeholder="correo@ejemplo.com"
            />
            <Campo
              etiqueta="Teléfono (opcional)"
              type="tel"
              value={form.telefono}
              onChange={(v) => setCampo('telefono', v)}
              placeholder="8888-0000"
            />
            <Campo
              etiqueta="Contraseña temporal"
              type="password"
              value={form.password}
              onChange={(v) => setCampo('password', v)}
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              className="text-xs font-semibold text-hc-primary"
              onClick={() => setCampo('password', generatePassword())}
            >
              Generar contraseña segura
            </button>
          </>
        ) : null}
        {idPaso === 'rol' ? (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Rol en la tienda">
            {ROLES_ASIGNABLES.map((rol) => {
              const config = ROL_CONFIG[rol]
              const seleccionado = form.rolEnEmpresa === rol
              return (
                <button
                  key={rol}
                  type="button"
                  role="radio"
                  aria-checked={seleccionado}
                  onClick={() => setCampo('rolEnEmpresa', rol)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    seleccionado ? 'border-hc-primary bg-[var(--hc-red-50)]' : 'border-hc-border bg-hc-surface'
                  }`}
                >
                  <span className="block text-[15px] font-bold text-hc-text">{config?.label ?? rol}</span>
                  <span className="mt-1 block text-xs text-hc-muted">{config?.desc ?? ''}</span>
                </button>
              )
            })}
          </div>
        ) : null}
        {idPaso === 'confirmar' ? (
          <ResumenInvitacion form={form} />
        ) : null}
      </FormularioPorPasos>
      <button
        type="button"
        className="mt-3 min-h-11 w-full text-sm font-semibold text-hc-muted"
        onClick={onCerrar}
        disabled={guardando}
      >
        Cancelar
      </button>
    </div>
  )
}

function ResumenInvitacion({ form }: { form: FormularioEquipo }) {
  const rol = ROL_CONFIG[form.rolEnEmpresa]?.label ?? form.rolEnEmpresa
  return (
    <div className="rounded-xl border border-hc-border bg-[#F8F9FB] p-4 text-sm">
      <p className="font-semibold text-hc-text">{form.nombre.trim()}</p>
      <p className="mt-1 text-hc-muted">{form.correo.trim()}</p>
      {form.telefono.trim() ? <p className="mt-1 text-hc-muted">{form.telefono.trim()}</p> : null}
      <p className="mt-3 text-xs font-medium text-hc-muted">
        Rol: <span className="text-hc-text">{rol}</span>
      </p>
      <p className="mt-2 text-xs text-hc-muted">
        Recibirá acceso con la contraseña temporal que definiste.
      </p>
    </div>
  )
}
