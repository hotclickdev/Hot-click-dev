import { useState, type ReactNode } from 'react'
import MainLayout from '@/layouts/MainLayout'
import Chip from './Chip'
import HojaInferior from './HojaInferior'
import type { DestinoAtras } from './header/tiposHeader'

export type EntradaIndice = { id: string; texto: string }

type PaginaInformativaProps = {
  /** Título de la barra interna móvil (Figma `28:1665`: "Envíos"). */
  titulo: string
  /** Título grande de la introducción (Figma `28:1667`). Sin valor, solo se ve en escritorio. */
  encabezado?: string
  subtitulo?: string
  /** Índice en chips: cada entrada lleva al bloque con ese `id` (Figma `28:1669`). */
  indice?: EntradaIndice[]
  atras?: DestinoAtras
  /** Índice en una sola fila desplazable (páginas legales con muchas secciones; derivado de `28:1669`). */
  indiceEnFila?: boolean
  /** En celular, un chip «Secciones» abre el índice en una hoja (D2-24). */
  indiceEnHoja?: boolean
  children: ReactNode
}

function irAlBloque(id: string) {
  const bloque = document.getElementById(id)
  if (!bloque) return
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  bloque.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' })
}

/**
 * Plantilla de páginas informativas del comprador (Figma `28:1660`): barra interna, introducción con índice en
 * chips, bloques (`BloqueInformativo`) y preguntas frecuentes. Envíos la usa hoy; Devoluciones, Contacto,
 * Términos y Privacidad pueden adoptarla con la misma estructura.
 */
export default function PaginaInformativa({ titulo, encabezado, subtitulo, indice, atras, indiceEnFila = false, indiceEnHoja = false, children }: PaginaInformativaProps) {
  return (
    <MainLayout variante="interna" titulo={titulo} atras={atras}>
      <div className="flex flex-col leading-[normal] lg:mx-auto lg:w-full lg:max-w-[672px]">
        <section className="flex flex-col gap-[6px] bg-hc-n-0 px-4 pb-4 pt-[18px] lg:mt-6 lg:rounded-[16px] lg:pt-6">
          <h1 className={encabezado ? 'leading-[normal] font-display text-[22px] font-bold text-hc-n-900 [text-wrap:balance]' : 'leading-[normal] sr-only font-display text-[22px] font-bold text-hc-n-900 lg:not-sr-only'}>
            {encabezado ?? titulo}
          </h1>
          {subtitulo && <p className="text-[14px] leading-5 text-hc-n-600">{subtitulo}</p>}
          {indice && indice.length > 0 && (
            indiceEnHoja
              ? <IndiceEnHoja indice={indice} />
              : (
                <nav
                  aria-label="Contenido de la página"
                  className={indiceEnFila
                    ? '-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0'
                    : 'flex flex-wrap items-center gap-2'}
                >
                  {indice.map((e) => <Chip key={e.id} texto={e.texto} onClick={() => irAlBloque(e.id)} />)}
                </nav>
              )
          )}
        </section>
        {children}
      </div>
    </MainLayout>
  )
}

function IndiceEnHoja({ indice }: { indice: EntradaIndice[] }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <>
      <nav aria-label="Contenido de la página" className="hidden flex-wrap gap-2 md:flex">
        {indice.map((e) => <Chip key={e.id} texto={e.texto} onClick={() => irAlBloque(e.id)} />)}
      </nav>
      <button
        type="button"
        className="sticky top-2 z-20 min-h-11 self-start rounded-full border border-hc-n-200 bg-hc-n-0 px-4 text-[13px] font-semibold text-hc-n-900 md:hidden"
        onClick={() => setAbierta(true)}
      >
        Secciones
      </button>
      <HojaInferior abierta={abierta} onCerrar={() => setAbierta(false)} titulo="Secciones">
        <div className="flex flex-col p-2">
          {indice.map((e) => (
            <button
              key={e.id}
              type="button"
              className="min-h-11 px-3 text-left text-sm font-medium text-hc-n-900"
              onClick={() => { setAbierta(false); irAlBloque(e.id) }}
            >
              {e.texto}
            </button>
          ))}
        </div>
      </HojaInferior>
      <button
        type="button"
        aria-label="Volver arriba"
        className="fixed bottom-24 right-4 z-30 flex size-11 items-center justify-center rounded-full border border-hc-n-200 bg-hc-n-0 text-lg md:hidden"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>
    </>
  )
}

/** Bloque con título de sección en Sora 17 (Figma `28:1690`, `28:1738`). */
export function BloqueInformativo({ id, titulo, children }: { id?: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-28 flex-col gap-[10px] px-4 pb-2 pt-[18px] lg:px-0">
      <h2 className="leading-[normal] font-display text-[17px] font-bold text-hc-n-900">{titulo}</h2>
      {children}
    </section>
  )
}
