import { motion, AnimatePresence } from 'framer-motion'
import type { Dispatch, SetStateAction } from 'react'
import type { Location } from 'react-router-dom'
import NavbarMobileExplorar from './NavbarMobileExplorar'
import NavbarMobileInformacion from './NavbarMobileInformacion'
import NavbarMobileCuenta from './NavbarMobileCuenta'
import NavbarMobileWhatsApp from './NavbarMobileWhatsApp'
import type { CategoriaNavbar } from './useNavbar'

export type NavbarMobileMenuProps = {
  menuOpen: boolean
  location: Location
  token: string | null
  userName: string | null
  isAdmin: () => boolean
  categoriasOpen: boolean
  setCategoriasOpen: Dispatch<SetStateAction<boolean>>
  categoriasPadre: CategoriaNavbar[]
  loadCategorias: () => void
  setMenuOpen: Dispatch<SetStateAction<boolean>>
  onLogout: () => void
}

/** Menú móvil del navbar — bit-idéntico al original. */
export default function NavbarMobileMenu({
  menuOpen,
  location,
  token,
  userName,
  isAdmin,
  categoriasOpen,
  setCategoriasOpen,
  categoriasPadre,
  loadCategorias,
  setMenuOpen,
  onLogout,
}: NavbarMobileMenuProps) {
  return (
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="hc-mobile-menu fixed top-14 left-0 right-0 bottom-0 z-[60] md:hidden overflow-y-auto"
            style={{ backgroundColor: 'var(--hc-bg)', borderTop: '1px solid var(--hc-border)' }}
          >
            {/* Subtle grid texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{
              backgroundImage: 'linear-gradient(var(--hc-text) 1px, transparent 1px), linear-gradient(90deg, var(--hc-text) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }} />

            <div className="relative px-4 pt-4 pb-24 flex flex-col gap-6">

              <NavbarMobileExplorar
                location={location}
                categoriasOpen={categoriasOpen}
                setCategoriasOpen={setCategoriasOpen}
                categoriasPadre={categoriasPadre}
                loadCategorias={loadCategorias}
                setMenuOpen={setMenuOpen}
              />

              <div style={{ height: 1, backgroundColor: 'var(--hc-border)' }} />

              <NavbarMobileInformacion location={location} setMenuOpen={setMenuOpen} />

              <div style={{ height: 1, backgroundColor: 'var(--hc-border)' }} />

              <NavbarMobileCuenta
                token={token}
                userName={userName}
                isAdmin={isAdmin}
                setMenuOpen={setMenuOpen}
                onLogout={onLogout}
              />

              <NavbarMobileWhatsApp />

            </div>
          </motion.div>
        )}
      </AnimatePresence>
  )
}
