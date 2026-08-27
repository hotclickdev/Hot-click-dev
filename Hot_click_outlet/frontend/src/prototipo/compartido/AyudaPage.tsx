import { useState } from 'react'
import { Boton, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

const FAQS = [
  { q: '¿Cómo publico un producto nuevo?', a: 'Entrá a Productos, tocá Agregar producto, completá nombre, precios, stock y categoría, y publicá.' },
  { q: '¿Cuánto tarda en verse en el marketplace?', a: 'Si el producto queda Publicado, aparece de inmediato en tu tienda y en el catálogo.' },
  { q: '¿Cómo cambio mi método de cobro?', a: 'En Opciones → Métodos de cobro podés ver SINPE, IBAN y tarjeta, y agregar otro método.' },
  { q: '¿Qué pasa si un producto es rechazado?', a: 'Te llega una notificación. Corregí la ficha y volvé a publicarlo.' },
] as const

/**
 * Ayuda y soporte (Figma 64:574).
 */
export default function AyudaPage() {
  const ruta = useSellerRuta()
  const [abierta, setAbierta] = useState<string | null>(null)
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Ayuda y Soporte" volverA={ruta('opciones')} />
      <ul>
        {FAQS.map((item) => (
          <li key={item.q} className="border-b border-hc-border py-4">
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-medium"
              onClick={() => setAbierta(abierta === item.q ? null : item.q)}
            >
              {item.q}
              <span aria-hidden>{abierta === item.q ? '–' : '+'}</span>
            </button>
            {abierta === item.q ? <p className="mt-2 text-sm text-hc-muted">{item.a}</p> : null}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Boton to="https://wa.me/50686667888">Escribinos por WhatsApp</Boton>
      </div>
    </main>
  )
}
