import { formatPrice } from '@/utils/format'
import { motion } from 'framer-motion'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import PriceBar from './PriceBar'
import { FACTOR_PRECIO_SUGERIDO, type ResultadoVision } from './publicacionesHelpers'

type VisionPanelProps = {
  resultado: ResultadoVision | null
  tc: number
  onGuardar?: (() => void) | null
  saving?: boolean
}

export default function VisionPanel({ resultado, tc, onGuardar, saving }: VisionPanelProps) {
  if (!resultado) return null
  const { todasEtiquetas, precios, promedioCrc, error } = resultado
  const max = precios?.length ? Math.max(...precios.map((p) => p.precioCrc)) : 0
  const precioFinal = promedioCrc ? Math.round(promedioCrc * FACTOR_PRECIO_SUGERIDO) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {(todasEtiquetas?.length ?? 0) > 0 && (
        <div>
          <p className="text-xs text-hc-muted mb-2">Producto identificado como:</p>
          <div className="flex flex-wrap gap-1.5">
            {(todasEtiquetas ?? []).slice(0, 6).map((e, i) => (
              <span key={i} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                i === 0
                  ? 'bg-hc-primary/20 text-hc-link border border-hc-primary/30'
                  : 'bg-hc-surface-2 text-hc-muted border border-hc-border'
              }`}>{e}</span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {(precios?.length ?? 0) > 0 ? (
        <div className="rounded-xl bg-hc-surface-2 border border-hc-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-hc-muted uppercase tracking-wide">
              Precios encontrados ({precios?.length} fuentes)
            </p>
            <p className="text-xs text-hc-muted">TC: {formatPrice(tc)}</p>
          </div>
          <div className="space-y-3">
            {(precios ?? []).map((p, i) => (
              <PriceBar key={i} {...p} max={max} />
            ))}
          </div>
          <div className="pt-2 border-t border-hc-border flex items-center justify-between">
            <span className="text-xs text-hc-muted">Promedio CRC</span>
            <span className="text-sm font-semibold text-hc-text">{formatPrice(promedioCrc)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-hc-muted">Precio sugerido final (+IVA+imp+margen)</span>
            <span className="text-base font-bold text-hc-link">{formatPrice(precioFinal)}</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-hc-surface-2 border border-hc-border px-4 py-3 text-sm text-hc-muted">
          No se encontraron precios en las fuentes analizadas.
        </div>
      )}

      {onGuardar && (precios?.length ?? 0) > 0 && (
        <Button onClick={onGuardar} disabled={saving} className="w-full">
          {saving ? <Spinner size="sm" /> : 'Guardar precios y generar texto FB'}
        </Button>
      )}
    </motion.div>
  )
}
