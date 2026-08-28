import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  IconoCamion,
  IconoCandado,
  IconoChat,
  IconoChispa,
  IconoEscudo,
  IconoMas,
  IconoMenos,
  IconoPlay,
  IconoVolver,
} from './VisitanteIcons'
import VisitanteMain, { VisitanteBoton, VisitanteEmptyState, VisitantePrecio } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'
import useCartStore from '@/store/cartStore'
import { useProductoVisitante } from './useProductoVisitante'
import type { Producto } from '@/types/producto'

/**
 * Detalle de producto Visitante (Figma 129:288). Compra solo con producto API.
 */
export default function VisitanteProductoPage() {
  const { id } = useParams()
  const { vista, crudo, cargando, error } = useProductoVisitante(id)
  const [cantidad, setCantidad] = useState(1)
  const [tab, setTab] = useState<'specs' | 'uso'>('specs')
  const [aviso, setAviso] = useState('')
  const addItem = useCartStore((s) => s.addItem)
  const navigate = useNavigate()

  if (cargando) {
    return (
      <VisitanteMain conNav={false}>
        <p className="text-sm text-hc-muted">Cargando producto…</p>
      </VisitanteMain>
    )
  }

  if (error || !vista) {
    return (
      <VisitanteMain conNav={false}>
        <VisitanteEmptyState
          titulo="Producto no disponible"
          detalle="No encontramos este producto en el catálogo."
        />
        <div className="mt-4">
          <VisitanteBoton to={visitanteRuta('shop')}>Volver al shop</VisitanteBoton>
        </div>
      </VisitanteMain>
    )
  }

  const agregar = () => agregarSiHayCrudo(crudo, cantidad, addItem, navigate, setAviso)

  return (
    <div className="mx-auto max-w-md bg-hc-surface">
      <HeroProducto imagenUrl={vista.imagenUrl} />
      <VisitanteMain conNav={false} className="pt-6">
        <Link
          to={visitanteRuta(`negocio/${vista.negocioId}`)}
          className="mb-4 inline-flex rounded-full bg-[var(--hc-blue-50)] px-3 py-1 text-[10px] font-medium text-hc-accent"
        >
          {vista.negocio}
        </Link>
        <h1 className="font-display text-xl font-bold">{vista.nombre}</h1>
        <p className="mt-2">
          <VisitantePrecio colones={vista.precio} className="text-2xl" />
        </p>
        <div className="mt-4 flex gap-2">
          <Badge tono="ok">{vista.agotado ? 'Agotado' : 'En stock'}</Badge>
          <Badge tono="aviso">Garantía 15 días</Badge>
        </div>
        <Stepper cantidad={cantidad} onMenos={() => setCantidad((n) => Math.max(1, n - 1))} onMas={() => setCantidad((n) => n + 1)} />
        <TarjetaAsesor />
        <SeccionVideo />
        <SellosConfianza />
        <TabsProducto tab={tab} onTab={setTab} />
        <p className="mb-6 text-xs text-hc-muted">
          {tab === 'specs' ? vista.descripcion : (crudo?.comoUsar || 'No hay instrucciones de uso para este producto.')}
        </p>
        {aviso ? <p className="mb-3 text-xs text-hc-danger">{aviso}</p> : null}
        <VisitanteBoton onClick={agregar} disabled={vista.agotado}>
          Agregar al carrito
        </VisitanteBoton>
      </VisitanteMain>
    </div>
  )
}

function agregarSiHayCrudo(
  crudo: Producto | null,
  cantidad: number,
  addItem: (p: Producto, qty?: number) => void,
  navigate: ReturnType<typeof useNavigate>,
  setAviso: (msg: string) => void,
) {
  if (!crudo) {
    setAviso('Este producto no está disponible para comprar.')
    return
  }
  addItem(crudo, cantidad)
  navigate(visitanteRuta('carrito'))
}

function HeroProducto({ imagenUrl }: { imagenUrl?: string }) {
  const fondo = imagenUrl
    ? { backgroundImage: `url(${imagenUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined
  return (
    <div className="relative h-[300px] bg-[var(--hc-n-100)]" style={fondo}>
      <Link
        to={visitanteRuta('shop')}
        aria-label="Volver"
        className="absolute left-5 top-5 flex size-[38px] items-center justify-center rounded-full bg-hc-surface"
      >
        <IconoVolver className="size-5" />
      </Link>
    </div>
  )
}


function Badge({ tono, children }: { tono: 'ok' | 'aviso'; children: string }) {
  const cls = tono === 'ok'
    ? 'bg-[var(--hc-success-bg)] text-hc-success'
    : 'bg-[var(--hc-warning-bg)] text-hc-warning'
  return <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${cls}`}>{children}</span>
}

function Stepper({ cantidad, onMenos, onMas }: { cantidad: number; onMenos: () => void; onMas: () => void }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="text-xs font-medium text-hc-muted">Cantidad</span>
      <div className="flex items-center gap-4 rounded-full bg-[var(--hc-n-100)] px-3.5 py-2 font-bold">
        <button type="button" aria-label="Menos" onClick={onMenos} className="flex size-8 items-center justify-center">
          <IconoMenos className="size-4" />
        </button>
        <span className="text-[13px]">{cantidad}</span>
        <button type="button" aria-label="Más" onClick={onMas} className="flex size-8 items-center justify-center">
          <IconoMas className="size-4" />
        </button>
      </div>
    </div>
  )
}

function TarjetaAsesor() {
  return (
    <section className="mb-5 rounded-[18px] border border-hc-border p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex size-[38px] items-center justify-center rounded-full bg-hc-accent text-white">
          <IconoChispa className="size-4" />
        </div>
        <div>
          <p className="text-[13px] font-bold">Preguntá sobre este producto</p>
          <p className="text-[10px] text-hc-muted">Asesor IA de HotClick · Respuesta al instante</p>
        </div>
      </div>
      <VisitanteBoton to={visitanteRuta('asesor-ia')} variant="soft" className="gap-2 py-3 text-xs">
        <IconoChat className="size-4" />
        Preguntar al Asesor IA
      </VisitanteBoton>
    </section>
  )
}

function SeccionVideo() {
  return (
    <section className="mb-5">
      <h2 className="mb-3 text-sm font-bold">Video del producto</h2>
      <div className="relative mb-2.5 flex h-[186px] items-center justify-center rounded-2xl bg-hc-text">
        <span className="flex size-[52px] items-center justify-center rounded-full bg-white/90 text-hc-text">
          <IconoPlay className="size-6" />
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <span className="rounded-full bg-[var(--hc-red-50)] py-2.5 text-center text-[10px] font-bold text-hc-danger">YouTube</span>
        <span className="rounded-full bg-[var(--hc-red-50)] py-2.5 text-center text-[10px] font-bold text-hc-primary">Instagram</span>
        <span className="rounded-full bg-[var(--hc-n-200)] py-2.5 text-center text-[10px] font-bold">TikTok</span>
      </div>
    </section>
  )
}

function SellosConfianza() {
  const items = [
    { icono: <IconoEscudo className="size-4" />, label: 'Garantía 15 días' },
    { icono: <IconoCandado className="size-4" />, label: 'Pago seguro' },
    { icono: <IconoChat className="size-4" />, label: 'Soporte WhatsApp' },
    { icono: <IconoCamion className="size-4" />, label: 'Envío a todo CR' },
  ]
  return (
    <ul className="mb-5 flex gap-2.5 overflow-x-auto">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-[var(--hc-blue-50)] px-2.5 py-2 text-[8px] font-medium text-hc-accent"
        >
          {item.icono}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

function TabsProducto({ tab, onTab }: { tab: 'specs' | 'uso'; onTab: (t: 'specs' | 'uso') => void }) {
  return (
    <div className="mb-3 flex gap-5">
      <button type="button" onClick={() => onTab('specs')} className="flex flex-col gap-1.5">
        <span className={`text-[13px] ${tab === 'specs' ? 'font-bold text-hc-accent' : 'font-medium text-hc-muted'}`}>
          Especificaciones
        </span>
        {tab === 'specs' ? <span className="h-0.5 w-[90px] bg-hc-accent" /> : null}
      </button>
      <button
        type="button"
        onClick={() => onTab('uso')}
        className={`text-[13px] ${tab === 'uso' ? 'font-bold text-hc-accent' : 'font-medium text-hc-muted'}`}
      >
        Cómo usarlo
      </button>
    </div>
  )
}
