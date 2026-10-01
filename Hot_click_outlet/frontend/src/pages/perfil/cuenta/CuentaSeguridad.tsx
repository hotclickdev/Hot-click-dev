import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { IcoCandado, IcoChevron, IcoEscudo, IcoSalir, IcoSobre, IcoTelefono, IcoUsuario } from './iconosCuenta'

type FilaProps = { icono: ReactNode; etiqueta: string; valor: string; final?: ReactNode; onClick?: () => void }

/** Fila de dato: ícono de 20 px, etiqueta de 12 y valor de 14 Medium (Figma `30:1409`). */
function Fila({ icono, etiqueta, valor, final, onClick }: FilaProps) {
  const contenido = (
    <>
      <span className="text-hc-n-600">{icono}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-px text-left">
        <span className="text-[12px] text-hc-n-500">{etiqueta}</span>
        <span className="truncate text-[14px] font-medium text-hc-n-900">{valor}</span>
      </span>
      {final}
    </>
  )
  const clase = 'flex w-full items-center gap-3 py-3 leading-[normal]'
  return onClick
    ? <button type="button" onClick={onClick} className={clase}>{contenido}</button>
    : <div className={clase}>{contenido}</div>
}

function Titulo({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase leading-[normal] text-hc-n-500">{children}</p>
}

function Tarjeta({ children }: { children: ReactNode }) {
  return <div className="flex flex-col rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[2px]">{children}</div>
}

/** Interruptor de 40 x 24: azul cuando está activado (Figma `30:1465`). */
function Interruptor({ activo, interactivo, onCambiar, etiqueta }: { activo: boolean; interactivo: boolean; onCambiar: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={!interactivo}
      onClick={onCambiar}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${activo ? 'bg-hc-blue-600' : 'bg-hc-n-200'} ${interactivo ? '' : 'cursor-default'}`}
    >
      <span className={`absolute top-[3px] size-[18px] rounded-full bg-hc-n-0 shadow transition-all ${activo ? 'left-[19px]' : 'left-[3px]'}`} />
    </button>
  )
}

type CuentaSeguridadProps = {
  nombre: string | null
  correo: string | null
  telefono: string | null
  twoFAActiva: boolean
  /** Solo ADMIN puede activar o desactivar la verificación en dos pasos (regla existente). */
  puedeCambiar2FA: boolean
  onCambiarContrasena: () => void
  onCambiar2FA: () => void
  onCerrarSesion: () => void
  /** Secciones propias de otros roles (WebAuthn de administrador). */
  extra?: ReactNode
}

/** Datos y seguridad: Figma `30:1400` (móvil; en escritorio va dentro de la columna principal). */
export default function CuentaSeguridad(props: CuentaSeguridadProps) {
  const { nombre, correo, telefono, twoFAActiva, puedeCambiar2FA, onCambiarContrasena, onCambiar2FA, onCerrarSesion, extra } = props
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-[14px] px-4 pb-5 pt-4 lg:max-w-[560px] lg:p-0">
      <Titulo>{t('cuenta.seguridad.datosPersonales')}</Titulo>
      <Tarjeta>
        <Fila icono={<IcoUsuario />} etiqueta={t('cuenta.seguridad.nombre')} valor={nombre ?? '—'} />
        <Fila icono={<IcoSobre />} etiqueta={t('cuenta.seguridad.correo')} valor={correo ?? '—'} />
        <Fila icono={<IcoTelefono />} etiqueta={t('cuenta.seguridad.telefono')} valor={telefono ?? '—'} />
      </Tarjeta>

      <Titulo>{t('cuenta.seguridad.titulo')}</Titulo>
      <Tarjeta>
        <Fila
          icono={<IcoCandado />}
          etiqueta={t('cuenta.seguridad.contrasena')}
          valor={t('cuenta.seguridad.cambiarContrasena')}
          final={<span className="text-hc-n-500"><IcoChevron /></span>}
          onClick={onCambiarContrasena}
        />
        <Fila
          icono={<IcoEscudo />}
          etiqueta={t('cuenta.seguridad.dosPasos')}
          valor={twoFAActiva ? t('cuenta.seguridad.activada') : t('cuenta.seguridad.desactivada')}
          final={<Interruptor activo={twoFAActiva} interactivo={puedeCambiar2FA} onCambiar={onCambiar2FA} etiqueta={t('cuenta.seguridad.dosPasos')} />}
        />
      </Tarjeta>

      {extra}

      <button type="button" onClick={onCerrarSesion} className="flex items-center gap-[10px] pt-2 text-[14px] font-semibold leading-[normal] text-hc-red-500">
        <IcoSalir />
        {t('cuenta.menu.cerrarSesion')}
      </button>
    </div>
  )
}
