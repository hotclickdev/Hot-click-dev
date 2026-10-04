import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { nombresRecursos, RUTA_AJUSTE, type ExcesoPlan, type RecursoPlan } from './bajarPlanHelpers'

type Props = Readonly<{
  plan: string
  excesos: ExcesoPlan[]
  rutaAjuste?: Partial<Record<RecursoPlan, string>>
  /** Recursos que ya entran en el plan destino; se agrupan en una sola línea con check. */
  entran?: RecursoPlan[]
}>

/** Ir a ajustar: en celular botón secundario de 48 px; en escritorio sigue siendo el enlace de siempre. */
const CLASE_IR_A_AJUSTAR = [
  'mt-2 text-[13px] font-semibold',
  'md:inline-block md:text-[#1747A8] md:underline-offset-2 md:hover:underline',
  'max-md:mt-3 max-md:flex max-md:min-h-12 max-md:w-full max-md:items-center max-md:justify-between',
  'max-md:rounded-[14px] max-md:border max-md:border-[#E4E7EC] max-md:bg-white max-md:px-4 max-md:text-[#14171C]',
].join(' ')

/**
 * Aviso «Todavía no podés bajar a {plan}» (textos-planes-final.md, «Bajar de plan bloqueado»): un bloque por recurso
 * que se pasa y nada se borra. Figma: bloque destacado n50, borde n200, radio 16.
 */
export default function AvisoBajadaBloqueada({ plan, excesos, rutaAjuste = RUTA_AJUSTE, entran = [] }: Props) {
  const { t } = useTranslation()
  if (excesos.length === 0) return null
  return (
    <section
      aria-live="polite"
      data-testid="aviso-bajada-bloqueada"
      className="space-y-3 rounded-[16px] border border-[#E4E7EC] bg-[#F8F9FB] p-4 text-[#14171C]"
    >
      <h2 className="font-['Sora',sans-serif] text-[16px] font-bold">{t('planes.bajarBloqueado.titulo', { plan })}</h2>
      <p className="text-[13px] text-[#4D5560]">{t('planes.bajarBloqueado.texto', { plan })}</p>
      <ul className="space-y-2">
        {excesos.map((e) => (
          <li key={e.recurso} className="rounded-[14px] border border-[#E4E7EC] bg-white p-3">
            <BloqueRecurso exceso={e} plan={plan} ruta={rutaAjuste[e.recurso] ?? RUTA_AJUSTE[e.recurso]} />
          </li>
        ))}
      </ul>
      {entran.length > 0 ? <LineaQueYaEntra recursos={entran} plan={plan} /> : null}
    </section>
  )
}

function BloqueRecurso({ exceso, plan, ruta }: { exceso: ExcesoPlan; plan: string; ruta: string }) {
  const { t } = useTranslation()
  const contador = t('planes.bloqueo.limite.contador', { uso: exceso.uso, limite: exceso.limite })
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-semibold">{t(`planes.bajarBloqueado.${exceso.recurso}.titulo`)}</p>
        <p className="text-[13px] font-semibold text-[#E73B33] md:hidden">{contador}</p>
      </div>
      <p className="mt-0.5 text-[13px] text-[#4D5560]">{textoRecurso(exceso, plan, t)}</p>
      <BarraUso uso={exceso.uso} limite={exceso.limite} etiqueta={contador} />
      <Link to={ruta} className={CLASE_IR_A_AJUSTAR}>
        {t(`planes.bajarBloqueado.${exceso.recurso}.boton`)}
        <span aria-hidden className="md:hidden">›</span>
      </Link>
    </>
  )
}

/** El texto de cajas en los idiomas sigue [PENDIENTE]: hasta que Producto lo defina se usa uno provisorio. */
function textoRecurso(exceso: ExcesoPlan, plan: string, t: (clave: string, valores?: Record<string, unknown>) => string): string {
  if (exceso.recurso === 'cajas') {
    // TODO copy Producto
    return `Tenés ${exceso.uso} cajas abiertas y ${plan} permite ${exceso.limite}. Cerrá ${exceso.exceso}.`
  }
  return t(`planes.bajarBloqueado.${exceso.recurso}.texto`, { uso: exceso.uso, limite: exceso.limite, exceso: exceso.exceso, plan })
}

function LineaQueYaEntra({ recursos, plan }: { recursos: RecursoPlan[]; plan: string }) {
  return (
    <p className="flex items-start gap-2 rounded-[14px] border border-[#E4E7EC] bg-white p-3 text-[13px] text-[#4D5560] md:hidden">
      <span aria-hidden className="font-bold text-[#178A50]">✓</span>
      {/* TODO copy Producto */}
      <span>{`${nombresRecursos(recursos)} ya entran en ${plan}.`}</span>
    </p>
  )
}

/** Vista rápida del exceso: barra n100 con el tramo permitido en azul y el excedente en rojo (sin degradados). */
function BarraUso({ uso, limite, etiqueta }: { uso: number; limite: number; etiqueta: string }) {
  const permitido = uso > 0 ? Math.min(100, Math.round((limite / uso) * 100)) : 100
  return (
    <div className="mt-2" aria-label={etiqueta} role="img">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#F1F3F6]">
        <span className="h-full bg-[#1747A8]" style={{ width: `${permitido}%` }} />
        <span className="h-full bg-[#E73B33]" style={{ width: `${100 - permitido}%` }} />
      </div>
      <p className="mt-1 text-[12px] text-[#4D5560] max-md:hidden">{etiqueta}</p>
    </div>
  )
}
