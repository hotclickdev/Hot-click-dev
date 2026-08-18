import {
  HomeIcon, HomeModernIcon, FireIcon, MoonIcon, SparklesIcon, SunIcon, BriefcaseIcon,
  CakeIcon, TruckIcon, Cog6ToothIcon, RectangleGroupIcon, PaintBrushIcon, LightBulbIcon,
  SwatchIcon, BoltIcon, WrenchScrewdriverIcon, PhotoIcon, ArchiveBoxIcon,
  Square3Stack3DIcon, Squares2X2Icon, BuildingLibraryIcon, CloudIcon, GlobeAltIcon,
  FaceSmileIcon, HeartIcon, UserIcon, UserGroupIcon, TagIcon,
} from '@heroicons/react/24/outline'
import { TAG_GROUPS } from './chatTagMapper'

const TAG_ICONS = {
  sala: HomeIcon, cocina: FireIcon, dormitorio: MoonIcon, baño: SparklesIcon,
  jardín: SunIcon, oficina: BriefcaseIcon, comedor: CakeIcon, terraza: HomeModernIcon,
  garaje: TruckIcon, lavandería: Cog6ToothIcon,
  mueble: RectangleGroupIcon, decoración: PaintBrushIcon, iluminación: LightBulbIcon,
  textil: SwatchIcon, electrodoméstico: BoltIcon, herramienta: WrenchScrewdriverIcon,
  arte: PhotoIcon, almacenamiento: ArchiveBoxIcon, colchón: Square3Stack3DIcon, espejo: Squares2X2Icon,
  moderno: SparklesIcon, rústico: FireIcon, minimalista: Square3Stack3DIcon, clásico: BuildingLibraryIcon,
  industrial: Cog6ToothIcon, bohemio: GlobeAltIcon, escandinavo: CloudIcon, tropical: SunIcon,
  niños: FaceSmileIcon, mascotas: HeartIcon, adultos: UserIcon, familia: UserGroupIcon,
  pareja: HeartIcon, soltero: UserIcon, 'oficina en casa': BriefcaseIcon,
}

export default function TagSelector({ value, onChange }) {
  const selected = new Set((value || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean))
  function toggle(tag) {
    const next = new Set(selected)
    next.has(tag) ? next.delete(tag) : next.add(tag)
    onChange([...next].join(','))
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold" style={{ color: 'var(--hc-text)' }}>Tags del chat</label>
        {selected.size > 0 && (
          <button type="button" onClick={() => onChange('')} className="text-[10px] hover:underline" style={{ color: 'var(--hc-muted)' }}>
            Limpiar ({selected.size})
          </button>
        )}
      </div>
      {TAG_GROUPS.map(group => (
        <div key={group.label} className="space-y-1.5">
          <p className="text-[10px] font-medium" style={{ color: 'var(--hc-muted)' }}>{group.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map(tag => {
              const active = selected.has(tag)
              const Icon = TAG_ICONS[tag] || TagIcon
              return (
                <button key={tag} type="button" onClick={() => toggle(tag)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all min-h-[36px]"
                  style={{
                    backgroundColor: active ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                    color: active ? '#fff' : 'var(--hc-muted)',
                    border: active ? '1px solid transparent' : '1px solid var(--hc-border)',
                  }}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <p className="text-[10px]" style={{ color: 'var(--hc-muted)' }}>
        Seleccioná los que mejor describen este producto. El chat los usa para recomendarlo.
        {selected.size > 0 && <span className="ml-1" style={{ color: 'var(--hc-accent)' }}>({selected.size} seleccionados)</span>}
      </p>
    </div>
  )
}
