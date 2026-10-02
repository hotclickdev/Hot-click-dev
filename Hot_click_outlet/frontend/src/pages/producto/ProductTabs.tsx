import type { Producto } from '@/types/producto'
import type { TabProducto } from './productoHelpers'

function lineas(texto: string): string[] {
  return texto.split('\n').filter((l) => l.trim())
}

function SpecsList({ texto }: { texto: string }) {
  return (
    <ul className="flex flex-col gap-3">
      {lineas(texto).map((linea, i) => (
        <li key={i} className="flex items-start gap-3 text-[14px] leading-[21px] text-hc-n-900">
          <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-hc-blue-600" />
          <span>{linea.replace(/^[-•·]\s*/, '')}</span>
        </li>
      ))}
    </ul>
  )
}

function HowToList({ texto }: { texto: string }) {
  return (
    <ol className="flex flex-col gap-4">
      {lineas(texto).map((linea, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-hc-blue-600 text-[12px] font-bold text-hc-n-0">
            {i + 1}
          </span>
          <span className="pt-[2px] text-[14px] leading-[21px] text-hc-n-900">{linea.replace(/^\d+\.\s*/, '')}</span>
        </li>
      ))}
    </ol>
  )
}

type ProductTabsProps = {
  product: Producto
  tabs: TabProducto[]
  activeTab: string | null
  onTabChange: (id: string) => void
}

/** Especificaciones y "Cómo usar": no están en Figma; se conservan con los tokens del diseño de compra. */
export default function ProductTabs({ product, tabs, activeTab, onTabChange }: ProductTabsProps) {
  if (tabs.length === 0) return null

  return (
    <section className="flex flex-col gap-4 pb-6 pt-3 leading-[normal]">
      <div role="tablist" className="flex gap-1 border-b border-hc-n-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`-mb-px border-b-2 px-4 py-3 text-[14px] font-semibold ${
              activeTab === tab.id ? 'border-hc-blue-600 text-hc-n-900' : 'border-transparent text-hc-n-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'especificaciones' && product.especificaciones?.trim() && (
        <div role="tabpanel" className="rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4">
          <SpecsList texto={product.especificaciones} />
        </div>
      )}
      {activeTab === 'como-usar' && product.comoUsar?.trim() && (
        <div role="tabpanel" className="rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4">
          <HowToList texto={product.comoUsar} />
        </div>
      )}
    </section>
  )
}
