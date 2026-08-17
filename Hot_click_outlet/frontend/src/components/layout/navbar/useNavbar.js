import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '@/services/api'
import useAuthStore from '@/store/authStore'
import useCartStore from '@/store/cartStore'

/**
 * Estado scroll, carrito bounce y categorías del navbar — bit-idéntico al original.
 */
export function useNavbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, userName, logout, isAdmin } = useAuthStore()
  const cartCount = useCartStore((s) => s.count())
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartBounce, setCartBounce] = useState(false)
  const prevCartCount = useRef(cartCount)
  const [categoriasOpen, setCategoriasOpen] = useState(false)
  const [categoriasPadre, setCategoriasPadre] = useState([])

  const loadCategorias = useCallback(() => {
    if (categoriasPadre.length > 0) return
    api.get('/categorias/publicas')
      .then(({ data }) => {
        const all = Array.isArray(data) ? data : []
        setCategoriasPadre(all.filter((c) => !c.padreId))
      })
      .catch((err) => { console.error('[useNavbar] categorias', err) })
  }, [categoriasPadre.length])

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 600)
    }
    prevCartCount.current = cartCount
  }, [cartCount])

  useEffect(() => {
    let rafId = null
    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        const y = globalThis.scrollY
        setScrolled(y > 20)
        const docH = document.documentElement.scrollHeight - globalThis.innerHeight
        setScrollProgress(docH > 0 ? Math.min(y / docH, 1) : 0)
        rafId = null
      })
    }
    globalThis.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      globalThis.removeEventListener('scroll', onScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  useEffect(() => { setMenuOpen(false); setCategoriasOpen(false) }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return {
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
  }
}
