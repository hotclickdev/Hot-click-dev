import type { NavLinkItem } from './NavbarDesktopNav'

/**
 * Menú principal del marketplace: Productos · Servicios HOT · Emprender · Más.
 * Vender apunta a la landing /emprende (el alta sigue en /registro-empresa).
 */
export function linksNavbarPrincipal(t: (key: string) => string): NavLinkItem[] {
  return [
    { href: '/productos', label: t('nav.productos') },
    { href: '/servicios', label: t('nav.servicios') },
    { href: '/emprende', label: t('nav.emprender') },
    {
      id: 'mas',
      label: t('nav.mas'),
      menu: [
        { href: '/descubri', label: t('nav.descubri') },
        { href: '/emprende', label: t('nav.vender') },
        { href: '/informacion', label: t('nav.informacion') },
        { href: '/nosotros', label: t('nav.nosotros') },
        { href: '/contacto', label: t('nav.contacto') },
      ],
    },
  ]
}
