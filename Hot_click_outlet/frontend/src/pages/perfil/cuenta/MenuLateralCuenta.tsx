import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar } from './piezasCuenta'
import { iniciales } from './cuentaHelpers'
import { IcoBandeja, IcoCaja, IcoCasa, IcoCorazon, IcoEscudo, IcoEstrella, IcoSalir } from './iconosCuenta'

export type SeccionCuenta = 'resumen' | 'pedidos' | 'solicitudes' | 'favoritos' | 'opiniones' | 'seguridad'

const ENTRADAS: { id: SeccionCuenta; to: string; clave: string; icono: ReactNode }[] = [
  { id: 'resumen', to: '/perfil', clave: 'cuenta.menu.resumen', icono: <IcoCasa /> },
  { id: 'pedidos', to: '/mis-pedidos', clave: 'cuenta.menu.pedidos', icono: <IcoCaja /> },
  { id: 'solicitudes', to: '/servicios?vista=solicitudes', clave: 'cuenta.menu.solicitudes', icono: <IcoBandeja /> },
  { id: 'favoritos', to: '/wishlist', clave: 'cuenta.menu.favoritos', icono: <IcoCorazon /> },
  { id: 'opiniones', to: '/perfil?vista=opiniones', clave: 'cuenta.menu.opiniones', icono: <IcoEstrella /> },
  { id: 'seguridad', to: '/perfil?vista=seguridad', clave: 'cuenta.menu.seguridad', icono: <IcoEscudo /> },
]

type MenuLateralCuentaProps = {
  activa: SeccionCuenta
  nombre: string | null
  correo: string | null
  onCerrarSesion: () => void
}

/** Menú lateral de Mi cuenta en escritorio: Figma `30:1500` (260 px, relleno 12, filas de 10 px). */
export default function MenuLateralCuenta({ activa, nombre, correo, onCerrarSesion }: MenuLateralCuentaProps) {
  const { t } = useTranslation()
  const nombreCorto = (nombre ?? '').trim().split(/\s+/).slice(0, 2).join(' ')
  return (
    <nav aria-label={t('cuenta.menu.etiqueta')} className="flex w-[260px] shrink-0 flex-col gap-1 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-3 leading-[normal]">
      <div className="flex items-center gap-[10px] p-[10px]">
        <Avatar texto={iniciales(nombre)} tam={40} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-[14px] font-semibold text-hc-n-900">{nombreCorto}</p>
          <p className="truncate text-[12px] text-hc-n-500">{correo}</p>
        </div>
      </div>
      {ENTRADAS.map((entrada) => {
        const esActiva = entrada.id === activa
        return (
          <Link
            key={entrada.id}
            to={entrada.to}
            aria-current={esActiva ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-[14px] ${esActiva ? 'bg-hc-blue-50 font-semibold text-hc-blue-600' : 'font-medium text-hc-n-900 hover:bg-hc-n-50'}`}
          >
            {entrada.icono}
            {t(entrada.clave)}
          </Link>
        )
      })}
      <button type="button" onClick={onCerrarSesion} className="flex items-center gap-3 rounded-[10px] px-3 py-[10px] text-left text-[14px] font-medium text-hc-red-500 hover:bg-hc-n-50">
        <IcoSalir />
        {t('cuenta.menu.cerrarSesion')}
      </button>
    </nav>
  )
}
