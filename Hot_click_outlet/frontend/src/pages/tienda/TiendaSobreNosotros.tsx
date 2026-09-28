import { CLASE_TARJETA_TIENDA } from './tiendaTheme'
import type { EmpresaTiendaPublica } from '@/types/tienda'

function fechaLegible(iso: string) {
  const fecha = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleDateString('es-CR', { year: 'numeric', month: 'long' })
}

function horaLegible(hora?: string) {
  if (!hora) return ''
  const [h, m] = hora.split(':')
  return `${h}:${m}`
}

/**
 * Encabezado informativo del perfil público del vendedor: descripción,
 * sello de factura electrónica (solo si aplica), contacto y retiro en tienda.
 */
export default function TiendaSobreNosotros({ empresa }: { empresa: EmpresaTiendaPublica | null }) {
  if (!empresa) return null
  const { descripcion, categoriaNegocio, enHotclickDesde, facturaElectronica, whatsapp, instagram, retiro, zonaEnvio } = empresa

  const sinContenido = !descripcion && !categoriaNegocio && !enHotclickDesde && !facturaElectronica
    && !whatsapp && !instagram && !retiro && !zonaEnvio
  if (sinContenido) return null

  return (
    <section className={`${CLASE_TARJETA_TIENDA} p-4 sm:p-5 space-y-3`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {categoriaNegocio && (
          <span className="px-2.5 py-1 rounded-full font-medium" style={{ background: 'var(--t-surface-2, #F1F3F6)', color: 'var(--t-text)' }}>
            {categoriaNegocio}
          </span>
        )}
        {enHotclickDesde && (
          <span className="text-[var(--t-muted)]">En HotClick desde {fechaLegible(enHotclickDesde)}</span>
        )}
        {facturaElectronica && (
          <span className="px-2.5 py-1 rounded-full font-medium flex items-center gap-1" style={{ background: '#E9F7F0', color: '#178A50' }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Emite factura electrónica
          </span>
        )}
      </div>

      {descripcion && (
        <p className="text-sm leading-relaxed text-[var(--t-text)]">{descripcion}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium border border-[var(--t-border)] text-[var(--t-text)]"
          >
            WhatsApp
          </a>
        )}
        {instagram && (
          <a
            href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center gap-1.5 px-3 rounded-lg text-sm font-medium border border-[var(--t-border)] text-[var(--t-text)]"
          >
            Instagram
          </a>
        )}
      </div>

      {retiro && (
        <div className="pt-2 border-t border-[var(--t-border)] text-sm">
          <p className="font-semibold text-[var(--t-text)]">Retiro en tienda disponible</p>
          <p className="text-[var(--t-muted)]">
            {[retiro.direccion, retiro.canton, retiro.provincia].filter(Boolean).join(', ')}
          </p>
          {retiro.horarioApertura && retiro.horarioCierre && (
            <p className="text-[var(--t-muted)]">
              Horario: {horaLegible(retiro.horarioApertura)} a {horaLegible(retiro.horarioCierre)}
            </p>
          )}
        </div>
      )}

      {!retiro && zonaEnvio && (
        <p className="text-sm text-[var(--t-muted)]">Envía a {zonaEnvio}</p>
      )}
    </section>
  )
}
