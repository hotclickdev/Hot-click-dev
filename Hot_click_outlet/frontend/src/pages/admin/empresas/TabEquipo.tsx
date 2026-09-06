import { useState } from 'react'
import { formatDateShort } from '@/utils/format'
import { PlusIcon, TrashIcon } from './empresasIcons'
import TabEmpty from './TabEmpty'
import TabLoader from './TabLoader'
import {
  ESTADO_COLOR_USUARIO,
  ESTADO_LABEL_USUARIO,
  ROLES_EQUIPO_EDITABLE,
  ROL_CONFIG,
  type EmpresaMiembroTab,
} from './empresasHelpers'
import type { Id } from '@/types/api'

function InvitarMiembroForm({
  saving,
  onInvitar,
}: {
  saving: boolean
  onInvitar: (datos: { nombre: string; correo: string; telefono: string; rolEnEmpresa: string }) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [rolEnEmpresa, setRolEnEmpresa] = useState('EDITOR')
  const inputCls = 'min-h-11 w-full rounded-lg px-3 text-sm'
  const inputStyle = { backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-xs font-semibold"
        style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
      >
        <PlusIcon />
        Invitar miembro
      </button>
    )
  }

  return (
    <div className="p-4 rounded-xl space-y-2" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        Se genera una contraseña temporal y se envía por correo al invitado — no la vas a ver acá.
      </p>
      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre completo"
        className={inputCls}
        style={inputStyle}
      />
      <input
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="Correo del invitado"
        className={inputCls}
        style={inputStyle}
      />
      <input
        type="text"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="Teléfono (opcional)"
        className={inputCls}
        style={inputStyle}
      />
      <select value={rolEnEmpresa} onChange={(e) => setRolEnEmpresa(e.target.value)} className={inputCls} style={inputStyle}>
        {ROLES_EQUIPO_EDITABLE.map((r) => <option key={r} value={r}>{ROL_CONFIG[r]?.label ?? r}</option>)}
      </select>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          disabled={saving || !nombre.trim() || !correo.trim()}
          onClick={() => {
            void onInvitar({ nombre: nombre.trim(), correo: correo.trim(), telefono: telefono.trim(), rolEnEmpresa }).then((ok) => {
              if (ok) { setOpen(false); setNombre(''); setCorreo(''); setTelefono(''); setRolEnEmpresa('EDITOR') }
            })
          }}
          className="min-h-11 px-3 rounded-lg text-xs font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          Enviar invitación
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 px-3 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)', border: '1px solid var(--hc-border)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

function MiembroRow({
  miembro,
  saving,
  onCambiarRol,
  onEliminar,
}: {
  miembro: EmpresaMiembroTab
  saving: boolean
  onCambiarRol: (id: Id, rolEnEmpresa: string) => void
  onEliminar: (id: Id) => void
}) {
  const rol = ROL_CONFIG[miembro.rol ?? '']
  const editable = miembro.rol !== 'PROPIETARIO'
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)' }}>
      <div className="w-9 h-9 rounded-full bg-[#4f7cff]/20 flex items-center justify-center text-sm font-bold text-[#4f7cff] shrink-0">
        {miembro.nombre?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate" style={{ color: 'var(--hc-text)' }}>{miembro.nombre.trim()}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rol?.color ?? 'bg-gray-500/15 text-gray-400'}`}>
            {rol?.label ?? miembro.rol}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_COLOR_USUARIO[miembro.estado ?? -1] ?? ''}`}>
            {ESTADO_LABEL_USUARIO[miembro.estado ?? -1] ?? miembro.estado}
          </span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{miembro.correo}</p>
        {miembro.telefono && miembro.telefono !== '00000000' && (
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{miembro.telefono}</p>
        )}
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>Se unió {formatDateShort(miembro.fechaIngreso)}</p>
        {editable && (
          <div className="flex items-center gap-2 mt-2">
            <select
              value={miembro.rol}
              onChange={(e) => onCambiarRol(miembro.id, e.target.value)}
              disabled={saving}
              className="min-h-9 rounded-lg px-2 text-xs disabled:opacity-50"
              style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            >
              {ROLES_EQUIPO_EDITABLE.map((r) => <option key={r} value={r}>{ROL_CONFIG[r]?.label ?? r}</option>)}
            </select>
            <button
              type="button"
              disabled={saving}
              onClick={() => onEliminar(miembro.id)}
              aria-label="Eliminar del equipo"
              className="p-2 rounded-lg disabled:opacity-50"
              style={{ backgroundColor: 'var(--hc-surface)', color: '#f87171', border: '1px solid var(--hc-border)' }}
            >
              <TrashIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TabEquipo({
  loading,
  equipo,
  savingMiembroId,
  invitando,
  onInvitarMiembro,
  onCambiarRolMiembro,
  onEliminarMiembro,
}: {
  loading: boolean
  equipo: EmpresaMiembroTab[] | null
  savingMiembroId: Id | null
  invitando: boolean
  onInvitarMiembro: (datos: { nombre: string; correo: string; telefono: string; rolEnEmpresa: string }) => Promise<boolean>
  onCambiarRolMiembro: (id: Id, rolEnEmpresa: string) => void
  onEliminarMiembro: (id: Id) => void
}) {
  if (loading) return <TabLoader />
  return (
    <div className="space-y-3">
      <InvitarMiembroForm saving={invitando} onInvitar={onInvitarMiembro} />
      {(!equipo || equipo.length === 0)
        ? <TabEmpty text="Sin miembros de equipo" />
        : equipo.map((m) => (
          <MiembroRow
            key={m.id}
            miembro={m}
            saving={savingMiembroId === m.id}
            onCambiarRol={onCambiarRolMiembro}
            onEliminar={onEliminarMiembro}
          />
        ))}
    </div>
  )
}
