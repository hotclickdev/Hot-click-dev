import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PaginaInformativa, { BloqueInformativo } from '@/components/comprador/PaginaInformativa'
import PreguntaFrecuente from '@/components/comprador/PreguntaFrecuente'
import { IcoSrv } from './servicios/IcoSrv'
import { TARIFAS, type FilaTarifa } from './envios/enviosData'
import { SITE_URL, faqItems, shippingJsonLd } from './envios/enviosHelpers'

/** Recorrido del paquete (boceto demo-0410 · 03). Nombres de pasos provisorios. TODO copy Producto. */
const RECORRIDO = [
  { titulo: 'La tienda prepara', texto: 'Alista tu pedido después de confirmar el pago.' },
  { titulo: 'Recolección', texto: 'Pasamos por el paquete (por ahora, en la GAM).' },
  { titulo: 'En camino', texto: 'Seguís el estado en Mis pedidos.' },
  { titulo: 'En tu casa', texto: 'O lo retirás, si la tienda lo permite.' },
]

const HREF_WA = 'https://wa.me/50686667888'
const CLASE_LINK = 'font-medium text-hc-blue-600 underline'

/** Respuestas con enlace (rastrear y problemas); el resto es texto plano de `faqItems`. */
function Respuesta({ q, a }: { q: string; a: string }) {
  if (q.includes('rastrear')) {
    return (
      <>
        Ingresá a <Link to="/mis-pedidos" className={CLASE_LINK}>Mis Pedidos</Link> para ver el estado en tiempo real. Si tu envío es por
        Correos de Costa Rica, recibirás un número de guía para rastrear en{' '}
        <a href="https://www.correos.go.cr" target="_blank" rel="noopener noreferrer" className={CLASE_LINK}>correos.go.cr</a>.
      </>
    )
  }
  if (q.includes('problema')) {
    return (
      <>
        Escribinos a <a href="mailto:hotclick.cr@gmail.com" className={CLASE_LINK}>hotclick.cr@gmail.com</a> con el número de pedido.
        También podés consultar nuestra <Link to="/devoluciones" className={CLASE_LINK}>Política de Devoluciones</Link>.
      </>
    )
  }
  return <>{a}</>
}

function Fila({ fila, primera }: { fila: FilaTarifa; primera: boolean }) {
  const contenido = (
    <>
      <IcoSrv nombre="infoCamion" size={18} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[14px] font-medium text-hc-n-900">{fila.nombre}</span>
        <span className="text-[12px] text-hc-n-600">
          {fila.detalle ?? [fila.tiempo, fila.nota].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 font-display text-[14px] font-semibold text-hc-n-900">{fila.precio}</span>
    </>
  )
  const clase = `flex items-center gap-3 py-3 ${primera ? '' : 'border-t border-hc-n-200'}`
  if (fila.href) {
    return (
      <li>
        <a href={fila.href.url} target="_blank" rel="noopener noreferrer" aria-label={fila.href.ariaLabel} className={clase}>
          {contenido}
        </a>
      </li>
    )
  }
  return <li className={clase}>{contenido}</li>
}

/** Envíos con la plantilla informativa de Figma `28:1660`: intro con índice, tabla de tarifas y preguntas frecuentes. */
export default function EnviosPage() {
  return (
    <PaginaInformativa
      titulo="Envíos"
      encabezado="Así llega tu pedido"
      subtitulo="Antes de pagar ves el costo y el tiempo estimado. Hoy no ofrecemos envío gratis."
      indice={[{ id: 'como', texto: 'Recorrido' }, { id: 'tarifas', texto: 'Tarifas' }, { id: 'preguntas', texto: 'Preguntas' }]}
      ancha
    >
      <Helmet>
        <title>Envíos a todo Costa Rica — HotClick</title>
        <meta name="description" content="Enviamos a todas las provincias de Costa Rica. Conocé los métodos de envío, tarifas estimadas y zonas de cobertura de HotClick." />
        <link rel="canonical" href={`${SITE_URL}/envios`} />
        <script type="application/ld+json">{JSON.stringify(shippingJsonLd)}</script>
      </Helmet>

      <BloqueInformativo id="como" titulo="Cómo llega tu paquete">
        <ol className="m-0 flex list-none flex-col gap-0 p-0 lg:flex-row lg:gap-4">
          {RECORRIDO.map((p, i) => (
            <li key={p.titulo} className="relative flex gap-3 pb-5 lg:flex-1 lg:flex-col lg:items-center lg:pb-0 lg:text-center">
              {i < RECORRIDO.length - 1 && (
                <span aria-hidden="true" className="absolute left-[19px] top-10 h-[calc(100%-40px)] border-l-2 border-dashed border-hc-blue-100 lg:left-[calc(50%+24px)] lg:top-5 lg:h-0 lg:w-[calc(100%-32px)] lg:border-l-0 lg:border-t-2" />
              )}
              <span className={`relative flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold ${i === 0 ? 'bg-hc-blue-600 text-hc-n-0' : 'bg-hc-blue-50 text-hc-blue-600'}`}>{i + 1}</span>
              <span className="flex flex-col gap-0.5 pt-1 lg:pt-0">
                <span className="text-[14px] font-semibold text-hc-n-900">{p.titulo}</span>
                <span className="text-[13px] leading-[18px] text-hc-n-600">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </BloqueInformativo>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <BloqueInformativo id="tarifas" titulo="Opciones y costos">
        <ul className="m-0 flex list-none flex-col rounded-[16px] border border-hc-n-200 bg-hc-n-0 px-4 py-1">
          {TARIFAS.map((f, i) => <Fila key={f.id} fila={f} primera={i === 0} />)}
        </ul>
      </BloqueInformativo>

      <BloqueInformativo id="preguntas" titulo="Preguntas frecuentes">
        <PreguntaFrecuente pregunta="¿Puedo retirar en la tienda?" abiertaInicial>
          Sí, cuando la tienda lo permite. Lo elegís en el checkout y te avisamos cuando esté listo.
        </PreguntaFrecuente>
        {faqItems.map((item) => (
          <PreguntaFrecuente key={item.q} pregunta={item.q}><Respuesta q={item.q} a={item.a} /></PreguntaFrecuente>
        ))}

        <div className="mt-2 flex flex-col gap-2 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
          <p className="text-[14px] font-semibold text-hc-n-900">¿Preguntas sobre tu envío?</p>
          <Link to="/mis-pedidos" className="flex min-h-[48px] items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 text-[14px] font-semibold text-hc-blue-600">
            Rastrear mi pedido
          </Link>
          <a href={HREF_WA} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[13px] text-[14px] font-semibold text-hc-n-900">
            Consultar por WhatsApp
          </a>
          <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-[13px] font-semibold text-hc-blue-600">
            <Link to="/productos">Pedir envío rápido</Link>
            <Link to="/devoluciones">Política de Devoluciones</Link>
            <Link to="/contacto">Contacto</Link>
          </p>
        </div>
      </BloqueInformativo>
      </div>
      <div className="h-6" aria-hidden="true" />
    </PaginaInformativa>
  )
}
