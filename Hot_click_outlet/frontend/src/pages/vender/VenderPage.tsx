import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'

type PlanPuente = { id: 'emprendedor' | 'pyme' | 'negocio-plus'; titulo: string; pitch: string; puntos: string[] }

/** Copy de Producto (ENTREGA_0410 §2.2); límites provisionales. Montos: [PENDIENTE]. */
const PLANES: PlanPuente[] = [
  { id: 'emprendedor', titulo: 'Emprendedor', pitch: 'Empezá a vender en HotClick.', puntos: ['Hasta 50 productos', 'Cobrás con tarjeta y SINPE', 'Tus clientes te compran a través de HotClick'] },
  { id: 'pyme', titulo: 'Pyme', pitch: 'Para cuando tu negocio ya tiene clientes que te buscan.', puntos: ['Hasta 500 productos', 'Tu contacto visible en tu tienda', 'Dos bodegas, dos cajas y tu equipo'] },
  { id: 'negocio-plus', titulo: 'Negocio Plus', pitch: 'Sin límites para crecer.', puntos: ['Productos sin límite', 'Bodegas, cajas y equipo sin límite', 'Tu contacto visible en tu tienda'] },
]

const BENEFICIOS = [
  { titulo: 'Tu tienda', texto: 'Tu página propia dentro de HotClick.' },
  { titulo: 'Inventario', texto: 'Stock y alertas en un solo lugar.' },
  { titulo: 'Clientes', texto: 'Tu lista de clientes y la caja (POS).' },
]

/**
 * /vender: puente a los 3 planes (boceto demo-0410 · 02). Tarjeta entera elegible (radio), una sola CTA roja
 * «Empezar con {plan}» que salta al registro con el plan, y enlace a /planes para comparar todo.
 */
export default function VenderPage() {
  const [elegido, setElegido] = useState<PlanPuente['id']>('emprendedor')
  const plan = PLANES.find((p) => p.id === elegido) ?? PLANES[0]
  const destino = `/registro-empresa?plan=${plan.id}`

  return (
    <MainLayout>
      <Helmet>
        <title>Vendé en HotClick — Emprendedor, Pyme y Negocio Plus</title>
        <meta name="description" content="Tu negocio, un canal más. Elegí el plan para vender en HotClick." />
        <link rel="canonical" href="https://hotclick.lat/vender" />
      </Helmet>
      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-32 pt-6 lg:gap-8 lg:pb-12 lg:pt-10">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="flex flex-col gap-3 lg:max-w-[520px]">
            <h1 className="font-display text-[28px] font-bold leading-tight text-hc-n-900 lg:text-[40px]">Vendé en HotClick</h1>
            <p className="text-[15px] leading-6 text-hc-n-600">
              Tu negocio, un canal más. Todos los planes incluyen tienda en HotClick, punto de venta, inventario y lista de clientes.
            </p>
            <div className="hidden gap-3 lg:flex">
              <Link to={destino} className="flex min-h-[48px] items-center rounded-[12px] bg-hc-red-500 px-5 text-[15px] font-semibold text-hc-n-0">
                Empezar con {plan.titulo}
              </Link>
              <Link to="/planes" className="flex min-h-[48px] items-center rounded-[12px] border border-hc-n-200 px-5 text-[15px] font-semibold text-hc-n-900">
                Comparar planes
              </Link>
            </div>
          </div>
          <ul className="grid grid-cols-3 gap-2 lg:w-[480px]">
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className="flex flex-col items-center gap-1 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3 text-center">
                <span className="text-[13px] font-semibold text-hc-n-900">{b.titulo}</span>
                <span className="hidden text-[12px] leading-4 text-hc-n-600 lg:block">{b.texto}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="elegi-plan" className="flex flex-col gap-3">
          <h2 id="elegi-plan" className="font-display text-[20px] font-bold text-hc-n-900">Elegí tu plan</h2>
          <div role="radiogroup" aria-labelledby="elegi-plan" className="grid gap-3 lg:grid-cols-3">
            {PLANES.map((p) => {
              const activo = p.id === elegido
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setElegido(p.id)}
                  className={`flex flex-col gap-2 overflow-hidden rounded-[16px] border bg-hc-n-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-blue-600 ${activo ? 'border-2 border-hc-blue-600' : 'border-hc-n-200'}`}
                >
                  <span className="flex items-start justify-between gap-3 bg-gradient-to-b from-hc-red-500/10 to-transparent px-4 pb-1 pt-4">
                    <span className="flex flex-col gap-0.5">
                      <span className="font-display text-[18px] font-bold text-hc-n-900">{p.titulo}</span>
                      <span className="text-[13px] text-hc-n-600">{p.pitch}</span>
                    </span>
                    <span aria-hidden className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${activo ? 'border-hc-blue-600' : 'border-hc-n-400'}`}>
                      {activo && <span className="size-2.5 rounded-full bg-hc-blue-600" />}
                    </span>
                  </span>
                  <ul className="flex flex-col gap-1 px-4">
                    {p.puntos.map((x) => (
                      <li key={x} className="flex gap-2 text-[13px] text-hc-n-900"><span aria-hidden className="text-hc-blue-600">✓</span>{x}</li>
                    ))}
                  </ul>
                  <span className="px-4 pb-4 text-[12px] text-hc-n-600">Mensualidad y comisión: [PENDIENTE]</span>
                </button>
              )
            })}
          </div>
          <p className="text-[13px] text-hc-n-600">
            Podés subir de plan cuando quieras. <Link to="/planes" className="font-semibold text-hc-blue-600">Ver la comparación completa</Link>
          </p>
        </section>

        <section aria-labelledby="para-comprador" className="flex flex-col gap-3">
          <h2 id="para-comprador" className="font-display text-[20px] font-bold text-hc-n-900">Transparencia para quien compra</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {[
              'Cada producto muestra qué tienda lo vende.',
              'El precio final y el costo de envío aparecen antes de pagar.',
              'Si algo sale mal, HotClick recibe el reclamo y le da seguimiento con la tienda.',
              'Los pagos con tarjeta pasan por Tilopay. La tienda no ve los datos de la tarjeta.',
            ].map((x) => (
              <li key={x} className="rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-3 text-[14px] text-hc-n-900">{x}</li>
            ))}
          </ul>
        </section>
      </main>

      {/* Barra fija móvil: la única CTA roja de la pantalla. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-hc-n-200 bg-hc-n-0 px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 lg:hidden">
        <Link to={destino} className="flex min-h-[48px] items-center justify-center rounded-[12px] bg-hc-red-500 text-[15px] font-semibold text-hc-n-0">
          Empezar con {plan.titulo}
        </Link>
      </div>
    </MainLayout>
  )
}
