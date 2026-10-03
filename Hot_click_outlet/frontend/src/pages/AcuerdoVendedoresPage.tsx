import { Link } from 'react-router-dom'
import Seo from '@/components/seo/Seo'
import PaginaLegal, { type EnlaceLegal } from '@/components/comprador/PaginaLegal'

const LAST_UPDATED = '5 de junio de 2025'

const clausulas = [
  {
    id: 'condicion',
    num: 'CLÁUSULA PRIMERA',
    title: 'Condición Jurídica y Limitación de Uso',
    content: (
      <p>El Vendedor reconoce y acepta que los datos personales de los Clientes que le sean facilitados por HotClick para la ejecución de los pedidos son propiedad exclusiva de los titulares (los Clientes). El Vendedor actuará bajo la figura de <strong>Encargado de Tratamiento</strong>, de conformidad con lo dispuesto en la Ley N.° 8968 y su Reglamento, y se obliga a utilizar dicha información única y exclusivamente para la preparación del paquete y la entrega física del producto vendido.</p>
    ),
  },
  {
    id: 'prohibiciones',
    num: 'CLÁUSULA SEGUNDA',
    title: 'Prohibiciones Absolutas',
    content: (
      <>
        <p>Queda terminantemente prohibido al Vendedor:</p>
        <ul>
          <li><strong>a)</strong> Utilizar los datos de contacto de los Clientes para fines publicitarios, envío de promociones, mercadeo directo o inclusión en bases de datos propias —ya sea vía WhatsApp, correo electrónico, llamadas telefónicas u otros medios—, salvo que cuente con un consentimiento informado independiente y directo otorgado por el Cliente, en cumplimiento de los artículos 5 y 7 de la Ley N.° 8968.</li>
          <li><strong>b)</strong> Ceder, vender, transferir o divulgar los datos personales facilitados por la Plataforma a cualquier tercero, sea este una persona física o jurídica, bajo cualquier modalidad, gratuita u onerosa.</li>
          <li><strong>c)</strong> Utilizar los datos para finalidades distintas a las expresamente autorizadas en la presente cláusula.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'seguridad',
    num: 'CLÁUSULA TERCERA',
    title: 'Deber de Seguridad y Destrucción de Datos',
    content: (
      <>
        <p>El Vendedor se compromete a implementar las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales recibidos y evitar su alteración, pérdida, tratamiento o acceso no autorizado, de conformidad con el artículo 10 de la Ley N.° 8968.</p>
        <p>Una vez transcurrido el plazo de garantía legal del producto vendido, o en todo caso dentro de los <strong>noventa (90) días naturales</strong> siguientes a la entrega efectiva del mismo, el Vendedor asume la obligación de destruir o borrar de forma definitiva e irrecuperable cualquier registro, anotación o almacenamiento —en formato digital o físico— que conserve de los datos personales del Cliente.</p>
      </>
    ),
  },
  {
    id: 'indemnidad',
    num: 'CLÁUSULA CUARTA',
    title: 'Indemnidad y Penalidades (Deslinde de Responsabilidad)',
    content: (
      <>
        <p>En caso de que el Vendedor incumpla las obligaciones dispuestas en el presente documento o en la Ley N.° 8968, provocando que un Cliente interponga una denuncia o procedimiento administrativo ante la <strong>Agencia de Protección de Datos de los Habitantes (PRODHAB)</strong> en contra de HotClick, el Vendedor se obliga a mantener a HotClick completamente indemne de toda responsabilidad derivada de dicho incumplimiento.</p>
        <p>En consecuencia, el Vendedor asumirá de manera directa y exclusiva:</p>
        <ul>
          <li><strong>a)</strong> El pago íntegro de las multas administrativas impuestas por la PRODHAB que tengan su origen en el incumplimiento del Vendedor.</li>
          <li><strong>b)</strong> Los daños y perjuicios, costas procesales y honorarios de abogados en los que HotClick deba incurrir para su defensa legal ante cualquier instancia administrativa o judicial.</li>
          <li><strong>c)</strong> La responsabilidad civil ante el titular de los datos por los daños y perjuicios derivados del tratamiento ilícito realizado por el Vendedor.</li>
        </ul>
        <p>El incumplimiento de cualquiera de las obligaciones establecidas en el presente acuerdo facultará a HotClick a <strong>resolver de pleno derecho</strong> la relación comercial y a cerrar de forma inmediata e indefinida la cuenta del Vendedor en la Plataforma, sin perjuicio del ejercicio de las acciones judiciales civiles y penales que correspondan conforme al ordenamiento jurídico costarricense.</p>
      </>
    ),
  },
  {
    id: 'aceptacion',
    num: 'CLÁUSULA QUINTA',
    title: 'Aceptación',
    content: (
      <p>El Vendedor manifiesta haber leído, comprendido y aceptado en su totalidad el contenido del presente Acuerdo al momento de completar su proceso de registro en la Plataforma HotClick, lo cual constituye su consentimiento expreso, libre e inequívoco con plenos efectos jurídicos.</p>
    ),
  },
  {
    id: 'jurisdiccion',
    num: 'CLÁUSULA SEXTA',
    title: 'Ley Aplicable y Jurisdicción',
    content: (
      <p>El presente instrumento se rige por las leyes de la República de Costa Rica. Para la resolución de controversias derivadas de su interpretación, aplicación o incumplimiento, las partes se someten a la jurisdicción de los Tribunales de Justicia de San José, Costa Rica. Para consultas, escribir a <a href="mailto:hotclick.cr@gmail.com">hotclick.cr@gmail.com</a>.</p>
    ),
  },
]

const ENLACES: EnlaceLegal[] = [
  { to: '/envios', texto: 'Envíos' },
  { to: '/devoluciones', texto: 'Devoluciones' },
  { to: '/terminos', texto: 'Términos' },
  { to: '/privacidad', texto: 'Privacidad' },
  { to: '/cookies', texto: 'Cookies' },
]

export default function AcuerdoVendedoresPage() {
  return (
    <>
      <Seo
        title="Acuerdo de Vendedores — HotClick Costa Rica"
        description="Obligaciones de los vendedores HotClick sobre datos personales de clientes: Encargado de Tratamiento, prohibiciones y deberes conforme a la Ley N.° 8968."
        url="https://hotclick.lat/acuerdo-vendedores"
      />
      <PaginaLegal
        titulo="Acuerdo para vendedores"
        encabezado="Acuerdo para Vendedores"
        subtitulo={`Ley N.° 8968 · Convenio Accesorio · Última actualización: ${LAST_UPDATED}`}
        intro={<p>Convenio Accesorio de Regulación de Datos Personales para Comercios Afiliados. Este acuerdo vinculante forma parte integrante de los <Link to="/terminos">Términos y Condiciones</Link> y del contrato comercial de afiliación al marketplace HotClick. El Vendedor lo acepta de pleno derecho al completar su proceso de registro.</p>}
        secciones={clausulas}
        pregunta="¿Preguntas sobre este acuerdo?"
        correo="hotclick.cr@gmail.com"
        enlaces={ENLACES}
      />
    </>
  )
}
