import { useState, useEffect } from 'react'
import { equipoService } from '@/services/equipoService'
import { useToast } from '@/components/ui/Toast'
import { isValidEmail } from '@/utils/validators'
import EquipoInviteForm from './equipo/EquipoInviteForm'
import EquipoMembersTable from './equipo/EquipoMembersTable'
import {
  FORMULARIO_EQUIPO_VACIO,
  ROL_CONFIG,
} from './equipo/equipoHelpers'

export default function AdminEquipo() {
  const toast = useToast()
  const [miembros, setMiembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(FORMULARIO_EQUIPO_VACIO)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [confirmId, setConfirmId] = useState(null)
  const [showPwd, setShowPwd] = useState(false)

  async function obtenerMiembros() {
    const { data } = await equipoService.getAll()
    return data.data ?? []
  }

  function cargar() {
    setLoading(true)
    obtenerMiembros()
      .then(setMiembros)
      .catch(() => toast({ message: 'Error al cargar el equipo', type: 'error' }))
      .finally(() => setLoading(false))
  }

  // Carga inicial una sola vez (toast no debe re-disparar el fetch).
  useEffect(() => {
    let cancelado = false
    obtenerMiembros()
      .then((lista) => { if (!cancelado) setMiembros(lista) })
      .catch(() => { if (!cancelado) toast({ message: 'Error al cargar el equipo', type: 'error' }) })
      .finally(() => { if (!cancelado) setLoading(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido'
    if (!isValidEmail(form.correo)) e.correo = 'Correo inválido'
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    return e
  }

  function patchForm(patch) {
    setForm((s) => ({ ...s, ...patch }))
  }

  async function invitar(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      await equipoService.invitar({
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        password: form.password,
        ...(form.telefono.trim() && { telefono: form.telefono.trim() }),
        rolEnEmpresa: form.rolEnEmpresa,
      })
      toast({
        message: `Miembro agregado como ${ROL_CONFIG[form.rolEnEmpresa]?.label ?? form.rolEnEmpresa}`,
        type: 'success',
      })
      setForm(FORMULARIO_EQUIPO_VACIO)
      setErrors({})
      setShowForm(false)
      cargar()
    } catch (err) {
      toast({ message: err?.response?.data?.message || 'Error al agregar miembro', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function cambiarRol(id, rolEnEmpresa) {
    setSaving(true)
    try {
      await equipoService.cambiarRol(id, rolEnEmpresa)
      toast({
        message: `Rol actualizado a ${ROL_CONFIG[rolEnEmpresa]?.label ?? rolEnEmpresa}`,
        type: 'success',
      })
      setMiembros((prev) => prev.map((m) => (m.id === id ? { ...m, rolEnEmpresa } : m)))
    } catch (err) {
      toast({ message: err?.response?.data?.message || 'Error al cambiar rol', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function eliminar(id) {
    setSaving(true)
    try {
      await equipoService.eliminar(id)
      toast({ message: 'Miembro eliminado del equipo', type: 'success' })
      setConfirmId(null)
      cargar()
    } catch (err) {
      toast({ message: err?.response?.data?.message || 'Error al eliminar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const activos = miembros.filter((m) => m.estado === 1 || m.estado === 2)

  function renderLista() {
    if (loading) {
      return (
        <div className="p-8 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>
          Cargando equipo…
        </div>
      )
    }
    return (
      <EquipoMembersTable
        miembros={activos}
        saving={saving}
        confirmId={confirmId}
        onCambiarRol={cambiarRol}
        onConfirmId={setConfirmId}
        onEliminar={eliminar}
        onAgregar={() => setShowForm(true)}
      />
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--hc-text)' }}>Mi equipo</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Personas que pueden gestionar tu negocio junto a vos
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
        >
          {showForm ? 'Cancelar' : '+ Agregar miembro'}
        </button>
      </div>

      {showForm && (
        <EquipoInviteForm
          form={form}
          errors={errors}
          saving={saving}
          showPwd={showPwd}
          onChange={patchForm}
          onShowPwd={setShowPwd}
          onCancel={() => { setShowForm(false); setErrors({}) }}
          onSubmit={invitar}
        />
      )}

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
        {renderLista()}
      </div>

      <div
        className="rounded-xl px-4 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs"
        style={{
          backgroundColor: 'var(--hc-surface)',
          border: '1px solid var(--hc-border)',
          color: 'var(--hc-muted)',
        }}
      >
        <span><strong style={{ color: 'var(--hc-text)' }}>Editor</strong> — edita productos y pedidos</span>
        <span><strong style={{ color: 'var(--hc-text)' }}>Lector</strong> — solo visualiza, sin cambios</span>
      </div>
    </div>
  )
}
