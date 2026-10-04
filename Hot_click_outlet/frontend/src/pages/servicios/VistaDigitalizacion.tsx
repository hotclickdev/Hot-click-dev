import FormularioBusqueda from './FormularioBusqueda'
import TituloVista from './TituloVista'
import type { FormularioBusquedaProps } from './FormularioBusqueda'

const INCLUSIONES = [
  'Escaneo de productos con código de barras.',
  'Registro manual de productos sin código.',
  'Creación de SKU internos para productos sin código.',
  'Generación e impresión de etiquetas con código de barras.',
  'Registro de nombre, categoría, precio, cantidad y demás información necesaria.',
  'Carga de los productos al catálogo de HOTCLICK.',
  'Preparación del inventario para que el negocio pueda comenzar a vender en HOTCLICK.',
]

/**
 * Solicitud de digitalización y etiquetado de inventario. Figma solo dibuja la opción en el inicio (`28:1429`):
 * el contenido y el formulario se conservan con el estilo del formulario de `28:1486`.
 */
export default function VistaDigitalizacion(props: FormularioBusquedaProps) {
  return (
    <div className="flex flex-col leading-[normal] lg:mx-auto lg:w-full lg:max-w-[560px]">
      <section className="flex flex-col gap-3 bg-hc-n-0 px-4 py-5 lg:mt-6 lg:rounded-[16px]">
        <TituloVista>Digitalizá tu inventario</TituloVista>
        <p className="text-[14px] leading-5 text-hc-n-600">
          ¿Tu negocio no tiene un inventario digital o algunos productos no tienen código de barras? No hay problema.
          HOTCLICK puede ayudarte a digitalizar tu inventario directamente en tu local.
        </p>
        <p className="text-[14px] leading-5 text-hc-n-600">
          Nuestro equipo puede escanear los productos que ya cuentan con código de barras y registrar manualmente
          aquellos que no tengan uno. Para los productos sin código, HOTCLICK puede generar un SKU interno único y
          crear una etiqueta con código de barras utilizando una impresora portátil, permitiendo que esos productos
          puedan ser escaneados posteriormente.
        </p>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-hc-n-900">El servicio puede incluir:</p>
          <ul className="flex flex-col gap-[6px]">
            {INCLUSIONES.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-[18px] text-hc-n-600">
                <span aria-hidden="true" className="shrink-0 font-bold text-hc-blue-600">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[16px] bg-hc-n-100 p-4 text-[12px] leading-[17px] text-hc-n-600">
          <strong className="font-semibold text-hc-n-900">Importante:</strong> los códigos de barras originales de los
          fabricantes se conservan sin modificaciones. Para productos sin código usamos SKU internos HOTCLICK
          (por ejemplo HC-000001, HC-000002). Estos identificadores no se presentan como códigos comerciales
          oficiales del fabricante.
        </div>
      </section>

      <FormularioBusqueda
        {...props}
        etiquetaEnviar="Solicitar servicio"
        descLabel="Contanos sobre tu negocio e inventario"
        descPh="Ej: Tienda de abarrotes en San José, ~200 productos, la mitad sin código de barras. Queremos vender en HOTCLICK."
        fotosLabel="Fotos de tu inventario (opcional)"
        ocultarPresupuesto
        nota={null}
      />
    </div>
  )
}
