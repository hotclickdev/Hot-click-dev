import { IconCheck, IconEdit } from './cargaMasivaIcons'
import type { CargaProgress, CategoriaCarga, ProductoDraft } from './cargaMasivaHelpers'
import type { Id } from '@/types/api'

export type StepResumenProps = {
  drafts: ProductoDraft[]
  categories: CategoriaCarga[]
  onEditar: (idx: number) => void
  onGuardar: () => void
  saving: boolean
  progress: CargaProgress
}

export default function StepResumen({ drafts, categories, onEditar, onGuardar, saving, progress }: StepResumenProps) {
  const catName = (id: Id | string | '') => {
    if (!id) return '—'
    const c = categories.find(x => String(x.id) === String(id))
    return c?.nombreCategoria ?? '—'
  }
  const fmt = (n: string | number) => n ? `₡${Number(n).toLocaleString('es-CR')}` : '—'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
          {drafts.length} producto{drafts.length === 1 ? '' : 's'} listos para guardar
        </p>
        {saving && (
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            Guardando {progress.done} de {progress.total}...
          </p>
        )}
      </div>

      {saving && (
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.round((progress.done / progress.total) * 100)}%`, background: 'var(--hc-accent)' }}
          />
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>#</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Foto</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Categoría</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Precio</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Costo</th>
                <th className="text-right px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Stock</th>
                <th className="text-center px-4 py-3 font-medium text-xs" style={{ color: 'var(--hc-muted)' }}>Fotos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {drafts.map((d, i) => {
                const ok = d.nombre.trim() && Number(d.precioVenta) > 0
                return (
                  <tr
                    key={d.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    className="hover:bg-white/2 transition-colors"
                  >
                    <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <img src={d.mainPreview} alt="" className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ color: ok ? 'var(--hc-text)' : '#f87171' }}>
                        {d.nombre || 'Sin nombre'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--hc-muted)' }}>{catName(d.categoriaId)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--hc-text)' }}>{fmt(d.precioVenta)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--hc-muted)' }}>{fmt(d.precioCompra)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: 'var(--hc-muted)' }}>{d.stock}</td>
                    <td className="px-4 py-3 text-center" style={{ color: 'var(--hc-muted)' }}>
                      {1 + d.extraFiles.length}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button"
                        onClick={() => onEditar(i)}
                        disabled={saving}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/8 disabled:opacity-40"
                        style={{ color: 'var(--hc-accent)' }}
                      >
                        <IconEdit className="w-3.5 h-3.5" />
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button"
          onClick={onGuardar}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'var(--hc-accent)', color: '#fff' }}
        >
          {saving
            ? <>Guardando {progress.done}/{progress.total}...</>
            : <><IconCheck className="w-4 h-4" /> Guardar {drafts.length} producto{drafts.length === 1 ? '' : 's'}</>
          }
        </button>
      </div>
    </div>
  )
}
