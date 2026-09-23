import iconProductos from './assets/icon-productos.svg?raw'
import iconTienda from './assets/icon-tienda.svg?raw'
import iconOpciones from './assets/icon-opciones.svg?raw'
import { useLocation } from 'react-router-dom'
import { RUTA_EMPRENDEDOR } from './constants'
import BottomNavPrimitivo, { type ItemBottomNavPrimitivo } from '@/components/layout/BottomNavPrimitivo'
import { IconoSvgTab, IconoMenuTab, IconoReportesTab } from '../compartido/bottomNavIconos'

/**
 * Bottom nav Emprendedor — Menú Principal al centro.
 */
export default function EmprendedorBottomNav() {
  const { pathname } = useLocation()

  const items: ItemBottomNavPrimitivo[] = [
    {
      key: 'productos',
      to: `${RUTA_EMPRENDEDOR}/productos`,
      label: 'Productos',
      renderIcon: ({ active }) => <IconoSvgTab svg={iconProductos} active={active} />,
    },
    {
      key: 'tienda',
      to: `${RUTA_EMPRENDEDOR}/tienda`,
      label: 'Tienda',
      renderIcon: ({ active }) => <IconoSvgTab svg={iconTienda} active={active} />,
    },
    {
      key: 'menu',
      to: RUTA_EMPRENDEDOR,
      label: 'Menú Principal',
      end: true,
      renderIcon: ({ active }) => <IconoMenuTab active={active} />,
    },
    {
      key: 'reportes',
      to: `${RUTA_EMPRENDEDOR}/reportes`,
      label: 'Reportes',
      renderIcon: ({ active }) => <IconoReportesTab active={active} />,
    },
    {
      key: 'opciones',
      to: `${RUTA_EMPRENDEDOR}/opciones`,
      label: 'Opciones',
      renderIcon: ({ active }) => <IconoSvgTab svg={iconOpciones} active={active} />,
    },
  ]

  return <BottomNavPrimitivo items={items} pathname={pathname} ariaLabel="Navegación emprendedor" />
}
