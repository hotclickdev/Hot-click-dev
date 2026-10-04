import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RUTA_AJUSTE, type ExcesoPlan } from './bajarPlanHelpers'

/**
 * Aviso «Todavía no podés bajar a {plan}» (textos-planes-final.md, «Bajar de plan bloqueado»): un bloque por recurso
 * que se pasa y nada se borra. Figma: bloque destacado n50, borde n200, radio 16.
 */
export default function AvisoBajadaBloqueada({
  plan,
  excesos,
  rutaAjuste = RUTA_AJUSTE,
}: {
  plan: string
  excesos: ExcesoPlan[]
  rutaAjuste?: Partial<Record<ExcesoPlan['recurso'], string>>
}) {
  const { t } = useTranslation()
  if (excesos.length === 0) return null
  return (
    <section
      role="alert"
      data-testid="aviso-bajada-bloqueada"
      className="space-y-3 rounded-[16px] border border-[#E4E7EC] bg-[#F8F9FB] p-4 text-[#14171C]"
    >
      <h2 className="font-['Sora',sans-serif] text-[16px] font-bold">{t('planes.bajarBloqueado.titulo', { plan })}</h2>
      <p className="text-[13px] text-[#4D5560]">{t('planes.bajarBloqueado.texto', { plan })}</p>
      <ul className="space-y-2">
        {excesos.map((e) => {
          const ruta = rutaAjuste[e.recurso] ?? RUTA_AJUSTE[e.recurso]
          return (
            <li key={e.recurso} className="rounded-[14px] border border-[#E4E7EC] bg-white p-3">
              <p className="text-[14px] font-semibold">{t(`planes.bajarBloqueado.${e.recurso}.titulo`)}</p>
              <p className="mt-0.5 text-[13px] text-[#4D5560]">
                {t(`planes.bajarBloqueado.${e.recurso}.texto`, { uso: e.uso, limite: e.limite, exceso: e.exceso, plan })}
              </p>
              <BarraUso uso={e.uso} limite={e.limite} etiqueta={t('planes.bloqueo.limite.contador', { uso: e.uso, limite: e.limite })} />
              <Link to={ruta} className="mt-2 inline-block text-[13px] font-semibold text-[#1747A8] underline-offset-2 hover:underline">
                {t(`planes.bajarBloqueado.${e.recurso}.boton`)}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
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
      <p className="mt-1 text-[12px] text-[#4D5560]">{etiqueta}</p>
    </div>
  )
}
