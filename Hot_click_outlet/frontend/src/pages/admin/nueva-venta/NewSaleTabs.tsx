import { TABS, type TabVentaId } from './nuevaVentaHelpers'
import { BoltIcon, ChatIcon, PersonIcon } from './nuevaVentaIcons'

const TAB_ICONS: Record<TabVentaId, typeof PersonIcon> = {
  cliente: PersonIcon,
  rapida: BoltIcon,
  cotizar: ChatIcon,
}

export default function NewSaleTabs({ tab, onSwitch }: {
  tab: TabVentaId
  onSwitch: (id: TabVentaId) => void
}) {
  return (
    <div className="flex gap-1 bg-[#111114] border border-white/8 rounded-2xl p-1">
      {TABS.map((item) => {
        const Icon = TAB_ICONS[item.id]
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSwitch(item.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${tab === item.id
                ? 'bg-[#4f7cff] text-white shadow-[0_0_12px_rgba(23,71,168,0.35)]'
                : 'text-[#8e8e9a] hover:text-[#e8e8ed] hover:bg-white/5'
              }
            `}
          >
            <Icon />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
