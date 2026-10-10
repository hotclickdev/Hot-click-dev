import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  /** Acción extra en la tarjeta de consulta, debajo del correo (p. ej. WhatsApp de soporte en Devoluciones). */
  accion?: ReactNode
  enlaces: EnlaceLegal[]
}

/** Texto legal con los tokens de compra: 14/21 en n/600, listas con viñeta y enlaces en blue/600. */
const CLASE_TEXTO_LEGAL =
  'text-[16px] leading-[26px] text-hc-n-600 lg:text-[17px] lg:leading-[28px] [&_a]:font-semibold [&_a]:text-hc-blue-600 [&_li]:mb-1 [&_p:last-child]:mb-0 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-hc-n-900 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5'

/** Tarjeta de un bloque legal (borde n/200, radio 16, como las tarjetas de `28:1660`). */
export function TarjetaLegal({ etiqueta, children }: { etiqueta?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-hc-n-200 bg-hc-n-0 p-[14px]">
      {etiqueta && <p className="text-[11px] font-semibold uppercase leading-[normal] tracking-[0.06em] text-hc-n-600">{etiqueta}</p>}
      <div className={CLASE_TEXTO_LEGAL}>{children}</div>
    </div>
  )
}

/**
 * Páginas legales (Privacidad, Términos, Cookies, Acuerdo) sobre la plantilla informativa de Figma `28:1660`:
 * intro, índice en chips, un bloque por sección y una tarjeta final de consulta. Derivado de Figma: la nota del
 * frame pide esta misma estructura para Términos y Privacidad.
 */
/** «En resumen» queda oculto hasta que Legal apruebe el texto de cada página (boceto demo-0410 · 04). */
const RESUMEN_APROBADO = false

function irA(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' })
  el.focus({ preventScroll: true })
}

/** Sección visible (scroll-spy) para «Índice · n de N» y `aria-current`. */
function useSeccionActiva(ids: string[]): number {
  const [activa, setActiva] = useState(0)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((entradas) => {
      const visible = entradas.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0]
      if (visible) setActiva(Math.max(0, ids.indexOf(visible.target.id)))
    }, { rootMargin: '-80px 0px -60% 0px' })
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [ids])
  return activa
}

function ListaIndice({ secciones, activa, onElegir }: { secciones: SeccionLegal[]; activa: number; onElegir: (id: string) => void }) {
  return (
    <ol className="flex flex-col">
      {secciones.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            aria-current={i === activa ? 'location' : undefined}
            onClick={() => onElegir(s.id)}
            className={`flex min-h-[44px] w-full items-center rounded-[10px] px-3 text-left text-[14px] ${i === activa ? 'bg-hc-blue-50 font-semibold text-hc-blue-600' : 'text-hc-n-900'}`}
          >
            {s.title}
          </button>
        </li>
      ))}
    </ol>
  )
}

/** Hoja inferior con el índice en móvil: foco atrapado, Esc cierra y devuelve el foco. */
function HojaIndice({ abierta, onCerrar, children }: { abierta: boolean; onCerrar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!abierta) return
    const previo = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('button')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      if (e.key !== 'Tab' || !ref.current) return
      const f = ref.current.querySelectorAll<HTMLElement>('button')
      if (f.length === 0) return
      const primero = f[0]
      const ultimo = f[f.length - 1]
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus() }
    }
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('keydown', tecla); previo?.focus() }
  }, [abierta, onCerrar])
  if (!abierta) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="Cerrar índice" className="absolute inset-0 bg-hc-n-900/40" onClick={onCerrar} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Índice" className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto rounded-t-[20px] bg-hc-n-0 px-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-3">
        {children}
      </div>
    </div>
  )
}

export default function PaginaLegal({ titulo, encabezado, subtitulo, intro, secciones, anexo, pregunta, correo, accion, enlaces }: PaginaLegalProps) {
  const clave = secciones.map((s) => s.id).join('|')
  const ids = useMemo(() => clave.split('|'), [clave])
  const activa = useSeccionActiva(ids)
  const [hoja, setHoja] = useState(false)
  const elegir = (id: string) => { setHoja(false); irA(id) }
  return (
    <PaginaInformativa
      titulo={titulo}
      encabezado={encabezado}
      subtitulo={`${subtitulo} · ${secciones.length} secciones`}
      ancha
    >
      <div className="lg:grid lg:grid-cols-[240px_minmax(0,720px)] lg:items-start lg:gap-10">
      <nav aria-label="Índice" className="sticky top-16 z-10 border-b border-hc-n-200 bg-hc-n-0 px-4 py-2 lg:top-24 lg:mt-[18px] lg:rounded-[16px] lg:border lg:p-2">
        <button type="button" onClick={() => setHoja(true)} aria-expanded={hoja} className="flex min-h-[44px] w-full items-center justify-between text-[14px] font-semibold text-hc-n-900 lg:hidden">
          <span>Índice · {activa + 1} de {secciones.length}</span>
          <span aria-hidden>▾</span>
        </button>
        <div className="hidden lg:block"><ListaIndice secciones={secciones} activa={activa} onElegir={irA} /></div>
      </nav>
      <HojaIndice abierta={hoja} onCerrar={() => setHoja(false)}>
        <ListaIndice secciones={secciones} activa={activa} onElegir={elegir} />
      </HojaIndice>
      <div className="flex flex-col bg-hc-n-50 pb-8 lg:bg-transparent">
        {/* [REVISIÓN LEGAL] Aviso visible hasta que un abogado valide el texto. TODO copy Producto. */}
        <div className="px-4 pt-[18px] lg:px-0">
          <p role="note" className="rounded-2xl border border-hc-n-200 bg-hc-n-0 px-[14px] py-3 text-[12px] leading-[18px] text-hc-n-600">
            <strong className="font-semibold text-hc-n-900">[REVISIÓN LEGAL]</strong> Este texto está en revisión. Si tenés dudas sobre un caso puntual, escribinos antes de comprar.
          </p>
        </div>
        {RESUMEN_APROBADO && intro && (
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
            {accion}
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
        <div className="flex justify-end px-4 pt-4 lg:px-0">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
            aria-label="Volver arriba"
            className="flex size-11 items-center justify-center rounded-full border border-hc-n-200 bg-hc-n-0 text-[18px] text-hc-n-900"
          >
            ↑
          </button>
        </div>
      </div>
      </div>
    </PaginaInformativa>
  )
}
