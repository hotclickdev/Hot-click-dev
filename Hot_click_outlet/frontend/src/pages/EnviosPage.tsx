import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import PaginaInformativa, { BloqueInformativo } from '@/components/comprador/PaginaInformativa'
import PreguntaFrecuente from '@/components/comprador/PreguntaFrecuente'
import { IcoSrv } from './servicios/IcoSrv'
import { TARIFAS, type FilaTarifa } from './envios/enviosData'
import { SITE_URL, faqItems, shippingJsonLd } from './envios/enviosHelpers'

/** Transparencia para quien compra: qué pasa después de pagar. */
const PASOS = [
  { titulo: 'Pagás y confirmamos', texto: 'Ves el costo de envío en el carrito antes de pagar. Te confirmamos el pedido por correo.' },
  { titulo: 'La tienda prepara', texto: 'Cada negocio alista tu paquete y te avisamos cuando sale.' },
  { titulo: 'Te llega o lo retirás', texto: 'Seguís el estado en Mis pedidos, con guía si va por Correos.' },
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
      subtitulo="Enviamos a todo Costa Rica. El costo se muestra en el carrito antes de pagar."
      indice={[{ id: 'como', texto: 'Cómo funciona' }, { id: 'tarifas', texto: 'Tarifas' }, { id: 'preguntas', texto: 'Preguntas' }]}
      ancha
    >
      <Helmet>
        <title>Envíos a todo Costa Rica — HotClick</title>
        <meta name="description" content="Enviamos a todas las provincias de Costa Rica. Conocé los métodos de envío, tarifas estimadas y zonas de cobertura de HotClick." />
        <link rel="canonical" href={`${SITE_URL}/envios`} />
        <script type="application/ld+json">{JSON.stringify(shippingJsonLd)}</script>
      </Helmet>

      <BloqueInformativo id="como" titulo="Cómo funciona">
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="flex gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 font-display text-[13px] font-bold text-hc-blue-600">{i + 1}</span>
              <span className="flex flex-col gap-1">
                <span className="text-[14px] font-semibold text-hc-n-900">{p.titulo}</span>
                <span className="text-[13px] leading-[18px] text-hc-n-600">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </BloqueInformativo>

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <BloqueInformativo id="tarifas" titulo="Tarifas">
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
          <Link to="/mis-pedidos" className="flex items-center justify-center rounded-[12px] bg-hc-red-500 px-4 py-[13px] text-[14px] font-semibold text-hc-n-0">
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
