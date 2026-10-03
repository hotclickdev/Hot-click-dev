import { Helmet } from 'react-helmet-async'
import PaginaLegal, { type EnlaceLegal, type SeccionLegal } from '@/components/comprador/PaginaLegal'
import { IcoSrv } from './servicios/IcoSrv'
import { LAST_UPDATED, SITE_URL, resumen, returnPolicyJsonLd, sections } from './devoluciones/devolucionesData'

const ENLACES: EnlaceLegal[] = [
  { to: '/envios', texto: 'Envíos' },
  { to: '/informacion', texto: 'Garantía' },
  { to: '/terminos', texto: 'Términos' },
  { to: '/privacidad', texto: 'Privacidad' },
]

/** "1. Resumen de la Política" → etiqueta "Sección 1" + título sin número. */
const secciones: SeccionLegal[] = sections.map((s) => {
  const m = /^(\d+)\.\s*(.*)$/.exec(s.title)
  return { id: s.id, num: m ? `Sección ${m[1]}` : '', title: m ? m[2] : s.title, content: s.content }
})

/** Resumen de la política en filas con ícono (derivado de Figma `28:1660`). */
function Resumen() {
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {resumen.map((r, i) => (
        <li key={r.title} className={`flex items-center gap-3 py-[10px] ${i === 0 ? 'pt-0' : 'border-t border-hc-n-200'} ${i === resumen.length - 1 ? 'pb-0' : ''}`}>
          <IcoSrv nombre={r.icono} size={20} />
          <span className="flex min-w-0 flex-1 flex-col gap-px leading-[normal]">
            <span className="text-[14px] font-semibold text-hc-n-900">{r.title}</span>
            <span className="text-[12px] text-hc-n-600">{r.desc}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Devoluciones sobre la plantilla legal (derivado de Figma `28:1660`): resumen en filas, secciones y consulta. */
export default function DevolucionesPage() {
  return (
    <>
      <Helmet>
        <title>Política de devoluciones — HotClick Costa Rica</title>
        <meta name="description" content="Tenés 7 días hábiles para devolver cualquier producto. Conocé el proceso de devolución y cambio de HotClick Marketplace Costa Rica." />
        <link rel="canonical" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Política de devoluciones — HotClick Costa Rica" />
        <meta property="og:description" content="7 días hábiles para cambios y devoluciones. Sin costo para el comprador." />
        <meta property="og:url" content={`${SITE_URL}/devoluciones`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(returnPolicyJsonLd)}</script>
      </Helmet>
      <PaginaLegal
        titulo="Devoluciones"
        encabezado="Política de devoluciones"
        subtitulo={`Ley N.° 7472 · Costa Rica · Última actualización: ${LAST_UPDATED}`}
        intro={<Resumen />}
        secciones={secciones}
        pregunta="¿Tenés un problema con tu pedido?"
        correo="hotclick.cr@gmail.com"
        enlaces={ENLACES}
      />
    </>
  )
}
