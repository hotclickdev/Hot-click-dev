import Seo from '@/components/seo/Seo'
import PaginaLegal, { TarjetaLegal, type EnlaceLegal } from '@/components/comprador/PaginaLegal'
import { BloqueInformativo } from '@/components/comprador/PaginaInformativa'

const LAST_UPDATED = '5 de junio de 2025'

const COOKIES_TABLE = [
  { nombre: 'hotclick-cart (localStorage)', categoria: 'Técnica', finalidad: 'Carrito de compras persistido localmente', duracion: 'Sesión / manual' },
  { nombre: 'hotclick-auth (localStorage)', categoria: 'Técnica', finalidad: 'Token JWT de autenticación', duracion: 'Hasta logout' },
  { nombre: 'cookie-consent (localStorage)', categoria: 'Técnica', finalidad: 'Preferencias de consentimiento del usuario', duracion: '1 año' },
  { nombre: '_ga, _ga_*', categoria: 'Analítica', finalidad: 'Google Analytics 4 — estadísticas agregadas', duracion: '2 años' },
  { nombre: 'ph_*, __ph_*', categoria: 'Analítica', finalidad: 'PostHog — analítica de producto y embudos', duracion: '1 año' },
  { nombre: '_clck, _clsk, CLID', categoria: 'Analítica', finalidad: 'Microsoft Clarity — mapas de calor y sesión (anonimizada)', duracion: '1 año' },
  { nombre: '__clerk_*', categoria: 'Técnica', finalidad: 'Autenticación social (Clerk)', duracion: 'Sesión' },
]

const clausulas = [
  {
    id: 'objeto',
    num: 'CLÁUSULA PRIMERA',
    title: 'Definición y Objeto',
    content: (
      <p>HotClick utiliza tecnologías de seguimiento denominadas cookies y almacenamiento local (en adelante, las "Cookies") para optimizar la experiencia de navegación, recordar las preferencias del usuario, mantener la sesión activa y gestionar el carrito de compras. Conforme a la normativa de la PRODHAB, el uso de estas tecnologías que procesan datos de identificación técnica (direcciones IP, identificadores de dispositivo y patrones de navegación) requiere el consentimiento del usuario.</p>
    ),
  },
  {
    id: 'clasificacion',
    num: 'CLÁUSULA SEGUNDA',
    title: 'Clasificación de las Cookies Utilizadas',
    content: (
      <>
        <p>La Plataforma emplea las siguientes categorías de Cookies:</p>
        <ul>
          <li><strong>a) Técnicas u Obligatorias:</strong> Esenciales para el correcto funcionamiento del sitio, la autenticación de usuarios y la seguridad de las transacciones. No pueden ser desactivadas.</li>
          <li><strong>b) De Rendimiento y Analítica:</strong> Administradas por terceros (Google Analytics 4, PostHog, Microsoft Clarity) que recopilan información estadística anónima o agregada para evaluar el rendimiento de la Plataforma y corregir errores. Se activan únicamente con consentimiento expreso.</li>
          <li><strong>c) De Publicidad Comportamental:</strong> Utilizadas para segmentar perfiles de interés y desplegar anuncios publicitarios personalizados. Requieren consentimiento explícito independiente.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'desactivacion',
    num: 'CLÁUSULA TERCERA',
    title: 'Mecanismo de Desactivación',
    content: (
      <p>El usuario conserva la facultad de configurar su navegador web para bloquear, restringir o eliminar las Cookies en cualquier momento. No obstante, el usuario acepta que la desactivación de las Cookies técnicas puede impedir o degradar significativamente la funcionalidad de la Plataforma, imposibilitando la ejecución de compras. Las preferencias de cookies analíticas pueden actualizarse en cualquier momento a través del panel de consentimiento disponible en la Plataforma.</p>
    ),
  },
  {
    id: 'fundamento',
    num: 'CLÁUSULA CUARTA',
    title: 'Fundamento Legal',
    content: (
      <>
        <p>El tratamiento de datos mediante cookies se fundamenta en:</p>
        <ul>
          <li><strong>Ley N.° 8968</strong>, artículo 5, inciso e): consentimiento libre, específico e informado.</li>
          <li><strong>Decreto N.° 37554-JP</strong>, artículo 9: requisitos formales del consentimiento informado.</li>
          <li><strong>Principio de proporcionalidad</strong> reconocido por la PRODHAB: solo se recopilan datos estrictamente necesarios para cada finalidad.</li>
        </ul>
        <p>Para ejercer derechos ARCO sobre datos de navegación, dirigir solicitud escrita a <a href="mailto:hotclick.cr@gmail.com">hotclick.cr@gmail.com</a>.</p>
      </>
    ),
  },
]

/** Anexo con la tabla de cookies, en una tarjeta de la plantilla informativa (derivado de Figma `28:1660`). */
function AnexoTablaCookies() {
  return (
    <BloqueInformativo id="tabla" titulo="Tabla de cookies por categoría">
      <TarjetaLegal etiqueta="Anexo">
        <div className="-mx-[14px] overflow-x-auto px-[14px]">
          <table className="w-full border-collapse text-[13px] leading-[18px] text-hc-n-600">
            <thead>
              <tr className="border-b border-hc-n-200">
                {['Cookie / Tecnología', 'Categoría', 'Finalidad', 'Duración'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 text-left text-[12px] font-semibold text-hc-n-900">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COOKIES_TABLE.map((row) => (
                <tr key={row.nombre} className="border-b border-hc-n-200 last:border-0">
                  <td className="px-2 py-2 font-mono text-[12px] text-hc-n-900">{row.nombre}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-[2px] text-[11px] font-semibold ${
                      row.categoria === 'Técnica' ? 'bg-hc-green-50 text-hc-success-text' : 'bg-hc-warning-bg text-hc-warning'
                    }`}
                    >
                      {row.categoria}
                    </span>
                  </td>
                  <td className="px-2 py-2">{row.finalidad}</td>
                  <td className="whitespace-nowrap px-2 py-2">{row.duracion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TarjetaLegal>
    </BloqueInformativo>
  )
}

const ENLACES: EnlaceLegal[] = [
  { to: '/envios', texto: 'Envíos' },
  { to: '/devoluciones', texto: 'Devoluciones' },
  { to: '/terminos', texto: 'Términos' },
  { to: '/privacidad', texto: 'Privacidad' },
]

export default function CookiesPage() {
  return (
    <>
      <Seo
        title="Política de Cookies — HotClick Costa Rica"
        description="Cookies y tecnologías de seguimiento en HotClick: técnicas, analítica (GA4, PostHog, Clarity) y cómo gestionar tu consentimiento conforme a la Ley 8968."
        url="https://hotclick.lat/cookies"
      />
      <PaginaLegal
        titulo="Cookies"
        encabezado="Política de Cookies"
        subtitulo={`PRODHAB · Ley N.° 8968 · Última actualización: ${LAST_UPDATED}`}
        intro={<p>De conformidad con la <strong>Ley N.° 8968</strong> y los principios de transparencia y consentimiento informado reconocidos por la PRODHAB, HotClick informa al usuario sobre las tecnologías de seguimiento empleadas en la Plataforma.</p>}
        secciones={clausulas}
        anexo={<AnexoTablaCookies />}
        pregunta="¿Desea ejercer sus derechos ARCO sobre sus datos de navegación?"
        correo="hotclick.cr@gmail.com"
        enlaces={ENLACES}
      />
    </>
  )
}
