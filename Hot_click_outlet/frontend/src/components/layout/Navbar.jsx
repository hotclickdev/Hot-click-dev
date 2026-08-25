import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HotClickMark, HotClickWordmark } from '@/components/ui/BrandLogo'
import { useNavbar } from './navbar/useNavbar'
import NavbarDesktopNav from './navbar/NavbarDesktopNav'
import NavbarActions from './navbar/NavbarActions'
import NavbarMobileMenu from './navbar/NavbarMobileMenu'
import { MenuIcon } from './navbar/navbarIcons'

export default function Navbar() {
  const { t } = useTranslation()
  const {
    location,
    token,
    userName,
    isAdmin,
    cartCount,
    scrolled,
    scrollProgress,
    menuOpen,
    setMenuOpen,
    cartBounce,
    categoriasOpen,
    setCategoriasOpen,
    categoriasPadre,
    loadCategorias,
    handleLogout,
  } = useNavbar()

  const navLinks = [
    { href: '/', label: t('nav.inicio') },
    { href: '/productos', label: t('nav.productos') },
    { href: '/servicios', label: t('nav.servicios'), highlight: true },
    { href: '/informacion', label: t('nav.informacion') },
    { href: '/nosotros', label: t('nav.nosotros') },
    { href: '/contacto', label: t('nav.contacto') },
  ]

  return (
    <>
      <div
        className="hc-progress"
        style={{ transform: `scaleX(${scrollProgress})`, opacity: scrollProgress > 0.01 ? 1 : 0 }}
      />

      <header
        className={`
          fixed top-0 left-0 right-0 z-40 transition-all duration-300
          ${scrolled
            ? 'hc-navbar-scrolled backdrop-blur-xl border-b shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
            : 'bg-transparent'
          }
        `}
        style={scrolled ? { borderBottomColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' } : {}}
      >
        <nav className={`max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 hc-nav-inner ${scrolled ? 'h-12' : 'h-14'}`}>
          <div className="flex items-center gap-1">
            <button type="button"
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: 'var(--hc-muted)' }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t('nav.menu')}
              aria-expanded={menuOpen}
            >
              <MenuIcon open={menuOpen} />
            </button>

            <Link to="/" className="flex items-center gap-2 shrink-0 group" aria-label="HOTCLICK — inicio">
              <HotClickMark size={30} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <HotClickWordmark className="hidden sm:inline text-[18px] transition-opacity duration-200 group-hover:opacity-80" />
            </Link>
          </div>

          <NavbarDesktopNav navLinks={navLinks} pathname={location.pathname} />

          <NavbarActions
            t={t}
            token={token}
            userName={userName}
            isAdmin={isAdmin}
            cartCount={cartCount}
            cartBounce={cartBounce}
            onLogout={handleLogout}
          />
        </nav>
      </header>

      <NavbarMobileMenu
        menuOpen={menuOpen}
        location={location}
        token={token}
        userName={userName}
        isAdmin={isAdmin}
        categoriasOpen={categoriasOpen}
        setCategoriasOpen={setCategoriasOpen}
        categoriasPadre={categoriasPadre}
        loadCategorias={loadCategorias}
        setMenuOpen={setMenuOpen}
        onLogout={handleLogout}
      />
    </>
  )
}
