import { useEffect, useState } from 'react'
import MainLayout from '@/layouts/MainLayout'
import { productService } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { useToast } from '@/components/ui/Toast'
import HeroRotator from '@/components/ui/HeroRotator'
import DescubriBanner from './home/DescubriBanner'
import TrustStrip from './home/TrustStrip'
import ConveniosMarquee from './home/ConveniosMarquee'
import CategoryBrowse, { type CategoriaBrowse, type ProductoMuestraCategoria } from './home/CategoryBrowse'
import ShippingSection from './home/ShippingSection'
import TestimonialsCarousel from './home/TestimonialsCarousel'
import HomeSeo from './home/HomeSeo'
import DestacadosSection from './home/DestacadosSection'
import HowItWorks from './home/HowItWorks'
import RecentlyViewedSection from './home/RecentlyViewedSection'
import HomeMarcas, { type MarcaHome } from './home/HomeMarcas'
import ServiciosHotPromo from './home/ServiciosHotPromo'
import HomeCta from './home/HomeCta'
import HomeJobsHero from './home/HomeJobsHero'
import SobreHotClick from './home/SobreHotClick'
import type { Producto } from '@/types/producto'
import type { Pagina } from '@/types/api'

type ProductoListaHome = Producto & {
  idProducto?: number
  idCategoria?: number | string
  imagen?: string
}

function listaMarcas(data: unknown): MarcaHome[] {
  return Array.isArray(data) ? data as MarcaHome[] : []
}

function listaCategorias(data: unknown): CategoriaBrowse[] {
  return Array.isArray(data) ? data as CategoriaBrowse[] : []
}

function contenidoProductos(data: unknown): ProductoListaHome[] {
  if (Array.isArray(data)) return data as ProductoListaHome[]
  if (data && typeof data === 'object' && 'content' in data) {
    const pagina = data as Pagina<ProductoListaHome>
    return Array.isArray(pagina.content) ? pagina.content : []
  }
  return []
}

export default function HomePage() {
  const [destacados, setDestacados] = useState<Producto[]>([])
  const [marcas, setMarcas] = useState<MarcaHome[]>([])
  const [categorias, setCategorias] = useState<CategoriaBrowse[]>([])
  const [productsMuestra, setProductsMuestra] = useState<ProductoMuestraCategoria[]>([])
  const toast = useToast()

  useEffect(() => {
    productService.getDestacados()
      .then(({ data }) => setDestacados(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => toast({ message: 'Error al cargar destacados', type: 'error' }))
    marcaService.getPublicas()
      .then(({ data }) => setMarcas(listaMarcas(data)))
      .catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
    productService.getCategories()
      .then(({ data }) => setCategorias(listaCategorias(data)))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    productService.getAll(0, 60)
      .then(({ data }) => {
        const content = contenidoProductos(data)
        setProductsMuestra(content.map(p => ({
          id: p.id ?? p.idProducto,
          categoriaId: p.categoriaId ?? p.idCategoria ?? p.categoria?.id,
          imagenUrl: p.imagenPrincipalUrl ?? p.imagenUrl ?? p.imagen,
          nombre: p.nombreProducto ?? p.nombre ?? p.titulo,
        })))
      })
      .catch(() => toast({ message: 'Error al cargar productos', type: 'error' }))
  }, [toast])

  return (
    <MainLayout>
      <HomeSeo destacados={destacados} />
      <HomeJobsHero />
      <HeroRotator destacados={destacados.slice(0, 3)} />
      <TrustStrip />
      <DestacadosSection destacados={destacados} />
      <DescubriBanner />
      <CategoryBrowse products={productsMuestra} categories={categorias} />
      <RecentlyViewedSection />
      <ConveniosMarquee />
      <HomeMarcas marcas={marcas} />
      <ShippingSection />
      <HowItWorks />
      <TestimonialsCarousel />
      <ServiciosHotPromo />
      <HomeCta />
      <SobreHotClick />
    </MainLayout>
  )
}
