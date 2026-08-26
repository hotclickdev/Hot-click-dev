import { useEffect, useState } from 'react'
import MainLayout from '@/layouts/MainLayout'
import { productService } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import { useToast } from '@/components/ui/Toast'
import HeroRotator from '@/components/ui/HeroRotator'
import DescubriBanner from './home/DescubriBanner'
import TrustStrip from './home/TrustStrip'
import ConveniosMarquee from './home/ConveniosMarquee'
import CategoryBrowse from './home/CategoryBrowse'
import ShippingSection from './home/ShippingSection'
import TestimonialsCarousel from './home/TestimonialsCarousel'
import HomeSeo from './home/HomeSeo'
import DestacadosSection from './home/DestacadosSection'
import HowItWorks from './home/HowItWorks'
import RecentlyViewedSection from './home/RecentlyViewedSection'
import HomeMarcas from './home/HomeMarcas'
import ServiciosHotPromo from './home/ServiciosHotPromo'
import HomeCta from './home/HomeCta'
import HomeJobsHero from './home/HomeJobsHero'
import SobreHotClick from './home/SobreHotClick'

export default function HomePage() {
  const [destacados, setDestacados] = useState([])
  const [marcas, setMarcas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [productsMuestra, setProductsMuestra] = useState([])
  const toast = useToast()

  useEffect(() => {
    productService.getDestacados()
      .then(({ data }) => setDestacados(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => toast({ message: 'Error al cargar destacados', type: 'error' }))
    marcaService.getPublicas()
      .then(({ data }) => setMarcas(Array.isArray(data) ? data : []))
      .catch(() => toast({ message: 'Error al cargar marcas', type: 'error' }))
    productService.getCategories()
      .then(({ data }) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => toast({ message: 'Error al cargar categorías', type: 'error' }))
    productService.getAll(0, 60)
      .then(({ data }) => {
        const content = data.content ?? data ?? []
        setProductsMuestra(Array.isArray(content) ? content.map(p => ({
          id: p.id ?? p.idProducto,
          categoriaId: p.categoriaId ?? p.idCategoria ?? p.categoria?.id,
          imagenUrl: p.imagenPrincipalUrl ?? p.imagenUrl ?? p.imagen,
          nombre: p.nombreProducto ?? p.nombre ?? p.titulo,
        })) : [])
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
