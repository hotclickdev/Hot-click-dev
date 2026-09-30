import { textoAccion, textoDespues } from './caidaEmbudo'
import type { ResumenEmbudo } from '@/services/embudoService'

export default function EmbudoAccion({ resumen }: { resumen: ResumenEmbudo }) {
  const accion = textoAccion(resumen)
  return (
    <section className="rounded-2xl border border-hc-border bg-hc-surface p-4 space-y-3">
      <h2 className="font-semibold text-hc-text">{accion.titulo}</h2>
      <p className="text-sm text-hc-text leading-relaxed">{accion.cuerpo}</p>
      <p className="text-sm text-hc-text leading-relaxed">{textoDespues(resumen)}</p>
    </section>
  )
}
