import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import api from '@/services/api'

type PlanApi = {
  nombre: string
  maxUsuarios: number
  maxProductos: number
  maxBodegas: number
  maxCajas: number
  tienePos: boolean
  tieneCrm: boolean
  tieneCompras: boolean
  tieneReportes: boolean
  tieneAi: boolean
  tieneGiftCards: boolean
  maxCreditosAi: number
}

type PlanVista = { clave: string; titulo: string; para: string; detalle: string; destacado?: boolean }

/** Las tres tarjetas. Montos y comisiones: [PENDIENTE] hasta que Producto los confirme. */
const PLANES: PlanVista[] = [
  { clave: 'EMPRENDEDOR', titulo: 'Emprendedor', para: 'Para quien vende desde la casa, redes o ferias.', detalle: '/emprende' },
  { clave: 'PYME', titulo: 'Pyme', para: 'Para negocios con local, equipo y caja.', detalle: '/para-pymes', destacado: true },
  { clave: 'NEGOCIO_PLUS', titulo: 'Negocio Plus', para: 'Para negocios con varias sucursales y más volumen.', detalle: '/negocio-plus-plan' },
]

type Fila = { etiqueta: string; valor: (p: PlanApi) => string }

const limite = (n: number) => (n < 0 ? 'Ilimitado' : String(n))
const si = (b: boolean) => (b ? 'Sí' : '—')

const FILAS: Fila[] = [
  { etiqueta: 'Productos publicados', valor: (p) => limite(p.maxProductos) },
  { etiqueta: 'Usuarios del equipo', valor: (p) => limite(p.maxUsuarios) },
  { etiqueta: 'Bodegas o sucursales', valor: (p) => limite(p.maxBodegas) },
  { etiqueta: 'Caja (punto de venta)', valor: (p) => (p.tienePos ? `Sí · ${limite(p.maxCajas)} cajas` : '—') },
  { etiqueta: 'Reportes de ventas', valor: (p) => si(p.tieneReportes) },
  { etiqueta: 'Asistente con IA', valor: (p) => (p.tieneAi ? (p.maxCreditosAi < 0 ? 'Sí · sin límite' : `Sí · ${p.maxCreditosAi} créditos`) : '—') },
  { etiqueta: 'Compras a proveedores', valor: (p) => si(p.tieneCompras) },
  { etiqueta: 'Clientes (CRM)', valor: (p) => si(p.tieneCrm) },
  { etiqueta: 'Tarjetas de regalo', valor: (p) => si(p.tieneGiftCards) },
  { etiqueta: 'Mensualidad', valor: () => '[PENDIENTE]' },
  { etiqueta: 'Comisión por venta', valor: () => '[PENDIENTE]' },
]

const POR_QUE = [
  { titulo: 'Tu tienda sigue siendo tuya', texto: 'Seguí vendiendo en tu local, en tu feria o en tus redes. HotClick suma compradores que hoy no te encuentran.' },
  { titulo: 'Hecho para Costa Rica', texto: 'Precios en colones, envíos dentro del país y pagos con tarjeta procesados con Tilopay.' },
  { titulo: 'Cobrá en persona con la misma cuenta', texto: 'La caja (POS) viene incluida en todos los planes.' },
  { titulo: 'Reglas claras', texto: 'Antes de registrarte ves cuánto pagás de mensualidad y de comisión. No hay costos escondidos.' },
]

const COMPARACION = [
  { otros: 'Otros marketplaces venden sus propios productos y compiten con vos.', nosotros: 'En HotClick vendés vos.' },
  { otros: 'Algunas plataformas cobran mensualidad aunque no vendás.', nosotros: 'Con el plan Emprendedor solo pagás comisión cuando vendés. [PENDIENTE]' },
  { otros: 'Inventario, caja y tienda en línea en tres herramientas separadas.', nosotros: 'Todo en un solo lugar.' },
]

const PASOS_COMPRA = [
  'Encuentra tu producto en el marketplace o en tu tienda.',
  'Ve qué tienda lo vende y el precio final con envío antes de pagar.',
  'Vos preparás el pedido y le avisamos cuando sale.',
  'Si algo sale mal, HotClick recibe su reclamo y le da seguimiento con la tienda.',
]

/** /planes: los tres planes juntos, por qué vender aquí y comparación con datos reales del plan. */
export default function PlanesPage() {
  const [planes, setPlanes] = useState<PlanApi[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let vivo = true
    api.get<PlanApi[]>('/planes')
      .then((r) => { if (vivo) setPlanes(Array.isArray(r.data) ? r.data : []) })
      .catch(() => { if (vivo) setError(true) })
    return () => { vivo = false }
  }, [])

  const dePlan = (clave: string) => planes.find((p) => p.nombre === clave)

  return (
    <MainLayout>
      <Helmet>
        <title>Planes para vender en HotClick</title>
        <meta name="description" content="Compará los planes Emprendedor, Pyme y Negocio Plus de HotClick." />
      </Helmet>
      <main className="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 py-8 lg:py-12">
        <header className="flex flex-col gap-3 text-center">
          <h1 className="font-display text-[28px] font-bold leading-tight text-hc-n-900 lg:text-[40px]">Vendé también en HotClick</h1>
          <p className="mx-auto max-w-[640px] text-[15px] leading-6 text-hc-n-600">
            No venimos a competir con tu tienda. Somos un canal más de venta para tu negocio.
          </p>
        </header>

        <section aria-labelledby="por-que" className="flex flex-col gap-4">
          <h2 id="por-que" className="font-display text-[20px] font-bold text-hc-n-900">¿Por qué vender en HotClick?</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {POR_QUE.map((p) => (
              <div key={p.titulo} className="rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4">
                <h3 className="font-sans text-[15px] font-semibold text-hc-n-900">{p.titulo}</h3>
                <p className="mt-1 text-[14px] leading-5 text-hc-n-600">{p.texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="los-planes" className="flex flex-col gap-4">
          <h2 id="los-planes" className="font-display text-[20px] font-bold text-hc-n-900">Los planes</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANES.map((plan) => (
              <article
                key={plan.clave}
                className={`flex flex-col gap-3 rounded-[16px] p-5 ${plan.destacado ? 'bg-gradient-to-br from-hc-blue-600 to-[#0f2f73] text-hc-n-0' : 'border border-hc-n-200 bg-hc-n-0 text-hc-n-900'}`}
              >
                <h3 className="font-display text-[22px] font-bold">{plan.titulo}</h3>
                <p className={`text-[14px] leading-5 ${plan.destacado ? 'text-hc-n-0/85' : 'text-hc-n-600'}`}>{plan.para}</p>
                <p className="font-display text-[18px] font-semibold">[PENDIENTE]</p>
                <Link
                  to={plan.detalle}
                  className={`mt-auto flex min-h-[44px] items-center justify-center rounded-[12px] text-[14px] font-semibold ${plan.destacado ? 'bg-hc-n-0 text-hc-blue-600' : 'border border-hc-n-200 text-hc-blue-600'}`}
                >
                  Ver más
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="comparar" className="flex flex-col gap-4">
          <h2 id="comparar" className="font-display text-[20px] font-bold text-hc-n-900">Qué incluye cada plan</h2>
          {error ? (
            <p role="status" className="text-[14px] text-hc-n-600">No pudimos cargar la comparación. Intentá de nuevo en un momento.</p>
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-hc-n-200 bg-hc-n-0">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="bg-hc-n-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold text-hc-n-600">Incluye</th>
                    {PLANES.map((p) => <th key={p.clave} scope="col" className="px-4 py-3 font-semibold text-hc-n-900">{p.titulo}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {FILAS.map((fila) => (
                    <tr key={fila.etiqueta} className="border-t border-hc-n-200">
                      <th scope="row" className="px-4 py-3 font-medium text-hc-n-600">{fila.etiqueta}</th>
                      {PLANES.map((p) => {
                        const datos = dePlan(p.clave)
                        return <td key={p.clave} className="px-4 py-3 text-hc-n-900">{datos ? fila.valor(datos) : '…'}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="diferencia" className="flex flex-col gap-4">
          <h2 id="diferencia" className="font-display text-[20px] font-bold text-hc-n-900">En qué nos diferenciamos</h2>
          <div className="flex flex-col gap-3">
            {COMPARACION.map((c) => (
              <div key={c.otros} className="grid gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 md:grid-cols-2 md:gap-6">
                <p className="text-[14px] leading-5 text-hc-n-600">{c.otros}</p>
                <p className="text-[14px] font-medium leading-5 text-hc-n-900">{c.nosotros}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="como-compra" className="flex flex-col gap-4">
          <h2 id="como-compra" className="font-display text-[20px] font-bold text-hc-n-900">Cómo funciona para quien te compra</h2>
          <ol className="grid gap-3 md:grid-cols-4">
            {PASOS_COMPRA.map((p, i) => (
              <li key={p} className="flex gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 font-display text-[13px] font-bold text-hc-blue-600">{i + 1}</span>
                <span className="text-[14px] leading-5 text-hc-n-900">{p}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex justify-center">
          <Link to="/registro-empresa" className="flex min-h-[48px] items-center justify-center rounded-[12px] bg-hc-red-500 px-6 text-[15px] font-semibold text-hc-n-0">
            Crear mi negocio
          </Link>
        </div>
      </main>
    </MainLayout>
  )
}
