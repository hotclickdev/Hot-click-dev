import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { asignarService } from '@/services/asignarService'
import { useToast } from '@/components/ui/Toast'
import {
  DEBOUNCE_MS,
  FORM_CLIENTE_VACIO,
  CAMPOS_NUEVO_CLIENTE,
  TABS_CLIENTE,
  ESTILO_INPUT,
  clientesDesdeRespuesta,
} from './asignarHelpers'

/**
 * @param {{ onSelect: (usuario: object) => void }} props
 */
export default function BuscarCliente({ onSelect }) {
  const [q, setQ] = useState('')
  const [resultados, setRes] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [modo, setModo] = useState('buscar')
  const [form, setForm] = useState(FORM_CLIENTE_VACIO)
  const [creando, setCreando] = useState(false)
  const { toast } = useToast()
  const timerRef = useRef(null)

  const buscar = useCallback((valor) => {
    clearTimeout(timerRef.current)
    if (valor.trim().length < 2) { setRes([]); return }
    timerRef.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const { data } = await asignarService.buscarCliente(valor.trim())
        setRes(clientesDesdeRespuesta(data))
      } catch { setRes([]) }
      finally { setBuscando(false) }
    }, DEBOUNCE_MS)
  }, [])

  const handleQ = (e) => { setQ(e.target.value); buscar(e.target.value) }

  const crear = async () => {
    if (!form.nombre.trim()) { toast('El nombre es requerido', 'error'); return }
    if (!form.correo.trim() && !form.telefono.trim()) { toast('Correo o teléfono requerido', 'error'); return }
    setCreando(true)
    try {
      const { data } = await asignarService.crearCliente(form)
      toast('Cliente creado correctamente', 'success')
      onSelect(data?.data ?? data)
    } catch (e) {
      toast(e.response?.data?.message ?? 'Error al crear cliente', 'error')
    } finally { setCreando(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 p-1 rounded-xl" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        {TABS_CLIENTE.map(([key, label]) => (
          <button type="button"
            key={key}
            onClick={() => setModo(key)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: modo === key ? 'var(--hc-accent)' : 'transparent',
              color: modo === key ? '#fff' : 'var(--hc-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {modo === 'buscar' ? (
          <PanelBuscar
            q={q}
            onQ={handleQ}
            buscando={buscando}
            resultados={resultados}
            onSelect={onSelect}
            onCrear={() => setModo('crear')}
          />
        ) : (
          <FormCrearCliente
            form={form}
            onChange={setForm}
            creando={creando}
            onCrear={crear}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function PanelBuscar({ q, onQ, buscando, resultados, onSelect, onCrear }) {
  return (
    <motion.div key="buscar" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={onQ}
          placeholder="Nombre, correo o teléfono…"
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={ESTILO_INPUT}
        />
        {buscando && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        )}
      </div>

      {resultados.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--hc-border)' }}>
          {resultados.map((u) => (
            <button type="button"
              key={u.id}
              onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--hc-surface-2)]"
              style={{ borderBottom: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
                {u.nombre?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{u.nombre} {u.apellidoPaterno}</div>
                <div className="text-xs truncate" style={{ color: 'var(--hc-muted)' }}>
                  {u.correo} {u.telefono ? `· ${u.telefono}` : ''}
                </div>
              </div>
              <svg className="w-4 h-4 shrink-0 ml-auto" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      {q.trim().length >= 2 && !buscando && resultados.length === 0 && (
        <div className="text-sm text-center py-4" style={{ color: 'var(--hc-muted)' }}>
          Sin resultados. Podés{' '}
          <button type="button" onClick={onCrear} className="underline" style={{ color: 'var(--hc-accent)' }}>
            crear el cliente
          </button>.
        </div>
      )}
    </motion.div>
  )
}

function FormCrearCliente({ form, onChange, creando, onCrear }) {
  return (
    <motion.div key="crear" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {CAMPOS_NUEVO_CLIENTE.map(({ key, label, placeholder, type }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) => onChange(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={ESTILO_INPUT}
            />
          </div>
        ))}
      </div>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        * Se requiere correo o teléfono. El cliente puede vincular su cuenta después con Google/Apple.
      </p>
      <button type="button"
        onClick={onCrear}
        disabled={creando}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}
      >
        {creando ? 'Creando…' : 'Crear y seleccionar cliente'}
      </button>
    </motion.div>
  )
}
