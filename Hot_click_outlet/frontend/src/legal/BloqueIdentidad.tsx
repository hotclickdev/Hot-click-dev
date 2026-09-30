import { IDENTIDAD_COMERCIANTE } from '@/legal/identidadComerciante'

/** Datos públicos del comerciante, compartidos por privacidad, términos y devoluciones. */
export default function BloqueIdentidad() {
  const id = IDENTIDAD_COMERCIANTE
  return (
    <>
      <p>
        Nombre comercial: <strong>{id.nombreComercial}</strong>. Sitio:{' '}
        <a href={id.sitio} style={{ color: 'var(--hc-accent)' }}>{id.dominio}</a>.
      </p>
      <ul>
        <li>
          Teléfono y WhatsApp:{' '}
          <a href={`https://wa.me/${id.telefonoWa}`} style={{ color: 'var(--hc-accent)' }} target="_blank" rel="noopener noreferrer">
            {id.telefono}
          </a>
        </li>
        <li>
          Correo:{' '}
          <a href={`mailto:${id.correo}`} style={{ color: 'var(--hc-accent)' }}>{id.correo}</a>
        </li>
        <li>Razón social o nombre del titular: se publicará en este bloque cuando el titular la confirme.</li>
        <li>Cédula física o jurídica: se publicará en este bloque cuando el titular la confirme.</li>
        <li>Domicilio y cantón: se publicarán en este bloque cuando el titular los confirme.</li>
      </ul>
      <p>
        Mientras esos datos se confirman, los reclamos y las solicitudes sobre datos personales se reciben en el correo y el WhatsApp de esta sección.
      </p>
    </>
  )
}
