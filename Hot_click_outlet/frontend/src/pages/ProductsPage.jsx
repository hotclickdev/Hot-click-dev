import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import { productService, normalizeProduct } from '@/services/productService'
import { marcaService } from '@/services/marcaService'
import Spinner from '@/components/ui/Spinner'
import QuickViewModal from '@/components/ui/QuickViewModal'
import ProductCard from '@/components/ui/ProductCard'
import useLazyLoad from '@/hooks/useLazyLoad'
import { formatPrice } from '@/utils/format'
import useCartStore from '@/store/cartStore'
import { generateItemListJsonLd } from '@/utils/jsonLd'
import ProductsAssistantPanel from '@/components/ai/ProductsAssistantPanel'

const PAGE_SIZE = 24

// ── Utilidad: construir árbol de categorías ───────────────────────────────────
function buildCategoryTree(cats) {
  const unique = [...new Map(cats.map(c => [c.id, c])).values()]
  const roots = unique.filter(c => !c.padreId && !c.categoriaPadre && !c.parentId)
  const children = (parentId) =>
    unique.filter(c => String(c.padreId ?? c.categoriaPadre?.id ?? c.parentId ?? '') === String(parentId))
  return roots.map(r => ({ ...r, children: children(r.id) }))
}

// ── Iconos SVG minimalistas por categoría ────────────────────────────────────
const CAT_ICONS = {
  // Electrónica / gadgets / celular / tecnología
  electr:    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3" />,
  gadget:    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3" />,
  celular:   <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3" />,
  tecnol:    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />,
  comput:    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />,
  // Moda / ropa / estilo
  moda:      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />,
  ropa:      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />,
  estilo:    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />,
  // Hogar / decoración / mueble
  hogar:     <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
  decor:     <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
  mueble:    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
  // Deporte / aventura
  deport:    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-1.5-.75m0-6l1.5-.75a3.354 3.354 0 013 0 3.354 3.354 0 003 0 3.354 3.354 0 013 0 3.354 3.354 0 003 0 3.354 3.354 0 011.5.75" />,
  aventur:   <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64" />,
  ejercici:  <path strokeLinecap="round" strokeLinejoin="round" d="M6.115 5.19l.319 1.913A6 6 0 008.11 10.36L9.75 12l-.387.775c-.217.433-.132.956.21 1.298l1.348 1.348c.21.21.329.497.329.795v1.089c0 .426.24.815.622 1.006l.153.076c.433.217.956.132 1.298-.21l.723-.723a8.7 8.7 0 002.288-4.042 1.087 1.087 0 00-.358-1.099l-1.33-1.108c-.251-.21-.582-.299-.905-.245l-1.17.195a1.125 1.125 0 01-.98-.314l-.295-.295a1.125 1.125 0 010-1.591l.13-.132a1.125 1.125 0 011.3-.21l.603.302a.809.809 0 001.086-1.086L14.25 7.5l1.256-.837a4.5 4.5 0 001.528-1.732l.146-.292M6.115 5.19A9 9 0 1017.18 4.64M6.115 5.19A8.965 8.965 0 0112 3c1.929 0 3.716.607 5.18 1.64" />,
  // Belleza / cosmética / natural
  belleza:   <><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></>,
  cosmet:    <><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></>,
  perfum:    <><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></>,
  // Mascotas
  mascot:    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />,
  animal:    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />,
  // Juguetes / entretenimiento
  juguet:    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />,
  entret:    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />,
  // Salud / farmacia
  salud:     <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
  farma:     <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
  // Libros / educación
  libros:    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />,
  educaci:   <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />,
  // Joyería / accesorios / reloj
  joyeria:   <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
  joyería:   <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
  accesori:  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />,
  reloj:     <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
  // Alimentación / bebida
  aliment:   <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />,
  comida:    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />,
  // Autos / motos
  auto:      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />,
}

const CAT_ICON_DEFAULT = <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />

function catSvgIcon(name) {
  if (!name) return CAT_ICON_DEFAULT
  const n = name.toLowerCase()
  for (const [k, v] of Object.entries(CAT_ICONS)) if (n.includes(k)) return v
  return CAT_ICON_DEFAULT
}

function CatIcon({ name, className = 'w-3.5 h-3.5 shrink-0' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      {catSvgIcon(name)}
    </svg>
  )
}

// ── Barra de filtros completa ─────────────────────────────────────────────────
function CatalogFilterBar({
  search, setSearch,
  categories, categoryTotalCount,
  category, setCategory,
  hasFilters, clearFilters,
  onOpenSidebar,
}) {
  const tree = useMemo(
    () => buildCategoryTree(categories).filter(c => (categoryTotalCount?.[c.id] ?? 0) > 0),
    [categories, categoryTotalCount]
  )

  return (
    <div className="sticky top-0 z-30 backdrop-blur-xl"
      style={{ background: 'color-mix(in srgb, var(--hc-bg) 94%, transparent)', borderBottom: '1px solid var(--hc-border)' }}>

      {/* — Fila 1: búsqueda + filtros — */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-2">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">

          {/* Búsqueda */}
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--hc-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="hc-input w-full"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>

          {/* Botones de filtro */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5 sm:pb-0">
            {/* Mobile: abre sidebar drawer */}
            <button
              onClick={onOpenSidebar}
              className="flex lg:hidden items-center gap-1.5 h-9 px-3 rounded-xl text-sm font-semibold border shrink-0 transition-all hover:opacity-80"
              style={{ color: 'var(--hc-text)', borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              Filtrar
            </button>

            {/* Limpiar todo */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-semibold border transition-all shrink-0 hover:opacity-70"
                style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* — Fila 2: pills de categorías con íconos — */}
      {tree.length > 0 && (
        <div
          className="overflow-x-auto scrollbar-hide"
          style={{ borderTop: '1px solid color-mix(in srgb, var(--hc-border) 55%, transparent)' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex gap-1.5 py-2 min-w-max">
              <button
                onClick={() => setCategory('')}
                className="flex items-center gap-1.5 shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all"
                style={!category
                  ? { background: 'var(--hc-accent)', color: '#fff', boxShadow: '0 2px 8px color-mix(in srgb, var(--hc-accent) 35%, transparent)' }
                  : { background: 'color-mix(in srgb, var(--hc-text) 6%, transparent)', color: 'var(--hc-text)', border: '1.5px solid var(--hc-border)' }
                }
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span>Todos</span>
              </button>

              {tree.map(cat => {
                const catName = cat.nombreCategoria ?? cat.nombre
                const isActive = String(category) === String(cat.id)
                const catCount = categoryTotalCount?.[cat.id] ?? 0
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(isActive ? '' : String(cat.id))}
                    className="flex items-center gap-1.5 shrink-0 h-8 px-3.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
                    style={isActive
                      ? { background: 'var(--hc-accent)', color: '#fff', boxShadow: '0 2px 8px color-mix(in srgb, var(--hc-accent) 35%, transparent)' }
                      : { background: 'color-mix(in srgb, var(--hc-text) 6%, transparent)', color: 'var(--hc-text)', border: '1.5px solid var(--hc-border)' }
                    }
                  >
                    <CatIcon name={catName} />
                    <span className="max-w-[100px] truncate">{catName}</span>
                    <span className="shrink-0 text-[10px] font-bold opacity-60">{catCount}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Sidebar de categorías y marcas ───────────────────────────────────────────
function CategorySidebar({
  categories, category, setCategory,
  categoryTotalCount,
  onCategorySelect,
}) {
  const tree = useMemo(
    () => buildCategoryTree(categories).filter(c => (categoryTotalCount?.[c.id] ?? 0) > 0),
    [categories, categoryTotalCount]
  )

  function handleCatSelect(id) {
    setCategory(id)
    onCategorySelect?.()
  }

  // Determina el nodo raíz "activo" para el modo drill-down
  const drilledNode = useMemo(() => {
    if (!category) return null
    const activeCat = categories.find(c => String(c.id) === String(category))
    if (!activeCat) return null
    if (activeCat.padreId) {
      return tree.find(r => String(r.id) === String(activeCat.padreId)) ?? null
    }
    const rootNode = tree.find(r => String(r.id) === String(activeCat.id))
    return rootNode?.children?.length > 0 ? rootNode : null
  }, [category, categories, tree])

  return (
    <div className="space-y-6">
      {/* Categorías */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3 px-1"
          style={{ color: 'var(--hc-muted)' }}>Categorías</p>
        <div className="space-y-0.5">
          {drilledNode ? (
            /* ── Modo drill-down: muestra padre + hijos + otras categorías padre ── */
            <>
              {/* Padre activo + hijos */}
              <button
                onClick={() => handleCatSelect(String(drilledNode.id))}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                style={String(category) === String(drilledNode.id)
                  ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                  : { color: 'var(--hc-text)' }
                }
              >
                {drilledNode.icono && <span className="text-base leading-none">{drilledNode.icono}</span>}
                <span className="truncate flex-1">{drilledNode.nombreCategoria ?? drilledNode.nombre}</span>
                <span className="text-[10px] font-bold opacity-50 shrink-0">
                  {categoryTotalCount?.[drilledNode.id] ?? 0}
                </span>
              </button>
              {/* Hijos */}
              <div className="pl-3 mt-0.5 space-y-0.5">
                {drilledNode.children
                  .filter(sub => (categoryTotalCount?.[sub.id] ?? 0) > 0)
                  .map(sub => {
                    const subCount = categoryTotalCount?.[sub.id] ?? 0
                    return (
                      <button key={sub.id}
                        onClick={() => handleCatSelect(String(sub.id))}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                        style={String(category) === String(sub.id)
                          ? { background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }
                          : { color: 'var(--hc-muted)' }
                        }
                      >
                        {sub.icono && <span className="text-sm leading-none">{sub.icono}</span>}
                        <span className="flex-1 truncate">{sub.nombreCategoria ?? sub.nombre}</span>
                        <span className="text-[10px] font-bold opacity-50 shrink-0">{subCount}</span>
                      </button>
                    )
                  })}
              </div>

              {/* Separador + otras categorías padre */}
              {tree.filter(c => String(c.id) !== String(drilledNode.id)).length > 0 && (
                <>
                  <div className="my-3 mx-1 border-t" style={{ borderColor: 'var(--hc-border)' }} />
                  <button
                    onClick={() => handleCatSelect('')}
                    className="w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 mb-1"
                    style={!category
                      ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                      : { color: 'var(--hc-muted)' }
                    }
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    Todos los productos
                  </button>
                  {tree
                    .filter(c => String(c.id) !== String(drilledNode.id) && (categoryTotalCount?.[c.id] ?? 0) > 0)
                    .map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => handleCatSelect(String(cat.id))}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 group"
                        style={{ color: 'var(--hc-text)' }}
                      >
                        {cat.icono && <span className="text-base leading-none shrink-0">{cat.icono}</span>}
                        <span className="truncate flex-1">{cat.nombreCategoria ?? cat.nombre}</span>
                        <span className="text-[10px] font-bold opacity-50 shrink-0 ml-auto">
                          {categoryTotalCount?.[cat.id] ?? 0}
                        </span>
                        {cat.children?.length > 0 && (
                          <svg className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                            fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                          </svg>
                        )}
                      </button>
                    ))}
                </>
              )}
            </>
          ) : (
            /* ── Vista normal: todas las categorías ── */
            <>
              <button
                onClick={() => handleCatSelect('')}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={!category
                  ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                  : { color: 'var(--hc-text-2, var(--hc-text))' }
                }
              >
                Todos los productos
              </button>
              {tree.map(cat => {
                const catCount = categoryTotalCount?.[cat.id] ?? 0
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCatSelect(String(cat.id))}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 group"
                    style={String(category) === String(cat.id)
                      ? { background: 'color-mix(in srgb, var(--hc-accent) 12%, transparent)', color: 'var(--hc-accent)' }
                      : { color: 'var(--hc-text)' }
                    }
                  >
                    {cat.icono && <span className="text-base leading-none shrink-0">{cat.icono}</span>}
                    <span className="truncate flex-1">{cat.nombreCategoria ?? cat.nombre}</span>
                    <span className="text-[10px] font-bold opacity-50 shrink-0 ml-auto">{catCount}</span>
                    {cat.children?.length > 0 && (
                      <svg className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                        fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                      </svg>
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>

    </div>
  )
}

// ── Logo de marca con fallback a iniciales ────────────────────────────────────
function BrandLogo({ marca, size = 56 }) {
  const [imgError, setImgError] = useState(false)
  const initials = (marca.nombreMarca ?? '')
    .split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  return (
    <div
      className="rounded-xl flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size, background: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}
    >
      {marca.logoUrl && !imgError ? (
        <img
          src={marca.logoUrl}
          alt={marca.nombreMarca}
          className="object-contain"
          style={{ width: size - 8, height: size - 8 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-black text-lg leading-none" style={{ color: 'var(--hc-accent)' }}>
          {initials || '?'}
        </span>
      )}
    </div>
  )
}

// ── Showcase de marcas en grande (reemplaza las pills pequeñas) ───────────────
function BrandShowcase({ marcas, visibleMarcaIds, marcasCountInScope = {}, marcasFilter, toggleMarca, clearMarcas, title = 'Compra por Marca' }) {
  const visible = (visibleMarcaIds
    ? marcas.filter(m => visibleMarcaIds.has(String(m.id)))
    : marcas
  ).filter(m => (marcasCountInScope[m.id] ?? 0) > 0)

  if (visible.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>{title}</h2>
          {visibleMarcaIds && (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>
              {visible.length} marca{visible.length === 1 ? '' : 's'} disponible{visible.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
        {marcasFilter.size > 0 && (
          <button
            onClick={clearMarcas}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:opacity-80"
            style={{ color: 'var(--hc-accent)', background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)' }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Ver todas
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {visible.map(m => {
          const isActive = marcasFilter.has(String(m.id))
          const count = marcasCountInScope[m.id] ?? 0
          return (
            <button
              key={m.id}
              onClick={() => toggleMarca(String(m.id))}
              aria-pressed={isActive}
              className="flex-none flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
              style={{
                width: 108,
                background: isActive
                  ? 'color-mix(in srgb, var(--hc-accent) 12%, var(--hc-surface))'
                  : 'var(--hc-surface)',
                border: isActive
                  ? '2px solid color-mix(in srgb, var(--hc-accent) 45%, transparent)'
                  : '1.5px solid var(--hc-border)',
                boxShadow: isActive
                  ? '0 4px 16px color-mix(in srgb, var(--hc-accent) 18%, transparent)'
                  : '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <BrandLogo marca={m} size={52} />
              <span
                className="text-[11px] font-semibold text-center leading-tight line-clamp-2 w-full"
                style={{ color: isActive ? 'var(--hc-accent)' : 'var(--hc-text)' }}
              >
                {m.nombreMarca}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: isActive
                    ? 'color-mix(in srgb, var(--hc-accent) 20%, transparent)'
                    : 'color-mix(in srgb, var(--hc-text) 8%, transparent)',
                  color: isActive ? 'var(--hc-accent)' : 'var(--hc-muted)',
                }}
              >
                {count}
              </span>
              {isActive && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center -mt-1"
                  style={{ background: 'var(--hc-accent)' }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="#fff" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Cuadrícula de categorías hijas (Cajas Hijas) ─────────────────────────────
function SubcategoryGrid({ subcats, onSelect, productCountByCat }) {
  if (!subcats || subcats.length === 0) return null

  const PALETTE = [
    { bg: 'color-mix(in srgb, #3b82f6 9%, var(--hc-surface))', border: 'color-mix(in srgb, #3b82f6 22%, transparent)', icon: '#3b82f6' },
    { bg: 'color-mix(in srgb, #8b5cf6 9%, var(--hc-surface))', border: 'color-mix(in srgb, #8b5cf6 22%, transparent)', icon: '#8b5cf6' },
    { bg: 'color-mix(in srgb, #10b981 9%, var(--hc-surface))', border: 'color-mix(in srgb, #10b981 22%, transparent)', icon: '#10b981' },
    { bg: 'color-mix(in srgb, #f59e0b 9%, var(--hc-surface))', border: 'color-mix(in srgb, #f59e0b 22%, transparent)', icon: '#f59e0b' },
    { bg: 'color-mix(in srgb, #ef4444 9%, var(--hc-surface))', border: 'color-mix(in srgb, #ef4444 22%, transparent)', icon: '#ef4444' },
    { bg: 'color-mix(in srgb, #06b6d4 9%, var(--hc-surface))', border: 'color-mix(in srgb, #06b6d4 22%, transparent)', icon: '#06b6d4' },
    { bg: 'color-mix(in srgb, #ec4899 9%, var(--hc-surface))', border: 'color-mix(in srgb, #ec4899 22%, transparent)', icon: '#ec4899' },
    { bg: 'color-mix(in srgb, #14b8a6 9%, var(--hc-surface))', border: 'color-mix(in srgb, #14b8a6 22%, transparent)', icon: '#14b8a6' },
  ]

  return (
    <div className="mb-8">
      <div className="mb-5">
        <h2 className="text-base font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>
          Subcategorías
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--hc-muted)' }}>
          Seleccioná una para ver sus productos
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {subcats.filter(sub => (productCountByCat[sub.id] ?? 0) > 0).map((sub, idx) => {
          const count = productCountByCat[sub.id] ?? 0
          const c = PALETTE[idx % PALETTE.length]
          const name = sub.nombreCategoria ?? sub.nombre ?? ''
          return (
            <button
              key={sub.id}
              onClick={() => onSelect(String(sub.id))}
              className="group flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
              style={{ background: c.bg, border: `1.5px solid ${c.border}` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 text-xl leading-none shrink-0"
                style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(4px)' }}
              >
                {sub.icono ? (
                  <span>{sub.icono}</span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke={c.icon} strokeWidth={1.6} viewBox="0 0 24 24">
                    {catSvgIcon(name)}
                  </svg>
                )}
              </div>
              <span className="text-sm font-bold leading-snug mb-1" style={{ color: 'var(--hc-text)' }}>
                {name}
              </span>
              {count > 0 && (
                <span className="text-[11px] font-medium" style={{ color: c.icon }}>
                  {count} producto{count === 1 ? '' : 's'}
                </span>
              )}
              <svg
                className="w-4 h-4 mt-2 opacity-60 transition-transform group-hover:translate-x-1"
                fill="none" stroke={c.icon} strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Fila de una categoría (3 productos + Ver más) ─────────────────────────────
function CategoryRow({ catName, catId, products, onVerMas, onQuickView }) {
  const extra = products.length - 3
  const slice = products.slice(0, 3)
  const hasMore = products.length > 3

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--hc-text)' }}>
            {catName}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }}>
            {products.length}
          </span>
        </div>
        <button
          onClick={() => onVerMas(catId)}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--hc-accent)' }}
        >
          Ver más
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Grid: 2 cols mobile, 4 cols sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Primeros 2 productos — siempre visibles */}
        {slice.slice(0, 2).map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} onQuickView={onQuickView} />
        ))}

        {/* 3er producto — solo desktop */}
        {slice[2] && (
          <div className="hidden sm:block">
            <ProductCard product={slice[2]} index={2} onQuickView={onQuickView} />
          </div>
        )}

        {/* Tarjeta "ver todos" — solo desktop, misma estructura que ProductCard */}
        {hasMore && (
          <button
            onClick={() => onVerMas(catId)}
            className="hidden sm:flex flex-col rounded-2xl overflow-hidden transition-all hover:opacity-80 hover:scale-[1.01] text-left"
            style={{
              border: '1.5px dashed color-mix(in srgb, var(--hc-accent) 30%, transparent)',
              background: 'color-mix(in srgb, var(--hc-accent) 5%, var(--hc-surface))',
            }}
          >
            {/* Zona imagen — mismo aspect-square que ProductCard */}
            <div className="aspect-square flex flex-col items-center justify-center gap-1"
              style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)' }}>
              <span className="text-3xl font-black leading-none" style={{ color: 'var(--hc-accent)' }}>
                +{extra}
              </span>
              <span className="text-[11px] font-semibold" style={{ color: 'var(--hc-accent)', opacity: 0.8 }}>
                productos más
              </span>
            </div>
            {/* Zona texto — igual que ProductCard */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'color-mix(in srgb, var(--hc-accent) 70%, transparent)' }}>
                  {catName}
                </p>
                <p className="text-sm font-bold line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>
                  Ver todos los productos
                </p>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
                Ver categoría completa
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Fila de Emprendimientos intercalada ───────────────────────────────────────
function EmprendimientosRow({ products, onVerEmprendimientos }) {
  const slice = products.slice(0, 3)
  if (slice.length === 0) return null
  return (
    <div className="mb-8 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.07) 0%, rgba(16,185,129,0.02) 100%)', border: '1.5px solid rgba(16,185,129,0.18)' }}>
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🤝</span>
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: '#10b981' }}>Emprendimientos CR</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            {products.length}
          </span>
        </div>
        <button
          onClick={onVerEmprendimientos}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: '#10b981' }}
        >
          Ver todos
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 pb-4">
        {slice.map((p, i) => (
          <div key={p.id} className="relative">
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: 'rgba(16,185,129,0.22)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
              🤝 Local
            </div>
            <ProductCard product={p} index={i} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ofertas HOT — usa la ProductCard compartida con tag roja (una sola tarjeta en todo el sitio)
function OfertasView({ products, loading }) {
  return (
    <motion.div key="ofertas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }} className="min-h-screen"
      style={{ background: 'var(--hc-blue-900)' }}>
      <div className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg, rgba(231,59,51,0.14) 0%, transparent 60%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-5xl" style={{ filter: 'drop-shadow(0 0 16px rgba(231,59,51,0.6))' }}>🔥</span>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: '#fff' }}>Ofertas HOT</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Los mejores precios del momento — no dejes pasar ninguno</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--hc-red-500)' }} />
            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>{products.length} productos disponibles ahora</span>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(231,59,51,0.15), transparent 70%)' }} />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : products.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">🔥</p>
              <p className="text-lg font-bold" style={{ color: '#F4F6F9' }}>Las ofertas están cargando</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Volvé pronto para no perder ningún precio</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} hotTag="HOT" />)}
            </div>
          )}
      </div>
    </motion.div>
  )
}

// ── Emprendimientos ───────────────────────────────────────────────────────────
function EmpCard({ p, i }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      whileHover={{ y: -4 }} className="relative rounded-2xl overflow-hidden cursor-pointer group hc-card"
      style={{ boxShadow: '0 2px 16px rgba(16,185,129,0.08)' }}
    >
      <Link to={`/productos/${p.id}`}>
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black"
          style={{ background: 'rgba(16,185,129,0.18)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
          🤝 Local
        </div>
        <div className="aspect-square overflow-hidden"
          style={{ background: 'color-mix(in srgb, #10b981 7%, var(--hc-surface))' }}>
          {p.imagenUrl
            ? <img src={p.imagenUrl} alt={p.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            : <div className="w-full h-full flex items-center justify-center opacity-30 text-5xl">🌿</div>
          }
        </div>
        <div className="p-4">
          {p.marcaNombre && (
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#10b981' }}>
              {p.marcaNombre}
            </p>
          )}
          <p className="text-sm font-semibold line-clamp-2 mb-3" style={{ color: 'var(--hc-text)' }}>{p.nombre}</p>
          <p className="text-xl font-black" style={{ color: 'var(--hc-text)', fontFamily: 'var(--font-display)' }}>
            {formatPrice(p.precio)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

function EmprendimientosView({ products, convenios, loading, onBack }) {
  return (
    <motion.div key="emprendimientos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }} className="min-h-screen"
      style={{ background: 'var(--hc-bg)' }}>
      <div className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.10) 0%, rgba(52,211,153,0.03) 60%, transparent 100%)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs mb-5">
            <Link to="/" className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Inicio</Link>
            <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
            <button onClick={onBack} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Productos</button>
            <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
            <span className="font-semibold" style={{ color: '#10b981' }}>Emprendimientos</span>
          </nav>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>🤝</div>
            <div>
              <h2 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>Emprendimientos</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Apoyá negocios locales de Costa Rica — cada compra cuenta</p>
            </div>
          </div>
        </div>
      </div>
      {convenios.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--hc-muted)' }}>Aliados HotClick</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {convenios.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
                className="shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl"
                style={{ background: 'var(--hc-surface)', border: '1px solid rgba(16,185,129,0.22)', minWidth: '110px', boxShadow: '0 2px 12px rgba(16,185,129,0.06)' }}>
                {c.logoUrl
                  ? <img src={c.logoUrl} alt={c.nombre} className="w-10 h-10 object-contain rounded-xl" onError={e => e.target.style.display='none'} />
                  : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{(c.nombre ?? '?')[0].toUpperCase()}</div>
                }
                <p className="text-[11px] font-bold text-center leading-tight" style={{ color: 'var(--hc-text)' }}>{c.nombre}</p>
                <div className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                  Activo
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm font-bold mb-4" style={{ color: 'var(--hc-text)' }}>
          {products.length > 0 ? `${products.length} productos de emprendimientos` : 'Explorá el catálogo de negocios locales'}
        </p>
        {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div>
          : products.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-6xl mb-4">🌱</p>
              <p className="text-lg font-bold" style={{ color: 'var(--hc-text)' }}>Próximamente más productos</p>
              <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>Los emprendimientos están cargando su inventario</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {products.map((p, i) => <EmpCard key={p.id} p={p} i={i} />)}
            </div>
          )}
      </div>
    </motion.div>
  )
}

// ── Fila de categoría PADRE: 1 producto por cada categoría hija ──────────────
function ParentCategoryRow({ catName, catId, childItems, totalCount, onVerMas, onQuickView }) {
  const visible = childItems.slice(0, 3)
  const extraChildren = childItems.length - 3

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--hc-text)' }}>
            {catName}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)' }}>
            {totalCount}
          </span>
        </div>
        <button
          onClick={() => onVerMas(catId)}
          className="flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
          style={{ color: 'var(--hc-accent)' }}
        >
          Ver más
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Grid: 2 cols mobile / 4 cols desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Primeros 2 hijos — siempre visibles */}
        {visible.slice(0, 2).map(item => (
          <div key={item.childId} className="flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-0.5 truncate"
              style={{ color: 'var(--hc-accent)', opacity: 0.75 }}>
              {item.childName}
            </span>
            <ProductCard product={item.product} onQuickView={onQuickView} />
          </div>
        ))}

        {/* 3er hijo — solo desktop */}
        {visible[2] && (
          <div className="hidden sm:flex flex-col gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest px-0.5 truncate"
              style={{ color: 'var(--hc-accent)', opacity: 0.75 }}>
              {visible[2].childName}
            </span>
            <ProductCard product={visible[2].product} onQuickView={onQuickView} />
          </div>
        )}

        {/* Tarjeta 4: "+N categorías más" o "Ver categoría completa" */}
        <button
          onClick={() => onVerMas(catId)}
          className="hidden sm:flex flex-col rounded-2xl overflow-hidden transition-all hover:opacity-80 hover:scale-[1.01] text-left"
          style={{
            border: '1.5px dashed color-mix(in srgb, var(--hc-accent) 30%, transparent)',
            background: 'color-mix(in srgb, var(--hc-accent) 5%, var(--hc-surface))',
          }}
        >
          <div className="aspect-square flex flex-col items-center justify-center gap-1.5"
            style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)' }}>
            {extraChildren > 0 ? (
              <>
                <span className="text-3xl font-black leading-none" style={{ color: 'var(--hc-accent)' }}>
                  +{extraChildren}
                </span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--hc-accent)', opacity: 0.8 }}>
                  categorías más
                </span>
              </>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24"
                style={{ color: 'var(--hc-accent)', opacity: 0.7 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
              </svg>
            )}
          </div>
          <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: 'color-mix(in srgb, var(--hc-accent) 70%, transparent)' }}>
                {catName}
              </p>
              <p className="text-sm font-bold line-clamp-2 leading-snug" style={{ color: 'var(--hc-text)' }}>
                Ver todos los productos
              </p>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--hc-accent)' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
              Ver categoría completa
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

// ── Vista por filas de categoría (modo exploración sin filtros) ───────────────
function CategoryRowsView({ products, categories, convenioMarcaNames, onVerMas, onVerEmprendimientos, onQuickView, page }) {
  const emprendimientosProducts = useMemo(
    () => products.filter(p => convenioMarcaNames.has(p.marcaNombre?.toLowerCase())),
    [products, convenioMarcaNames]
  )

  const categoryRows = useMemo(() => {
    const tree = buildCategoryTree(categories)
    const result = []

    // IDs presentes en el árbol (raíz + hijos directos)
    const treeIds = new Set()
    tree.forEach(r => {
      treeIds.add(String(r.id))
      r.children?.forEach(c => treeIds.add(String(c.id)))
    })

    tree.forEach(parent => {
      if (parent.children?.length > 0) {
        // Categoría padre con hijos: 1 producto representativo por hijo
        const childItems = parent.children
          .map(child => {
            const childProds = products.filter(p => String(p.categoriaId) === String(child.id))
            if (childProds.length === 0) return null
            return {
              childId: child.id,
              childName: child.nombreCategoria ?? child.nombre ?? '',
              product: childProds[0],
              count: childProds.length,
            }
          })
          .filter(Boolean)

        if (childItems.length > 0) {
          result.push({
            type: 'parent',
            catId: parent.id,
            catName: parent.nombreCategoria ?? parent.nombre ?? '',
            childItems,
            totalCount: childItems.reduce((s, i) => s + i.count, 0),
          })
        }
      } else {
        // Categoría hoja sin hijos
        const catProds = products.filter(p => String(p.categoriaId) === String(parent.id))
        if (catProds.length > 0) {
          result.push({
            type: 'leaf',
            catId: parent.id,
            catName: parent.nombreCategoria ?? parent.nombre ?? '',
            products: catProds,
            totalCount: catProds.length,
          })
        }
      }
    })

    // Productos huérfanos (sin categoría o en categoría fuera del árbol)
    const orphans = products.filter(p => !p.categoriaId || !treeIds.has(String(p.categoriaId)))
    if (orphans.length > 0) {
      result.push({
        type: 'leaf',
        catId: '__otros__',
        catName: 'Otros productos',
        products: orphans,
        totalCount: orphans.length,
      })
    }

    return result.sort((a, b) => b.totalCount - a.totalCount)
  }, [products, categories])

  const rows = useMemo(() => {
    const result = []
    categoryRows.forEach((row, idx) => {
      result.push(row)
      if (idx === 1 && emprendimientosProducts.length > 0) {
        result.push({ type: 'emprendimientos' })
      }
    })
    if (emprendimientosProducts.length > 0 && categoryRows.length <= 1) {
      result.push({ type: 'emprendimientos' })
    }
    return result
  }, [categoryRows, emprendimientosProducts])

  if (rows.length === 0) return null

  return (
    <motion.div key={`cat-rows-p${page}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {rows.map((row) =>
        row.type === 'emprendimientos' ? (
          <EmprendimientosRow
            key="emp-row"
            products={emprendimientosProducts}
            onVerEmprendimientos={onVerEmprendimientos}
          />
        ) : row.type === 'parent' ? (
          <ParentCategoryRow
            key={row.catId}
            catName={row.catName}
            catId={row.catId}
            childItems={row.childItems}
            totalCount={row.totalCount}
            onVerMas={onVerMas}
            onQuickView={onQuickView}
          />
        ) : (
          <CategoryRow
            key={row.catId}
            catName={row.catName}
            catId={row.catId}
            products={row.products}
            onVerMas={onVerMas}
            onQuickView={onQuickView}
          />
        )
      )}
    </motion.div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const SORT_OPTIONS = [
    { value: 'default',    label: 'Relevancia' },
    { value: 'featured',   label: 'Destacados' },
    { value: 'price_asc',  label: 'Menor precio' },
    { value: 'price_desc', label: 'Mayor precio' },
    { value: 'name',       label: 'A–Z' },
  ]

  const STOCK_OPTIONS = [
    { value: '',    label: 'Todos' },
    { value: 'ok',  label: 'En stock' },
    { value: 'low', label: 'Bajo stock' },
    { value: 'out', label: 'Agotado' },
  ]

  const COND_OPTIONS = [
    { value: '',          label: 'Todas' },
    { value: 'NUEVO',     label: 'Nuevo' },
    { value: 'COMO_NUEVO', label: 'Como nuevo' },
    { value: 'USADO',     label: 'Usado' },
  ]

  const [products,  setProducts]  = useState([])
  const [categories, setCategories] = useState([])
  const [marcas,    setMarcas]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [page,      setPage]      = useState(() => {
    const p = Number.parseInt(searchParams.get('page') ?? '0', 10)
    return Number.isNaN(p) || p < 0 ? 0 : p
  })
  const [, setTotalPages] = useState(1)
  const [viewMode,  setViewMode]  = useState('all')
  const [convenios, setConvenios] = useState([])

  // Filtros
  const [search,      setSearch]      = useState(() => searchParams.get('search') ?? '')
  const [category,    setCategory]    = useState(() => searchParams.get('cat') ?? '')
  const [marcasFilter, setMarcasFilter] = useState(() => {
    const raw = searchParams.get('marcas') ?? searchParams.get('marcaId') ?? ''
    return new Set(raw ? raw.split(',').filter(Boolean) : [])
  })
  const [sort, setSort] = useState(() => localStorage.getItem('hc-products-sort') ?? 'default')
  const [filterStock, setFilterStock] = useState('')
  const [filterCond,  setFilterCond]  = useState('')
  const [filterTalla, setFilterTalla] = useState('')
  const [priceMin,    setPriceMin]    = useState('')
  const [priceMax,    setPriceMax]    = useState('')
  const [quickView,       setQuickView]       = useState(null)
  const [aiPanelOpen,     setAiPanelOpen]     = useState(false)
  const [sidebarOpen,     setSidebarOpen]     = useState(false)
  const [filterViewPage,  setFilterViewPage]  = useState(0)
  const aiQuery = searchParams.get('q') || ''

  useEffect(() => {
    if (searchParams.get('ai') === '1') setAiPanelOpen(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  // Resetear página local cuando cambian los filtros
  useEffect(() => { setFilterViewPage(0) }, [search, category, marcasFilter, filterStock, filterCond, filterTalla, priceMin, priceMax, sort])

  // Sincronizar URL params al cambiar filtros (y página actual)
  useEffect(() => {
    const params = {}
    if (search)             params.search = search
    if (category)           params.cat = category
    if (marcasFilter.size)  params.marcas = [...marcasFilter].join(',')
    if (page > 0)           params.page = String(page)
    setSearchParams(params, { replace: true })
  }, [search, category, marcasFilter, page, setSearchParams])

  const fetchProducts = useCallback(async (p = 0) => {
    setLoading(true)
    try {
      const { data } = await productService.getAll(p, PAGE_SIZE)
      const content = (data.content ?? data ?? []).map(normalizeProduct)
      // Calcular totalPages desde totalElements para mayor precisión
      const safeTotal = data.totalElements != null
        ? Math.ceil(data.totalElements / PAGE_SIZE)
        : (data.totalPages ?? 1)
      const clampedTotal = Math.max(1, safeTotal)

      if (content.length === 0 && p > 0) {
        // Página fantasma: el backend reportó más páginas de las que existen con contenido
        // Volver a página 0 automáticamente
        const { data: d0 } = await productService.getAll(0, PAGE_SIZE)
        const c0 = (d0.content ?? d0 ?? []).map(normalizeProduct)
        setProducts(c0)
        setTotalPages(clampedTotal)
        setPage(0)
      } else {
        setProducts(content)
        setTotalPages(clampedTotal)
        setPage(p)
      }
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Usar la página guardada en la URL para restaurar posición al volver atrás
  const initialPageRef = useRef(page)
  useEffect(() => { fetchProducts(initialPageRef.current) }, [fetchProducts])
  useEffect(() => {
    productService.getCategories().then(({ data }) => setCategories(data ?? [])).catch(() => {})
    marcaService.getPublicas().then(r => {
      const ms = r.data?.data ?? r.data ?? []
      setMarcas(Array.isArray(ms) ? ms : [])
    }).catch(() => {})
    import('@/services/api').then(({ default: api }) => {
      api.get('/convenios/publicos').then(r => setConvenios(r.data?.data ?? [])).catch(() => {})
    })
  }, [])

  const convenioMarcaNames = useMemo(() =>
    new Set(convenios.map(c => c.nombre?.toLowerCase()).filter(Boolean))
  , [convenios])

  const toggleMarca = useCallback((id) => {
    setMarcasFilter(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const clearMarcas = useCallback(() => setMarcasFilter(new Set()), [])

  // Conjunto de IDs de la categoría seleccionada + todos sus descendientes
  const categoryScope = useMemo(() => {
    if (!category) return null
    const ids = new Set([String(category)])
    const queue = [String(category)]
    while (queue.length > 0) {
      const pid = queue.shift()
      categories
        .filter(c => String(c.padreId ?? '') === pid)
        .forEach(c => { ids.add(String(c.id)); queue.push(String(c.id)) })
    }
    return ids
  }, [category, categories])

  const filtered = useMemo(() => {
    const minPrice = priceMin !== '' ? Number(priceMin) : null
    const maxPrice = priceMax !== '' ? Number(priceMax) : null
    return products
      .filter(p => viewMode !== 'ofertas' || p.enOferta)
      .filter(p => viewMode !== 'emprendimientos' || convenioMarcaNames.has(p.marcaNombre?.toLowerCase()))
      .filter(p => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.marcaNombre?.toLowerCase().includes(search.toLowerCase()))
      .filter(p => !categoryScope || categoryScope.has(String(p.categoriaId)))
      .filter(p => marcasFilter.size === 0 || marcasFilter.has(String(p.marcaId)))
      .filter(p => {
        if (filterStock === 'ok')  return p.stock > 3
        if (filterStock === 'low') return p.stock > 0 && p.stock <= 3
        if (filterStock === 'out') return p.stock === 0
        return true
      })
      .filter(p => !filterCond  || p.condicion === filterCond)
      .filter(p => !filterTalla || p.talla    === filterTalla)
      .filter(p => (minPrice === null || p.precio >= minPrice) && (maxPrice === null || p.precio <= maxPrice))
      .sort((a, b) => {
        if (sort === 'featured')   return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0)
        if (sort === 'price_asc')  return a.precio - b.precio
        if (sort === 'price_desc') return b.precio - a.precio
        if (sort === 'name')       return a.nombre?.localeCompare(b.nombre)
        return 0
      })
  }, [products, search, categoryScope, marcasFilter, sort, filterStock, filterCond, priceMin, priceMax, viewMode, convenioMarcaNames, filterTalla])

  const marcaProductCount = useMemo(() =>
    Object.fromEntries(marcas.map(m => [m.id, products.filter(p => String(p.marcaId) === String(m.id)).length]))
  , [marcas, products])

  // Conteo de productos por ID de categoría — solo directos (para SubcategoryGrid)
  const productCountByCat = useMemo(() => {
    const counts = {}
    products.forEach(p => {
      if (p.categoriaId) counts[p.categoriaId] = (counts[p.categoriaId] ?? 0) + 1
    })
    return counts
  }, [products])

  // Conteo total por categoría incluyendo todos sus descendientes (para pills y sidebar)
  const categoryTotalCount = useMemo(() => {
    const counts = {}
    categories.forEach(cat => {
      const scope = new Set([String(cat.id)])
      const queue = [String(cat.id)]
      while (queue.length > 0) {
        const pid = queue.shift()
        categories
          .filter(c => String(c.padreId ?? '') === pid)
          .forEach(c => { scope.add(String(c.id)); queue.push(String(c.id)) })
      }
      counts[cat.id] = products.filter(p => scope.has(String(p.categoriaId))).length
    })
    return counts
  }, [categories, products])

  // Conteo de productos por marca filtrado por la categoría actualmente seleccionada
  const marcasCountInScope = useMemo(() => {
    const base = categoryScope
      ? products.filter(p => categoryScope.has(String(p.categoriaId)))
      : products
    return Object.fromEntries(
      marcas.map(m => [m.id, base.filter(p => String(p.marcaId) === String(m.id)).length])
    )
  }, [marcas, products, categoryScope])

  // IDs de marcas que tienen al menos un producto en el scope de categoría actual
  const marcasForCategoryScope = useMemo(() => {
    if (!categoryScope) return null // null = mostrar todas las marcas
    const ids = new Set()
    products.forEach(p => {
      if (p.marcaId && categoryScope.has(String(p.categoriaId))) {
        ids.add(String(p.marcaId))
      }
    })
    return ids
  }, [categoryScope, products])

  // Nodo padre seleccionado (solo cuando la categoría activa tiene hijos directos)
  const selectedParentNode = useMemo(() => {
    if (!category) return null
    const t = buildCategoryTree(categories)
    const rootNode = t.find(r => String(r.id) === String(category))
    return (rootNode?.children?.length ?? 0) > 0 ? rootNode : null
  }, [category, categories])

  const tallaOptions = useMemo(() => {
    const all = [...new Set(products.map(p => p.talla).filter(Boolean))]
    const zapatos = all.filter(t => /^\d/.test(t)).sort((a, b) => Number(a) - Number(b))
    const ropa = all.filter(t => !/^\d/.test(t))
    const ORDER = ['XS','S','M','L','XL','XXL','XXXL']
    ropa.sort((a, b) => {
      const ia = ORDER.indexOf(a.toUpperCase()), ib = ORDER.indexOf(b.toUpperCase())
      if (ia >= 0 && ib >= 0) return ia - ib
      if (ia >= 0) return -1
      if (ib >= 0) return 1
      return a.localeCompare(b)
    })
    return { zapatos, ropa }
  }, [products])

  const hasFilters = !!(category || marcasFilter.size || filterStock || filterCond || filterTalla || priceMin || priceMax || search)

  // Muestra cuadrícula de subcategorías cuando: hay categoría padre con hijos y ningún otro filtro activo
  const showSubcatGrid = !!(
    selectedParentNode &&
    !search && !filterCond && !filterStock && !priceMin && !priceMax && marcasFilter.size === 0
  )

  // Paginación local sobre resultados filtrados (evita dependencia del totalPages del backend)
  const filteredPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const filteredSlice = filtered.slice(filterViewPage * PAGE_SIZE, (filterViewPage + 1) * PAGE_SIZE)

  const clearFilters = useCallback(() => {
    setCategory(''); clearMarcas(); setFilterStock(''); setFilterCond('')
    setFilterTalla(''); setSearch(''); setPriceMin(''); setPriceMax('')
  }, [clearMarcas])

  // Chips activos (excluyendo búsqueda y categoría — esos se ven directamente en los dropdowns)
  const activeChips = [
    ...([...marcasFilter].map(id => ({
      key: `m-${id}`,
      label: marcas.find(m => String(m.id) === id)?.nombreMarca ?? 'Marca',
      clear: () => toggleMarca(id),
    }))),
    filterCond   && { key: 'cond',  label: COND_OPTIONS.find(o => o.value === filterCond)?.label,  clear: () => setFilterCond('') },
    filterStock  && { key: 'stock', label: STOCK_OPTIONS.find(o => o.value === filterStock)?.label, clear: () => setFilterStock('') },
    filterTalla  && { key: 'talla', label: `Talla ${filterTalla}`, clear: () => setFilterTalla('') },
    (priceMin || priceMax) && {
      key: 'price',
      label: priceMin && priceMax
        ? `₡${Number(priceMin).toLocaleString()} – ₡${Number(priceMax).toLocaleString()}`
        : priceMin ? `> ₡${Number(priceMin).toLocaleString()}` : `< ₡${Number(priceMax).toLocaleString()}`,
      clear: () => { setPriceMin(''); setPriceMax('') },
    },
  ].filter(Boolean)

  // Nombre de categoría activa
  const activeCatName = category
    ? (categories.find(c => String(c.id) === String(category))?.nombreCategoria
      ?? categories.find(c => String(c.id) === String(category))?.nombre)
    : null

  // SEO helpers
  const activeMarcaName = marcasFilter.size === 1
    ? marcas.find(m => String(m.id) === [...marcasFilter][0])?.nombreMarca
    : null

  const seoTitle = (() => {
    if (viewMode === 'ofertas') return 'Ofertas HOT — Mejores precios del día | HotClick'
    if (viewMode === 'emprendimientos') return 'Emprendimientos Costarricenses — Negocios locales CR | HotClick'
    if (activeCatName) return `${activeCatName} en Costa Rica — Compra online | HotClick`
    if (activeMarcaName) return `${activeMarcaName} en Costa Rica — Productos originales | HotClick`
    return 'Catálogo de productos — Compra online en Costa Rica | HotClick'
  })()

  const seoDesc = (() => {
    if (viewMode === 'ofertas') return `${filtered.length > 0 ? `${filtered.length} productos con ` : ''}Ofertas y descuentos especiales de emprendedores costarricenses. Precios directos, envío a todo Costa Rica.`
    if (viewMode === 'emprendimientos') return 'Apoyá el comercio local. Descubrí emprendimientos costarricenses y comprá productos únicos con envío a todo el país.'
    if (activeCatName) return `Explorá los mejores productos de ${activeCatName} de emprendedores en Costa Rica. Envío a todo el país, precios directos y pagos seguros.`
    if (activeMarcaName) return `Todos los productos de ${activeMarcaName} disponibles en HotClick Costa Rica. Entrega a domicilio, pagos con SINPE Móvil y tarjeta.`
    return `Explorá más de ${products.length > 0 ? `${products.length} ` : ''}productos únicos de emprendedores costarricenses. Tecnología, ropa, accesorios y más con envío a todo Costa Rica.`
  })()

  const canonicalUrl = 'https://hotclick.lat/productos'
  const shouldNoIndex = hasFilters && (marcasFilter.size > 1 || (marcasFilter.size > 0 && !!category))

  return (
    <>
      <ProductsAssistantPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        initialQuery={aiQuery}
        onCategoryFilter={(nombre) => {
          // Busca la categoría por nombre (parcial, case-insensitive) y aplica el filtro
          const match = categories.find(c =>
            (c.nombreCategoria ?? c.nombre ?? '').toLowerCase().includes(nombre.toLowerCase())
          )
          if (match) {
            setCategory(String(match.id))
            setAiPanelOpen(false)
          }
        }}
      />

      {/* Botón flotante izquierdo para abrir/cerrar el asistente */}
      <button
        onClick={() => setAiPanelOpen(v => !v)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-4 px-1.5 rounded-r-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{
          background: aiPanelOpen
            ? 'rgba(255,255,255,0.12)'
            : 'var(--hc-accent)',
          color: '#fff',
          border: aiPanelOpen ? '1px solid rgba(255,255,255,0.2)' : 'none',
          backdropFilter: aiPanelOpen ? 'blur(8px)' : 'none',
        }}
        aria-label={aiPanelOpen ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
      >
        <span style={{ fontSize: 14, animation: aiPanelOpen ? 'none' : 'hc-fab-pulse 2s ease-in-out infinite' }}>✦</span>
        <span style={{
          writingMode: 'vertical-lr',
          transform: 'rotate(180deg)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>¿DUDAS?</span>
        <style>{`@keyframes hc-fab-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.15)}}`}</style>
      </button>

      <MainLayout>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="es-CR" href={canonicalUrl} />
        <link rel="alternate" hrefLang="es"    href={canonicalUrl} />
        <link rel="alternate" hrefLang="x-default" href="https://hotclick.lat/" />
        {shouldNoIndex && <meta name="robots" content="noindex, follow" />}
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content="https://hotclick.lat/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        {products.length > 0 && viewMode === 'all' && (
          <script type="application/ld+json">
            {JSON.stringify(generateItemListJsonLd(products.slice(0, 12), 'https://hotclick.lat'))}
          </script>
        )}
      </Helmet>

      {/* ── Tabs de vista ── */}
      <div style={{ borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
          {[
            {
              id: 'emprendimientos', label: 'Emprendimientos', sub: 'Negocios locales CR',
              icon: <span className="text-xl leading-none">🤝</span>,
              accent: '#10b981', accentBg: 'rgba(16,185,129,0.12)',
            },
          ].map(tab => {
            const active = viewMode === tab.id
            return (
              <button key={tab.id}
                onClick={() => { setViewMode(tab.id); clearFilters() }}
                className="relative shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left transition-all duration-200 whitespace-nowrap"
                style={active
                  ? { background: tab.accentBg, border: `1.5px solid color-mix(in srgb, ${tab.accent} 20%, transparent)` }
                  : { background: 'transparent', border: '1.5px solid transparent' }
                }
              >
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{ background: active ? tab.accentBg : 'color-mix(in srgb, var(--hc-text) 6%, transparent)', color: active ? tab.accent : 'var(--hc-muted)' }}>
                  {tab.icon}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-bold leading-tight" style={{ color: active ? tab.accent : 'var(--hc-text)' }}>{tab.label}</span>
                  <span className="text-[11px] leading-tight" style={{ color: 'var(--hc-muted)' }}>{tab.sub}</span>
                </span>
                {active && (
                  <motion.div layoutId="tab-dot"
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                    style={{ background: tab.accent }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Vistas ── */}
      <AnimatePresence mode="wait">
        {viewMode === 'ofertas' && (
          <OfertasView key="v-ofertas" products={filtered} loading={loading} />
        )}
        {viewMode === 'emprendimientos' && (
          <EmprendimientosView key="v-emp" products={filtered} convenios={convenios} loading={loading} onBack={() => setViewMode('all')} />
        )}
        {viewMode === 'all' && (
          <motion.div key="v-all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }} className="min-h-screen" style={{ background: 'var(--hc-bg)' }}>

            {/* Hero */}
            <div className="relative overflow-hidden py-10 px-4"
              style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--hc-accent) 10%, var(--hc-bg)) 0%, color-mix(in srgb, var(--hc-accent) 3%, var(--hc-bg)) 60%, var(--hc-bg) 100%)' }}>
              <div className="max-w-7xl mx-auto">
                {/* Breadcrumb desde categoría (Brand Book §7.4) */}
                {activeCatName && (
                  <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs mb-4">
                    <Link to="/" className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Inicio</Link>
                    <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
                    <button onClick={() => setCategory('')} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Productos</button>
                    <span aria-hidden="true" style={{ color: 'var(--hc-border-strong)' }}>/</span>
                    <span className="font-semibold" style={{ color: 'var(--hc-text-2)' }}>{activeCatName}</span>
                  </nav>
                )}
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
                    style={{ background: 'color-mix(in srgb, var(--hc-accent) 15%, var(--hc-surface))', border: '1px solid color-mix(in srgb, var(--hc-accent) 28%, transparent)' }}>
                    🛍️
                  </div>
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: 'var(--hc-text)' }}>
                      {activeCatName ?? 'Catálogo completo'}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
                      Encontrá todo lo que buscás — precios directos sin intermediarios
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--hc-accent)' }} />
                  <span className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>
                    {filtered.length} producto{filtered.length === 1 ? '' : 's'} disponible{filtered.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--hc-accent) 15%, transparent), transparent 70%)' }} />
            </div>

            {/* Barra de filtros sticky */}
            <CatalogFilterBar
              search={search} setSearch={setSearch}
              sort={sort} setSort={setSort}
              categories={categories} marcas={marcas} marcaProductCount={marcaProductCount}
              categoryTotalCount={categoryTotalCount}
              tallaOptions={tallaOptions} category={category} setCategory={setCategory}
              marcasFilter={marcasFilter} toggleMarca={toggleMarca} clearMarcas={clearMarcas}
              filterCond={filterCond} setFilterCond={setFilterCond}
              filterStock={filterStock} setFilterStock={setFilterStock}
              filterTalla={filterTalla} setFilterTalla={setFilterTalla}
              priceMin={priceMin} setPriceMin={setPriceMin}
              priceMax={priceMax} setPriceMax={setPriceMax}
              hasFilters={hasFilters} clearFilters={clearFilters}
              COND_OPTIONS={COND_OPTIONS} STOCK_OPTIONS={STOCK_OPTIONS} SORT_OPTIONS={SORT_OPTIONS}
              filteredCount={filtered.length}
              onOpenSidebar={() => setSidebarOpen(true)}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
              <div className="flex items-start gap-6">
                {/* Sidebar — desktop */}
                <aside
                  className="hidden lg:block shrink-0 sticky"
                  style={{ width: 252, top: 72, alignSelf: 'flex-start' }}
                >
                  <div className="rounded-2xl p-4"
                    style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                    <CategorySidebar
                      categories={categories}
                      category={category}
                      setCategory={setCategory}
                      marcas={marcas}
                      marcasFilter={marcasFilter}
                      toggleMarca={toggleMarca}
                      clearMarcas={clearMarcas}
                      marcaProductCount={marcaProductCount}
                      categoryTotalCount={categoryTotalCount}
                    />
                  </div>
                </aside>

                {/* Contenido principal */}
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Chips de filtros activos */}
                  {activeChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {activeChips.map(chip => (
                        <button key={chip.key} onClick={chip.clear}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-80"
                          style={{ background: 'color-mix(in srgb, var(--hc-accent) 10%, transparent)', color: 'var(--hc-accent)', borderColor: 'color-mix(in srgb, var(--hc-accent) 25%, transparent)' }}>
                          {chip.label}
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      ))}
                      {activeChips.length > 1 && (
                        <button onClick={clearFilters} className="text-xs hover:opacity-70 transition-opacity underline" style={{ color: 'var(--hc-muted)' }}>
                          Limpiar todo
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Showcase de marcas en grande ── */}
                  {!loading && marcas.length > 0 && (
                    <BrandShowcase
                      marcas={marcas}
                      visibleMarcaIds={marcasForCategoryScope}
                      marcasCountInScope={marcasCountInScope}
                      marcasFilter={marcasFilter}
                      toggleMarca={toggleMarca}
                      clearMarcas={clearMarcas}
                      title={category ? 'Marcas en esta categoría' : 'Compra por Marca'}
                    />
                  )}

                  {/* ── Cuadrícula de subcategorías (Cajas Hijas) ── */}
                  {showSubcatGrid && (
                    <SubcategoryGrid
                      subcats={selectedParentNode.children}
                      onSelect={(id) => { setCategory(id); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      productCountByCat={productCountByCat}
                    />
                  )}

                  {/* Grid de productos */}
                  <div ref={productGridRef}>
                    {!shouldRenderGrid ? (
                      <div className="h-96 animate-pulse rounded-2xl" style={{ background: 'var(--hc-surface)' }} />
                    ) : loading ? (
                      <div className="flex justify-center py-20"><Spinner size="lg" /></div>
                    ) : filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-24 text-center gap-5">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-3xl"
                            style={{ background: 'color-mix(in srgb, var(--hc-accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-accent) 16%, transparent)' }} />
                          <svg className="relative w-12 h-12" style={{ color: 'var(--hc-accent)' }} fill="none" stroke="currentColor" strokeWidth={1.3} viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-base mb-1" style={{ color: 'var(--hc-text)' }}>No se encontraron productos</p>
                          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Intentá con otros filtros o buscá por nombre</p>
                        </div>
                        {hasFilters && (
                          <button onClick={clearFilters}
                            className="px-5 py-2 rounded-xl border text-sm font-medium transition-colors hover:opacity-70"
                            style={{ color: 'var(--hc-muted)', borderColor: 'var(--hc-border)' }}>
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    ) : hasFilters ? (
                      /* ── Modo búsqueda / filtros: grid flat reactivo ── */
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={search + category + sort + filterStock + filterCond + priceMin + priceMax + [...marcasFilter].join()}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {search && (
                            <p className="text-xs mb-3 font-medium" style={{ color: 'var(--hc-muted)' }}>
                              {filtered.length} resultado{filtered.length === 1 ? '' : 's'} para <span style={{ color: 'var(--hc-text)' }}>"{search}"</span>
                            </p>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                            {filteredSlice.map((product, i) => (
                              <ProductCard key={product.id} product={product} priority={i < 6} index={i} onQuickView={setQuickView} />
                            ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      /* ── Modo por categorías: filas con 3 productos + ver más ── */
                      <CategoryRowsView
                        products={products}
                        categories={categories}
                        convenioMarcaNames={convenioMarcaNames}
                        onVerMas={(catId) => { setCategory(String(catId)); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        onVerEmprendimientos={() => { setViewMode('emprendimientos'); clearFilters() }}
                        onQuickView={setQuickView}
                        page={page}
                      />
                    )}

                    {/* Paginación local — basada en los resultados filtrados, no en páginas del backend */}
                    {filteredPages > 1 && hasFilters && (
                      <nav aria-label="Paginación" className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
                        <button
                          onClick={() => { setFilterViewPage(p => p - 1); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          disabled={filterViewPage === 0}
                          className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed">
                          Anterior
                        </button>
                        {Array.from({ length: filteredPages }, (_, i) => i)
                          .filter(i => i === 0 || i === filteredPages - 1 || Math.abs(i - filterViewPage) <= 1)
                          .reduce((acc, i, idx, arr) => {
                            if (idx > 0 && i - arr[idx - 1] > 1) acc.push('…')
                            acc.push(i)
                            return acc
                          }, [])
                          .map((i, idx) =>
                            i === '…' ? (
                              <span key={`gap-${idx}`} className="px-1 text-sm" style={{ color: 'var(--hc-muted)' }}>…</span>
                            ) : (
                              <button
                                key={i}
                                onClick={() => { setFilterViewPage(i); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                                aria-label={`Página ${i + 1}`}
                                aria-current={i === filterViewPage ? 'page' : undefined}
                                className="w-8 h-8 rounded-lg text-sm font-semibold transition-colors"
                                style={i === filterViewPage
                                  ? { background: 'var(--hc-accent)', color: '#fff' }
                                  : { color: 'var(--hc-text-2)', border: '1px solid var(--hc-border)' }}
                              >
                                {i + 1}
                              </button>
                            )
                          )}
                        <button
                          onClick={() => { setFilterViewPage(p => p + 1); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                          disabled={filterViewPage >= filteredPages - 1}
                          className="hc-btn hc-btn-outline hc-btn-sm disabled:opacity-30 disabled:cursor-not-allowed">
                          Siguiente
                        </button>
                      </nav>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar drawer — mobile */}
              <AnimatePresence>
                {sidebarOpen && (
                  <>
                    <motion.div
                      key="sidebar-backdrop"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setSidebarOpen(false)}
                      className="fixed inset-0 z-40 lg:hidden"
                      style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
                    />
                    <motion.aside
                      key="sidebar-drawer"
                      initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                      className="fixed left-0 top-0 bottom-0 z-50 overflow-y-auto lg:hidden"
                      style={{
                        width: 'min(300px, 90vw)',
                        background: 'var(--hc-surface)',
                        borderRight: '1px solid var(--hc-border)',
                        boxShadow: '8px 0 48px rgba(0,0,0,0.14)',
                      }}
                    >
                      <div className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: '1px solid var(--hc-border)' }}>
                        <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>Filtrar catálogo</p>
                        <button
                          onClick={() => setSidebarOpen(false)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
                          style={{ color: 'var(--hc-muted)' }}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                      <div className="p-5">
                        <CategorySidebar
                          categories={categories}
                          category={category}
                          setCategory={setCategory}
                          marcas={marcas}
                          marcasFilter={marcasFilter}
                          toggleMarca={toggleMarca}
                          clearMarcas={clearMarcas}
                          marcaProductCount={marcaProductCount}
                          categoryTotalCount={categoryTotalCount}
                          onCategorySelect={() => setSidebarOpen(false)}
                        />
                      </div>
                    </motion.aside>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
      </AnimatePresence>

      <CartMiniBar />
    </MainLayout>
    </>
  )
}

function CartMiniBar() {
  const items = useCartStore((s) => s.items)
  const total = useCartStore((s) => s.total)
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
        >
          <button
            onClick={() => navigate('/carrito')}
            className="pointer-events-auto flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'var(--hc-accent)',
              boxShadow: '0 8px 32px color-mix(in srgb, var(--hc-accent) 45%, transparent), 0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div className="relative">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-[9px] font-bold flex items-center justify-center" style={{ color: 'var(--hc-accent)' }}>
                {items.length}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none">Ver carrito</p>
              <p className="text-[10px] text-white/75 mt-0.5">{formatPrice(total())}</p>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
