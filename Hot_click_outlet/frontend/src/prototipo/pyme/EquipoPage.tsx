import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Boton, Campo } from '../compartido/ui'
import FormularioPorPasos from '../compartido/FormularioPorPasos'
import { useSellerRuta } from '../compartido/SellerPlanContext'
import TarjetaOpcion from '../compartido/motion/TarjetaOpcion'
import PantallaExitoWizard from '../compartido/motion/PantallaExitoWizard'
import EntradaPagina from '../compartido/motion/EntradaPagina'
import EstadoVacioConversacional from '../compartido/motion/EstadoVacioConversacional'
import { ListaStagger, ItemListaStagger } from '../compartido/motion/ListaStagger'
import { EASE_PREMIUM } from '../compartido/motion/formularioMotionTokens'
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
import {
  esMiembroVisibleEnLista,
  mensajeExitoInvitacion,
  nombreVisibleMiembro,
  puedeQuitarMiembro,
} from './equipoConfirmacionHelpers'

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
  const [pendiente, setPendiente] = useState<MiembroEquipo | null>(null)
  const [quitando, setQuitando] = useState(false)

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

  async function confirmarQuitar() {
    if (!pendiente) return
    setQuitando(true)
    try {
      await equipoService.eliminar(pendiente.id)
      setMiembros((prev) => prev.filter((m) => m.id !== pendiente.id))
      setPendiente(null)
      toast({ message: 'Miembro quitado del equipo', type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorEquipo(err, 'No se pudo quitar al miembro'), type: 'error' })
    } finally {
      setQuitando(false)
    }
  }

  const visibles = miembros.filter(esMiembroVisibleEnLista)

  return (
    <main className="px-5 pb-10 pt-8 md:px-12 md:py-12" data-mm="seller-equipo">
      <EntradaPagina>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link to={ruta('opciones')} className="mb-2 inline-block text-sm font-medium text-hc-primary md:hidden">
              ← Volver
            </Link>
            <h1 className="font-display text-[22px] font-bold md:text-[28px]">Mi Equipo</h1>
            <p className="mt-1 text-xs text-hc-muted md:text-sm">Miembros con acceso a esta tienda</p>
          </div>
          {!pendiente ? (
            <Boton onClick={() => setMostrarForm(true)}>+ Invitar miembro</Boton>
          ) : null}
        </div>

        {pendiente ? (
          <div className="mt-6 md:max-w-lg">
            <ConfirmacionQuitarMiembro
              miembro={pendiente}
              guardando={quitando}
              onConfirmar={() => void confirmarQuitar()}
              onCancelar={() => setPendiente(null)}
            />
          </div>
        ) : (
          <>
            {cargando ? <p className="mt-4 text-sm text-hc-muted">Cargando equipo…</p> : null}
            {error ? <p className="mt-4 text-sm text-hc-danger">{error}</p> : null}
            {!cargando && visibles.length === 0 && !error ? (
              <EstadoVacioConversacional
                titulo="Todavía no hay miembros"
                mensaje="Invitá a tu equipo para que entren a esta tienda."
              />
            ) : null}

            {visibles.length > 0 ? (
              <ListaStagger className="mt-6 flex flex-col gap-3">
                {visibles.map((item) => (
                  <ItemListaStagger key={String(item.id)}>
                    <FilaMiembro
                      miembro={item}
                      onPedirQuitar={() => {
                        setMostrarForm(false)
                        setPendiente(item)
                      }}
                    />
                  </ItemListaStagger>
                ))}
              </ListaStagger>
            ) : null}

            {mostrarForm ? (
              <FormularioInvitar
                onCerrar={() => setMostrarForm(false)}
                onInvitado={(nuevo) => {
                  setMiembros((prev) => [...prev, nuevo])
                  setMostrarForm(false)
                }}
              />
            ) : null}

            <p className="mt-6 hidden text-xs text-hc-muted md:block">
              También desde <a className="font-medium text-hc-primary" href={ruta('opciones')}>Opciones</a>.
            </p>
          </>
        )}
      </EntradaPagina>
    </main>
  )
}

function listaMiembros(data: unknown): MiembroEquipo[] {
  const wrapped = data as { data?: MiembroEquipo[] } | null
  return wrapped?.data ?? (Array.isArray(data) ? data as MiembroEquipo[] : [])
}

type ConfirmacionQuitarProps = Readonly<{
  miembro: MiembroEquipo
  guardando: boolean
  onConfirmar: () => void
  onCancelar: () => void
}>

function ConfirmacionQuitarMiembro({ miembro, guardando, onConfirmar, onCancelar }: ConfirmacionQuitarProps) {
  const nombre = nombreVisibleMiembro(miembro)
  const rol = ROL_CONFIG[miembro.rolEnEmpresa ?? '']?.label ?? miembro.rolEnEmpresa ?? '—'
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-hc-border bg-hc-surface p-4">
      <p className="text-sm font-semibold text-hc-text">{nombre}</p>
      <p className="text-[13px] text-hc-muted">{rol}</p>
      <p className="text-sm text-hc-muted">
        ¿Quitás a esta persona del equipo? Ya no podrá entrar a esta tienda.
      </p>
      <CtaConfirmacion
        variante="peligro"
        disabled={guardando}
        onClick={onConfirmar}
      >
        {guardando ? 'Quitando…' : 'Sí, quitar del equipo'}
      </CtaConfirmacion>
      <CtaConfirmacion
        variante="contorno"
        disabled={guardando}
        onClick={onCancelar}
      >
        Cancelar
      </CtaConfirmacion>
    </div>
  )
}

type CtaConfirmacionProps = Readonly<{
  children: string
  variante: 'peligro' | 'contorno'
  disabled?: boolean
  onClick: () => void
}>

function CtaConfirmacion({ children, variante, disabled = false, onClick }: CtaConfirmacionProps) {
  const reduced = useReducedMotion() ?? false
  const estilos =
    variante === 'peligro'
      ? 'bg-hc-primary text-white disabled:opacity-60'
      : 'border border-hc-border bg-hc-surface text-hc-text disabled:opacity-40'
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-center rounded-[14px] px-4 py-3 text-sm font-bold disabled:pointer-events-none ${estilos}`}
      whileHover={reduced || disabled ? undefined : { y: -2 }}
      whileTap={reduced || disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.2, ease: EASE_PREMIUM }}
    >
      {children}
    </motion.button>
  )
}

function FilaMiembro({
  miembro,
  onPedirQuitar,
}: {
  miembro: MiembroEquipo
  onPedirQuitar: () => void
}) {
  const nombre = nombreVisibleMiembro(miembro)
  const letra = nombre.slice(0, 1).toUpperCase()
  const rol = ROL_CONFIG[miembro.rolEnEmpresa ?? '']?.label ?? miembro.rolEnEmpresa ?? '—'
  const estado = ESTADO_LABEL[miembro.estado ?? 1] ?? 'Activo'
  const activo = miembro.estado === 1
  const quitable = puedeQuitarMiembro(miembro)
  return (
    <article className="flex items-center gap-3 rounded-[10px] border border-hc-border bg-hc-surface p-3.5 md:px-4 md:py-3">
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
      {quitable ? (
        <button
          type="button"
          onClick={onPedirQuitar}
          className="min-h-11 shrink-0 px-2 text-xs font-semibold text-hc-danger"
        >
          Quitar
        </button>
      ) : null}
    </article>
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
  const [miembroCreado, setMiembroCreado] = useState<MiembroEquipo | null>(null)
  const idPaso = PASOS_INVITAR_EQUIPO[paso]?.id

  function setCampo<K extends keyof FormularioEquipo>(clave: K, valor: FormularioEquipo[K]) {
    setForm((prev) => ({ ...prev, [clave]: valor }))
  }

  function resetearFormulario() {
    setPaso(0)
    setForm(FORMULARIO_EQUIPO_VACIO)
    setGuardando(false)
    setMiembroCreado(null)
  }

  function cerrarTrasExito() {
    if (!miembroCreado) return
    const creado = miembroCreado
    resetearFormulario()
    onInvitado(creado)
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
      const envoltorio = data as { data?: MiembroEquipo } | null
      const creado = envoltorio?.data ?? {
        id: Date.now(),
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        rolEnEmpresa: form.rolEnEmpresa,
        estado: 1,
      }
      setMiembroCreado(creado)
    } catch (err: unknown) {
      toast({ message: mensajeErrorEquipo(err, 'Error al agregar miembro'), type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  if (miembroCreado) {
    return (
      <div className="mt-6 rounded-xl border border-hc-border bg-hc-surface p-4 md:max-w-lg">
        <PantallaExitoWizard
          titulo="Invitación enviada"
          mensaje={mensajeExitoInvitacion(miembroCreado.nombre)}
          accion={
            <Boton onClick={cerrarTrasExito}>
              Volver a la lista
            </Boton>
          }
        />
      </div>
    )
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
                <TarjetaOpcion
                  key={rol}
                  titulo={config?.label ?? rol}
                  ayuda={config?.desc ?? ''}
                  seleccionado={seleccionado}
                  atenuar={!seleccionado}
                  checkLayoutId="equipo-rol-check"
                  onSelect={() => setCampo('rolEnEmpresa', rol)}
                />
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
        className="mt-3 min-h-11 w-full text-sm font-semibold text-hc-muted transition-opacity hover:opacity-80"
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
