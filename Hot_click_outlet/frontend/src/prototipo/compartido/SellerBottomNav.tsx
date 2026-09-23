import { useLocation } from 'react-router-dom'
import { useSellerRuta } from './SellerPlanContext'
import iconProductos from './assets/icon-productos.svg?raw'
import iconTienda from './assets/icon-tienda.svg?raw'
import iconOpciones from './assets/icon-opciones.svg?raw'
import BottomNavPrimitivo, { type ItemBottomNavPrimitivo } from '@/components/layout/BottomNavPrimitivo'
import { IconoSvgTab, IconoMenuTab, IconoReportesTab } from './bottomNavIconos'

/**
 * Bottom nav PYME / Negocio Plus — Menú Principal al centro.
 */
export default function SellerBottomNav() {
  const ruta = useSellerRuta()
  const { pathname } = useLocation()

  const items: ItemBottomNavPrimitivo[] = [
    {
      key: 'productos',
      to: ruta('productos'),
      label: 'Productos',
      renderIcon: ({ active }) => <IconoSvgTab svg={iconProductos} active={active} />,
    },
    {
      key: 'tienda',
      to: ruta('tienda'),
      label: 'Tienda',
      renderIcon: ({ active }) => <IconoSvgTab svg={iconTienda} active={active} />,
    },
    {
      key: 'menu',
      to: ruta(''),
      label: 'Menú Principal',
      end: true,
      renderIcon: ({ active }) => <IconoMenuTab active={active} />,
    },
    {
      key: 'reportes',
      to: ruta('reportes'),
      label: 'Reportes',
      renderIcon: ({ active }) => <IconoReportesTab active={active} />,
    },
    {
      key: 'opciones',
      to: ruta('opciones'),
      label: 'Opciones',
      renderIcon: ({ active }) => <IconoSvgTab svg={iconOpciones} active={active} />,
    },
  ]

  return <BottomNavPrimitivo items={items} pathname={pathname} ariaLabel="Navegación del vendedor" />
}
