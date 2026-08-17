import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import ImageUploadZone from './ImageUploadZone'
import VisionPanel from './VisionPanel'

const MODOS_ANALISIS = [
  { key: 'nombre', label: 'Por nombre' },
  { key: 'foto', label: 'Por foto (Vision API)' },
]

export default function AnalizarTab({
  modoAnalisis,
  onModoAnalisis,
  nombreBusqueda,
  onNombreBusqueda,
  productoId,
  onProductoId,
  productos,
  analizando,
  preview,
  onImagen,
  onAnalizar,
  resultado,
  tc,
  onGuardar,
  guardando,
}) {
  const { t } = useTranslation()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit">
        {MODOS_ANALISIS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onModoAnalisis(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              modoAnalisis === key
                ? 'bg-[#4f7cff] text-white'
                : 'text-[#8e8e9a] hover:text-white'
            }`}
          >{label}</button>
        ))}
      </div>

      {modoAnalisis === 'nombre' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#8e8e9a] block mb-1">{t('admin.publicaciones.product')}</label>
            <input
              type="text"
              value={nombreBusqueda}
              onChange={(e) => onNombreBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAnalizar()}
              placeholder="Ej: iPhone 15 Pro, Tablet Samsung Galaxy..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm placeholder:text-[#8e8e9a]/40 focus:outline-none focus:border-[#4f7cff]/60"
            />
          </div>
          <div>
            <label className="text-xs text-[#8e8e9a] block mb-1">
              Asociar a un producto (guarda precios en BD y genera texto FB)
            </label>
            <select
              value={productoId}
              onChange={(e) => onProductoId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
            >
              <option value="">— Solo buscar, no guardar —</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <Button onClick={onAnalizar} disabled={analizando} className="w-full">
            {analizando
              ? <><Spinner size="sm" /><span className="ml-2">{t('admin.publicaciones.notes')}</span></>
              : t('admin.publicaciones.publish')
            }
          </Button>
        </div>
      )}

      {modoAnalisis === 'foto' && (
        <>
          <ImageUploadZone onFile={onImagen} />
          {preview && (
            <div className="flex gap-4 items-start">
              <img
                src={preview}
                alt="Preview"
                className="w-24 h-24 object-cover rounded-xl border border-white/10 shrink-0"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs text-[#8e8e9a] block mb-1">
                    Asociar a un producto (opcional — guarda precios en BD)
                  </label>
                  <select
                    value={productoId}
                    onChange={(e) => onProductoId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[#e8e8ed] text-sm focus:outline-none focus:border-[#4f7cff]/60"
                  >
                    <option value="">— Solo analizar, no guardar —</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={onAnalizar} disabled={analizando} className="w-full">
                  {analizando
                    ? <><Spinner size="sm" /><span className="ml-2">{t('common.loading')}</span></>
                    : t('admin.publicaciones.markReady')
                  }
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <VisionPanel
        resultado={resultado}
        tc={tc}
        onGuardar={onGuardar}
        saving={guardando}
      />
    </motion.div>
  )
}
