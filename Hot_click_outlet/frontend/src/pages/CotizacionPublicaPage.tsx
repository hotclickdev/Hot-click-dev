import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import Spinner from '@/components/ui/Spinner'
import isotipo from '@/assets/figma/comprador/isotipo.png'
import { cotizacionService } from '@/services/cotizacionService'
import { urlWhatsApp } from './carrito/cartHelpers'
import { IcoBuscarCaja } from './perfil/cuenta/iconosCuenta'
import { IcoSrv } from './servicios/IcoSrv'
import { fechaConMes } from './servicios/serviciosHelpers'
import { ESTADOS_COTIZACION, datosDelCliente, montoCotizacion, textoLinea } from './cotizacion/cotizacionHelpers'
import type { CotizacionPublica } from './cotizacion/cotizacionHelpers'

const TARJETA = 'rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]'
const ETIQUETA_MONO = 'font-mono text-[10px] font-medium text-hc-n-600'

function Pantalla({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-hc-n-50 leading-[normal]">{children}</div>
}

/** Cotización pública (Figma `55:2332`). Solo se muestra y se consulta por WhatsApp: aceptarla no existe en el backend. */
export default function CotizacionPublicaPage() {
  const { token } = useParams()
  const [cot, setCot] = useState<CotizacionPublica | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cotizacionService.publica(token as string)
      .then((c) => { setCot(c as CotizacionPublica); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [token])

  if (loading) {
    return <Pantalla><div className="flex justify-center py-32"><Spinner size="xl" /></div></Pantalla>
  }

  if (error || !cot) {
    return (
      <Pantalla>
        <EstadoVacio
          nivel="h1"
          tono="azul"
          espaciado="cuenta"
          icono={<IcoBuscarCaja size={28} />}
          titulo="Cotización no encontrada"
          texto="El enlace puede haber expirado o ser inválido."
          accion={{ texto: 'Ir al catálogo', to: '/productos' }}
        />
      </Pantalla>
    )
  }

  const items = cot.items ?? []
  const estado = ESTADOS_COTIZACION[cot.estadoCotizacion ?? ''] ?? { texto: cot.estadoCotizacion ?? '', clase: 'bg-hc-n-100 text-hc-n-600' }
  const emision = fechaConMes(cot.fechaEmision)
  const vence = fechaConMes(cot.fechaVencimiento)
  const cliente = datosDelCliente(cot)
  const mensaje = encodeURIComponent(`Hola HotClick, consulto por la cotización ${cot.numeroCotizacion ?? ''}.`)

  return (
    <Pantalla>
      <div className="mx-auto flex w-full max-w-[560px] flex-col">
        {/* div y no header/footer: index.css fuerza el fondo de esas etiquetas (SHELL). */}
        <div className="flex flex-col gap-2 bg-hc-blue-900 px-4 py-5">
          <div className="flex items-center gap-2">
            <img src={isotipo} alt="" className="size-[26px] object-contain" />
            <p className="text-[13px] font-semibold text-hc-blue-100">
              {cot.empresa?.nombreEmpresa ? `Cotización de ${cot.empresa.nombreEmpresa}` : 'Cotización'}
            </p>
          </div>
          <h1 className="leading-[normal] font-display text-[24px] font-bold text-hc-n-0">{cot.numeroCotizacion}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-[10px] py-1 text-[12px] font-semibold ${estado.clase}`}>{estado.texto}</span>
            <p className="text-[12px] text-hc-blue-100">
              {emision ? `Emitida ${emision}` : ''}{emision && vence ? ' · ' : ''}{vence ? `válida hasta ${vence}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-[14px] p-4">
          <section className={`${TARJETA} flex flex-col gap-1`}>
            <p className={ETIQUETA_MONO}>PARA</p>
            <p className="text-[15px] font-semibold text-hc-n-900 [overflow-wrap:anywhere]">{cliente.nombre}</p>
            {cliente.detalle && <p className="text-[12px] text-hc-n-600 [overflow-wrap:anywhere]">{cliente.detalle}</p>}
          </section>

          <section className={`${TARJETA} flex flex-col gap-3`} aria-label="Productos cotizados">
            {items.map((item, i) => {
              const base = (item.precioUnitario ?? 0) * (item.cantidad ?? 1)
              const subtotal = Math.round(base * (1 - (item.descuentoPorcentaje ?? 0) / 100))
              return (
                <div key={i} className="flex items-start gap-3">
                  {item.imagenUrl
                    ? <img src={item.imagenUrl} alt="" className="size-[52px] shrink-0 rounded-[10px] object-cover" loading="lazy" />
                    : <span aria-hidden="true" className="size-[52px] shrink-0 rounded-[10px] bg-hc-n-100" />}
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                    <p className="text-[13px] font-medium leading-[17px] text-hc-n-900 [overflow-wrap:anywhere]">{item.nombre}</p>
                    <p className="text-[12px] text-hc-n-600">{textoLinea(item, cot.moneda)}</p>
                    {item.codigo && <p className="text-[11px] text-hc-n-600">{item.codigo}</p>}
                    {item.descripcion && <p className="text-[11px] leading-[15px] text-hc-n-600 [overflow-wrap:anywhere]">{item.descripcion}</p>}
                  </div>
                  <p className="shrink-0 font-display text-[14px] font-semibold text-hc-n-900">{montoCotizacion(subtotal, cot.moneda)}</p>
                </div>
              )
            })}
          </section>

          <section className={`${TARJETA} flex flex-col gap-2`}>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-hc-n-600">Subtotal</span>
              <span className="font-medium text-hc-n-900">{montoCotizacion(cot.subtotal, cot.moneda)}</span>
            </div>
            {cot.aplicaIva && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-hc-n-600">IVA {cot.porcentajeIva}%</span>
                <span className="font-medium text-hc-n-900">{montoCotizacion(cot.montoIva, cot.moneda)}</span>
              </div>
            )}
            <div className="h-px w-full bg-hc-n-200" />
            <div className="flex items-center justify-between text-hc-n-900">
              <span className="text-[15px] font-semibold">Total</span>
              <span className="font-display text-[17px] font-bold">{montoCotizacion(cot.total, cot.moneda)}</span>
            </div>
          </section>

          {cot.observaciones && (
            <section className={`${TARJETA} flex flex-col gap-1`}>
              <p className={ETIQUETA_MONO}>OBSERVACIONES</p>
              <p className="whitespace-pre-line text-[13px] leading-[18px] text-hc-n-600">{cot.observaciones}</p>
            </section>
          )}

          {cot.terminos && (
            <section className={`${TARJETA} flex flex-col gap-1`}>
              <p className={ETIQUETA_MONO}>TÉRMINOS Y CONDICIONES</p>
              <p className="whitespace-pre-line text-[12px] leading-4 text-hc-n-600">{cot.terminos}</p>
            </section>
          )}

          <a
            href={urlWhatsApp(mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 py-[13px] text-[15px] font-semibold text-hc-n-900"
          >
            <IcoSrv nombre="cotizacionWhatsapp" size={18} />
            Consultar por WhatsApp
          </a>
        </div>

        <div className="flex justify-center px-4 pb-6 pt-1">
          <p className="text-[11px] text-hc-n-600">Cotización generada por HotClick · {cot.numeroCotizacion}</p>
        </div>
      </div>
    </Pantalla>
  )
}
