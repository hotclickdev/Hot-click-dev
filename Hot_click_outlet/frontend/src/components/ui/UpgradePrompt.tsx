import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

/** Feature del plan → bloque de copy en `planes.bloqueo.*` (textos-planes-final.md §8). */
const BLOQUEO_POR_FEATURE: Record<string, string> = {
  compras: 'compras',
  giftCards: 'giftCards',
  ai: 'ia',
}

const NOMBRE_FEATURE: Record<string, string> = {
  pos: 'Punto de venta',
  crm: 'Lista de clientes',
  compras: 'Compras a proveedores',
  reportes: 'Reportes de ventas',
  ai: 'Consultas de IA',
  api: 'API y webhooks',
  giftCards: 'Gift cards',
}

function nombrePlan(planRequerido: string): string {
  const p = planRequerido.toUpperCase().replace(/\s+/g, '_')
  if (p === 'NEGOCIO_PLUS' || p === 'ENTERPRISE') return 'Negocio Plus'
  if (p === 'PYME' || p === 'PRO') return 'Pyme'
  return planRequerido
}

function LockIcon({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

/**
 * Bloque que se muestra cuando una función no está en el plan (Figma: bloque destacado, radio 16, sin sombras).
 */
export default function UpgradePrompt({
  feature,
  planRequerido = 'PYME',
  compact = false,
}: {
  feature: string
  planRequerido?: string
  compact?: boolean
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const clave = BLOQUEO_POR_FEATURE[feature]
  const plan = nombrePlan(planRequerido)
  const titulo = clave ? t(`planes.bloqueo.${clave}.titulo`) : (NOMBRE_FEATURE[feature] ?? feature)
  const texto = clave
    ? t(`planes.bloqueo.${clave}.texto`)
    : t('planes.bloqueo.generico.texto', { plan })
  const boton = t('planes.bloqueo.boton')
  const irAPlanes = () => navigate('/admin/billing/planes')

  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-[12px] border border-[#E4E7EC] bg-[#F8F9FB] px-3 py-2 text-sm text-[#4D5560]">
        <LockIcon className="h-4 w-4 shrink-0 text-[#1747A8]" />
        <span><strong className="text-[#14171C]">{titulo}</strong> · {texto}</span>
        <button type="button" onClick={irAPlanes} className="ml-auto font-semibold text-[#1747A8] underline hover:no-underline">
          {boton}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-[#E4E7EC] bg-[#F8F9FB] p-10 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#DEE9FC]">
        <LockIcon className="h-7 w-7 text-[#1747A8]" />
      </div>
      <h3 className="mb-1 font-['Sora',sans-serif] text-lg font-bold text-[#14171C]">{titulo}</h3>
      <p className="mb-6 max-w-xs text-sm text-[#4D5560]">{texto}</p>
      <button type="button" onClick={irAPlanes}
        className="rounded-[12px] bg-[#1747A8] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#123a8a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1747A8] focus-visible:ring-offset-2"
      >
        {boton}
      </button>
    </div>
  )
}
