import { useState, useEffect, type ChangeEvent } from 'react'
import { FORM_VACIO } from './plugins/pluginsHelpers'
import type { PluginAdmin, PluginForm as PluginFormState } from './plugins/pluginsHelpers'
import { useAdminPluginsActions } from './plugins/useAdminPluginsActions'
import PluginForm from './plugins/PluginForm'
import PluginsList from './plugins/PluginsList'
import LogModal from './plugins/LogModal'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoMas from '@/components/ui/TextoMas'
import type { Id } from '@/types/api'

export default function AdminPlugins() {
  const [plugins, setPlugins]       = useState<PluginAdmin[]>([])
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando]     = useState<PluginAdmin | null>(null)
  const [form, setForm]             = useState<PluginFormState>(FORM_VACIO)
  const [guardando, setGuardando]   = useState(false)
  const [logPlugin, setLogPlugin]   = useState<PluginAdmin | null>(null)
  const [testOk, setTestOk]         = useState<Id | null>(null)

  const {
    cargar,
    abrirNuevo,
    abrirEdicion,
    guardar,
    desactivar,
    testWebhook,
  } = useAdminPluginsActions({
    editando,
    form,
    setPlugins,
    setCargando,
    setError,
    setMostrarForm,
    setEditando,
    setForm,
    setGuardando,
    setTestOk,
  })

  useEffect(() => { cargar() }, [cargar]) // eslint-disable-line react-hooks/set-state-in-effect -- carga al montar

  const setField = (k: keyof PluginFormState) => (v: string) => setForm(p => ({ ...p, [k]: v }))
  const setStr = (k: keyof PluginFormState) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setField(k)(e.target.value)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--hc-text)' }}>Plugins / Integraciones</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Conecta HotClick con servicios externos via Webhook o iframe embebido
          </p>
        </div>
        <button type="button" onClick={abrirNuevo}
          className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 inline-flex items-center gap-1.5"
          style={{ backgroundColor: 'var(--hc-accent)', color: '#fff' }}>
          <TextoMas>Nuevo plugin</TextoMas>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {mostrarForm && (
        <PluginForm
          editando={editando}
          form={form}
          guardando={guardando}
          onSubmit={guardar}
          onCancel={() => setMostrarForm(false)}
          setStr={setStr}
          setField={setField}
        />
      )}

      {cargando ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--hc-border)', borderTopColor: 'var(--hc-accent)' }} />
        </div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--hc-muted)' }}>
          <div className="flex justify-center mb-3 opacity-40">
            <TrustGlyph tipo="rayo" className="w-10 h-10" />
          </div>
          <p className="font-medium">Sin plugins configurados</p>
          <p className="text-sm mt-1">Agrega un webhook o un iframe para conectar servicios externos</p>
        </div>
      ) : (
        <PluginsList
          plugins={plugins}
          testOk={testOk}
          onTestWebhook={testWebhook}
          onShowLogs={setLogPlugin}
          onEdit={abrirEdicion}
          onDeactivate={desactivar}
        />
      )}

      {logPlugin && <LogModal plugin={logPlugin} onClose={() => setLogPlugin(null)} />}
    </div>
  )
}
