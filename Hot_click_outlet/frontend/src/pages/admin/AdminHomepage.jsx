import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/Toast'

const STORAGE_KEY = 'hc-homepage-config'

const DEFAULT_CONFIG = {
  heroSections: ['chat', 'products', 'businesses'],
  visibleCategoryIds: [],
  maxCategories: 8,
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

const HERO_OPTIONS = [
  { id: 'chat',       label: 'Asistente IA',          desc: 'Chat inteligente que ayuda al cliente a encontrar productos',   icon: '🤖' },
  { id: 'products',   label: 'Productos destacados',   desc: 'Muestra los últimos productos marcados como destacados',        icon: '⭐' },
  { id: 'businesses', label: 'Emprendimientos',        desc: 'Muestra los emprendimientos con convenio activo',               icon: '🤝' },
]

export default function AdminHomepage() {
  const toast = useToast()
  const [config, setConfig] = useState(loadConfig)
  const [categories, setCategories] = useState([])
  const [loadingCats, setLoadingCats] = useState(true)

  useEffect(() => {
    import('@/services/api').then(({ default: api }) => {
      api.get('/categorias')
        .then(r => {
          const data = r.data?.data ?? r.data ?? []
          setCategories(Array.isArray(data) ? data : [])
        })
        .catch(() => {})
        .finally(() => setLoadingCats(false))
    })
  }, [])

  function toggleHeroSection(id) {
    setConfig(prev => {
      const has = prev.heroSections.includes(id)
      const next = has
        ? prev.heroSections.filter(s => s !== id)
        : [...prev.heroSections, id]
      if (next.length === 0) return prev
      return { ...prev, heroSections: next }
    })
  }

  function toggleCategory(id) {
    setConfig(prev => {
      const strId = String(id)
      const has = prev.visibleCategoryIds.includes(strId)
      const next = has
        ? prev.visibleCategoryIds.filter(c => c !== strId)
        : [...prev.visibleCategoryIds, strId]
      return { ...prev, visibleCategoryIds: next }
    })
  }

  function handleSave() {
    saveConfig(config)
    toast({ message: 'Configuración del homepage guardada', type: 'success' })
  }

  function handleReset() {
    setConfig({ ...DEFAULT_CONFIG })
    localStorage.removeItem(STORAGE_KEY)
    toast({ message: 'Configuración restablecida a valores por defecto', type: 'success' })
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hc-text)' }}>Homepage</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
            Controlá qué aparece en el carousel y las categorías de la página principal.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="hc-btn hc-btn-outline hc-btn-sm"
          >
            Restablecer
          </button>
          <button
            onClick={handleSave}
            className="hc-btn hc-btn-primary hc-btn-sm"
          >
            Guardar cambios
          </button>
        </div>
      </div>

      {/* ── Sección carousel/hero ── */}
      <section className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--hc-text)' }}>Carousel / Hero</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Seleccioná qué secciones aparecen en el hero rotador. El orden es: IA → Productos → Emprendimientos.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {HERO_OPTIONS.map(opt => {
            const active = config.heroSections.includes(opt.id)
            return (
              <button
                key={opt.id}
                onClick={() => toggleHeroSection(opt.id)}
                className="rounded-xl p-4 text-left transition-all"
                style={{
                  background: active
                    ? 'color-mix(in srgb, var(--hc-accent) 8%, transparent)'
                    : 'var(--hc-surface-2)',
                  border: `1.5px solid ${active
                    ? 'color-mix(in srgb, var(--hc-accent) 30%, transparent)'
                    : 'var(--hc-border)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{opt.icon}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-[var(--hc-accent)]' : 'border-[var(--hc-border)]'}`}
                    style={{ background: active ? 'var(--hc-accent)' : 'transparent' }}>
                    {active && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold" style={{ color: 'var(--hc-text)' }}>{opt.label}</p>
                <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--hc-muted)' }}>{opt.desc}</p>
              </button>
            )
          })}
        </div>

        <p className="text-xs px-1" style={{ color: 'var(--hc-muted)' }}>
          Activo: {config.heroSections.map(id => HERO_OPTIONS.find(o => o.id === id)?.label).filter(Boolean).join(' → ')}
        </p>
      </section>

      {/* ── Categorías visibles en homepage ── */}
      <section className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--hc-text)' }}>Categorías en homepage</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>
            Si no seleccionás ninguna, se muestran automáticamente las 8 categorías con más productos. Seleccioná para fijar cuáles aparecen.
          </p>
        </div>

        {loadingCats ? (
          <div className="flex gap-2 flex-wrap">
            {[...new Array(8)].map((_, i) => (
              <div key={i} className="h-8 w-24 rounded-full animate-pulse" style={{ background: 'var(--hc-border)' }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const id = String(cat.id ?? cat.idCategoria)
              const nombre = cat.nombreCategoria ?? cat.nombre ?? 'Sin nombre'
              const active = config.visibleCategoryIds.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => toggleCategory(id)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: active ? 'color-mix(in srgb, var(--hc-accent) 12%, transparent)' : 'var(--hc-surface-2)',
                    color: active ? 'var(--hc-accent)' : 'var(--hc-muted)',
                    border: `1.5px solid ${active ? 'color-mix(in srgb, var(--hc-accent) 30%, transparent)' : 'var(--hc-border)'}`,
                  }}
                >
                  {active && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                  {nombre}
                </button>
              )
            })}
          </div>
        )}

        {config.visibleCategoryIds.length > 0 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {config.visibleCategoryIds.length} categoría{config.visibleCategoryIds.length === 1 ? '' : 's'} seleccionada{config.visibleCategoryIds.length === 1 ? '' : 's'}
            </p>
            <button
              onClick={() => setConfig(prev => ({ ...prev, visibleCategoryIds: [] }))}
              className="text-xs hover:opacity-70 transition-opacity"
              style={{ color: 'var(--hc-danger)' }}
            >
              Limpiar selección
            </button>
          </div>
        )}
      </section>

      {/* Nota implementación */}
      <div className="rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: 'color-mix(in srgb, var(--hc-accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 20%, transparent)', color: 'var(--hc-muted)' }}>
        <strong style={{ color: 'var(--hc-accent)' }}>Nota:</strong> Los cambios se guardan localmente en este dispositivo. La configuración se aplica al recargar el homepage.
      </div>

    </div>
  )
}
