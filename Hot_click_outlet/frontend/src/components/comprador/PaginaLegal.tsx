import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PaginaInformativa, { BloqueInformativo } from './PaginaInformativa'

export type SeccionLegal = { id: string; num: string; title: string; content: ReactNode }
export type EnlaceLegal = { to: string; texto: string }

type PaginaLegalProps = {
  /** Barra interna móvil ("Privacidad"). */
  titulo: string
  /** Título grande de la introducción ("Política de Privacidad"). */
  encabezado: string
  /** Marco legal y fecha: "Ley N.° 8968 · Costa Rica · Actualizada el 5 de junio de 2025". */
  subtitulo: string
  intro?: ReactNode
  secciones: SeccionLegal[]
  /** Bloques extra después de las secciones (por ejemplo, la tabla de cookies). */
  anexo?: ReactNode
  pregunta: string
  correo: string
  enlaces: EnlaceLegal[]
}

/** Texto legal con los tokens de compra: 14/21 en n/600, listas con viñeta y enlaces en blue/600. */
const CLASE_TEXTO_LEGAL =
  'text-[14px] leading-[21px] text-hc-n-600 [&_a]:font-semibold [&_a]:text-hc-blue-600 [&_li]:mb-1 [&_p:last-child]:mb-0 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-hc-n-900 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5'

/** Tarjeta de un bloque legal (borde n/200, radio 16, como las tarjetas de `28:1660`). */
export function TarjetaLegal({ etiqueta, children }: { etiqueta?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-hc-n-200 bg-hc-n-0 p-[14px]">
      {etiqueta && <p className="text-[11px] font-semibold uppercase leading-[normal] tracking-[0.06em] text-hc-n-500">{etiqueta}</p>}
      <div className={CLASE_TEXTO_LEGAL}>{children}</div>
    </div>
  )
}

/**
 * Páginas legales (Privacidad, Términos, Cookies, Acuerdo) sobre la plantilla informativa de Figma `28:1660`:
 * intro, índice en chips, un bloque por sección y una tarjeta final de consulta. Derivado de Figma: la nota del
 * frame pide esta misma estructura para Términos y Privacidad.
 */
export default function PaginaLegal({ titulo, encabezado, subtitulo, intro, secciones, anexo, pregunta, correo, enlaces }: PaginaLegalProps) {
  return (
    <PaginaInformativa
      titulo={titulo}
      encabezado={encabezado}
      subtitulo={subtitulo}
      indice={secciones.map((s) => ({ id: s.id, texto: s.title }))}
      indiceEnFila
    >
      <div className="flex flex-col bg-hc-n-50 pb-8 lg:bg-transparent">
        {intro && (
          <div className="px-4 pt-[18px] lg:px-0">
            <TarjetaLegal>{intro}</TarjetaLegal>
          </div>
        )}
        {secciones.map((s) => (
          <BloqueInformativo key={s.id} id={s.id} titulo={s.title}>
            <TarjetaLegal etiqueta={s.num}>{s.content}</TarjetaLegal>
          </BloqueInformativo>
        ))}
        {anexo}
        <section className="px-4 pt-[18px] lg:px-0">
          <div className="flex flex-col gap-3 rounded-2xl bg-hc-blue-50 p-[14px] leading-[normal]">
            <p className="text-[14px] font-semibold text-hc-n-900">{pregunta}</p>
            <a href={`mailto:${correo}`} className="text-[14px] font-semibold text-hc-blue-600">{correo}</a>
            <nav aria-label="Más información legal" className="flex flex-wrap gap-2">
              {enlaces.map((e) => (
                <Link
                  key={e.to}
                  to={e.to}
                  className="rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-n-900"
                >
                  {e.texto}
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </div>
    </PaginaInformativa>
  )
}
