import FormularioBusqueda from './FormularioBusqueda'
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

const BENEFICIOS = [
  { titulo: 'En tu local', texto: 'Escaneamos y registramos sin que muevas nada.' },
  { titulo: 'Con o sin código', texto: 'Creamos SKU y etiquetas para lo que no tiene.' },
  { titulo: 'Listo para vender', texto: 'Cargamos todo a tu catálogo de HOTCLICK.' },
]

/**
 * Solicitud de digitalización y etiquetado de inventario. Figma solo dibuja la opción en el inicio (`28:1429`):
 * el contenido y el formulario se conservan con el estilo del formulario de `28:1486`.
 */
export default function VistaDigitalizacion(props: FormularioBusquedaProps) {
  return (
    <div className="flex flex-col leading-[normal]">
      <section className="flex flex-col gap-4 bg-hc-n-0 px-4 py-5 lg:mt-6 lg:rounded-[16px]">
        <p className="text-[15px] font-medium leading-[22px] text-hc-n-900">
          Vamos a tu local, registramos tus productos y los dejamos listos para vender en HOTCLICK.
        </p>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="flex flex-col gap-0.5 rounded-[12px] border border-hc-n-200 p-3">
              <span className="text-[13px] font-semibold text-hc-n-900">{b.titulo}</span>
              <span className="text-[12px] leading-4 text-hc-n-600">{b.texto}</span>
            </li>
          ))}
        </ul>
        <details className="rounded-[12px] border border-hc-n-200 px-3 py-2">
          <summary className="flex min-h-[40px] cursor-pointer items-center text-[13px] font-semibold text-hc-blue-600">Qué incluye el servicio</summary>
          <ul className="flex flex-col gap-[6px] pb-2 pt-1">
            {INCLUSIONES.map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-[18px] text-hc-n-600">
                <span aria-hidden="true" className="shrink-0 font-bold text-hc-blue-600">·</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="pb-2 text-[12px] leading-[17px] text-hc-n-600">
            Los códigos de barras del fabricante se conservan. Para productos sin código usamos SKU internos HOTCLICK
            (HC-000001…), que no son códigos comerciales oficiales.
          </p>
        </details>
        <p className="text-[13px] text-hc-n-600">Completá el formulario de abajo y te contactamos para coordinar la visita.</p>
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
