import { useState } from 'react'
import CabeceraAtras from '../ui/CabeceraAtras'
import { RUTA_EMPRENDEDOR, WHATSAPP_SOPORTE } from '../constants'

const PREGUNTAS = [
  {
    q: '¿Cómo publico un producto nuevo?',
    a: 'En Productos tocá Agregar producto, completá nombre, precios, stock y categoría, y publicá.',
  },
  {
    q: '¿Cuánto tarda en verse en el marketplace?',
    a: 'Si el producto queda Publicado, aparece en tu tienda de inmediato. Algunos ítems pueden requerir revisión.',
  },
  {
    q: '¿Cómo cambio mi método de cobro?',
    a: 'En Opciones → Métodos de cobro podés ver SINPE, IBAN y tarjeta. Agregar uno nuevo está en camino.',
  },
  {
    q: '¿Qué pasa si un producto es rechazado?',
    a: 'Te llega una notificación. Editá el producto y volvé a publicarlo cuando esté listo.',
  },
] as const

/**
 * Ayuda y soporte (Figma 64:220).
 */
export default function AyudaPage() {
  const [abierta, setAbierta] = useState<string | null>(null)
  return (
    <main className="flex flex-col gap-[18px] px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Ayuda y Soporte" to={`${RUTA_EMPRENDEDOR}/opciones`} />
      {PREGUNTAS.map((item) => (
        <div key={item.q} className="border-b border-hc-border py-4">
          <button
            type="button"
            className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-[13px] font-medium"
            onClick={() => setAbierta((actual) => (actual === item.q ? null : item.q))}
          >
            {item.q}
            <span className="text-base text-hc-muted">{abierta === item.q ? '–' : '+'}</span>
          </button>
          {abierta === item.q ? <p className="mt-2 text-xs text-hc-muted">{item.a}</p> : null}
        </div>
      ))}
      <a
        href={`https://wa.me/${WHATSAPP_SOPORTE}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 w-full items-center justify-center rounded-[14px] bg-hc-primary py-4 text-[14px] font-bold text-white"
      >
        Escribinos por WhatsApp
      </a>
    </main>
  )
}
