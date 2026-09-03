import { useState } from 'react'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR, WHATSAPP_SOPORTE } from '../constants'

const PREGUNTAS = [
  {
    q: '¿Cómo publico un producto nuevo?',
    a: 'En Productos tocá Agregar producto, completá nombre, precios, stock y categoría, y publicá.',
  },
  {
    q: '¿Cuánto tarda en verse en el marketplace?',
    a: 'Si el producto queda Publicado, aparece en tu tienda cuando tu negocio esté aprobado. Pausado lo controlás vos desde el catálogo.',
  },
  {
    q: '¿Cómo cambio mi método de cobro?',
    a: 'En Métodos de cobro podés ver SINPE, IBAN y tarjeta, y agregar una cuenta nueva paso a paso.',
  },
  {
    q: '¿Qué pasa si un producto es rechazado?',
    a: 'Te llega una notificación. Editá el producto y volvé a publicarlo cuando esté listo.',
  },
] as const

/**
 * Ayuda y soporte — Figma móvil 64:220 (acordeón FAQ + WhatsApp).
 */
export default function AyudaPage() {
  const [abierta, setAbierta] = useState<string | null>(null)

  return (
    <EmprendedorPageFrame titulo="Ayuda y Soporte" volverA={`${RUTA_EMPRENDEDOR}/opciones`}>
      <p className="text-sm text-hc-muted">Preguntas frecuentes sobre tu tienda</p>
      <div className="overflow-hidden rounded-xl border border-hc-border bg-hc-surface">
        {PREGUNTAS.map((item, indice) => {
          const abiertaEsta = abierta === item.q
          return (
            <div
              key={item.q}
              className={indice < PREGUNTAS.length - 1 ? 'border-b border-hc-border' : ''}
            >
              <button
                type="button"
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-4 text-left text-[13px] font-medium md:px-5 md:text-[15px]"
                aria-expanded={abiertaEsta}
                onClick={() => setAbierta((actual) => (actual === item.q ? null : item.q))}
              >
                <span>{item.q}</span>
                <span className="shrink-0 text-base font-bold text-hc-muted" aria-hidden>
                  {abiertaEsta ? '–' : '+'}
                </span>
              </button>
              {abiertaEsta ? (
                <p className="px-4 pb-4 text-xs leading-relaxed text-hc-muted md:px-5 md:text-[13px]">
                  {item.a}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
      <a
        href={`https://wa.me/${WHATSAPP_SOPORTE}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-hc-primary px-5 py-4 text-[14px] font-bold text-white md:text-[15px]"
      >
        Escribinos por WhatsApp
      </a>
    </EmprendedorPageFrame>
  )
}
