import { useState } from 'react'
import type { Producto } from '@/types/producto'
import type { PersonalizacionCarrito } from '@/types/carrito'
import { encargoService, urlDesdeUploadEncargo } from '@/services/encargoService'
import { useToast } from '@/components/ui/Toast'

const MAX_IMAGENES = 3

type Props = {
  product: Producto
  tallaSeleccionada: string | null
  personalizacion: PersonalizacionCarrito
  onChange: (next: PersonalizacionCarrito) => void
  contacto: { nombre: string; email: string; telefono: string }
  onContactoChange: (c: { nombre: string; email: string; telefono: string }) => void
  requiereContacto: boolean
}

export default function PersonalizacionPanel({
  product, tallaSeleccionada, personalizacion, onChange,
  contacto, onContactoChange, requiereContacto,
}: Props) {
  const toast = useToast()
  const [subiendo, setSubiendo] = useState<number | null>(null)
  const modo = product.modoPrecioPersonalizado
  const slots = slotsDesdeImagenes(personalizacion.imagenes)

  async function subir(slot: number, file: File | undefined) {
    if (!file) return
    setSubiendo(slot)
    try {
      const { data } = await encargoService.subirImagen(file)
      const url = urlDesdeUploadEncargo(data)
      if (!url) throw new Error('Sin URL')
      const next = [...slots]
      next[slot] = url
      onChange({
        ...personalizacion,
        imagenes: next.filter(Boolean),
        tallaSeleccionada: tallaSeleccionada || undefined,
      })
    } catch {
      toast({ message: 'No se pudo subir la imagen. Probá con JPG o PNG de menos de 10 MB.', type: 'error' })
    } finally {
      setSubiendo(null)
    }
  }

  function quitar(slot: number) {
    const next = [...slots]
    next[slot] = ''
    onChange({ ...personalizacion, imagenes: next.filter(Boolean) })
  }

  return (
    <div className="rounded-2xl border p-4 space-y-4" style={{ borderColor: 'var(--hc-border)' }}>
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Personalizá tu pedido</h3>
        <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>
          Subí hasta 3 imágenes de referencia y contale al artista qué querés.
        </p>
      </div>

      {product.instruccionesPersonalizacion && (
        <div className="text-xs rounded-xl px-3 py-2" style={{ background: 'rgba(23,71,168,0.06)', color: 'var(--hc-text)' }}>
          <strong>Indicaciones del artista:</strong> {product.instruccionesPersonalizacion}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((slot) => {
          const url = slots[slot]
          return (
            <div key={slot} className="relative aspect-square rounded-xl border overflow-hidden flex items-center justify-center"
              style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface, #f8f9fb)' }}>
              {url ? (
                <>
                  <img src={url} alt={`Referencia ${slot + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => quitar(slot)}
                    className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                    Quitar
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center gap-1 text-[11px] cursor-pointer p-2 text-center"
                  style={{ color: 'var(--hc-muted)' }}>
                  <span>{subiendo === slot ? 'Subiendo…' : `Imagen ${slot + 1}`}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={subiendo !== null}
                    onChange={e => void subir(slot, e.target.files?.[0])} />
                </label>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <label className="text-xs font-medium" style={{ color: 'var(--hc-text)' }}>Notas para el artista</label>
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--hc-border)', minHeight: 72 }}
          value={personalizacion.notas || ''}
          onChange={e => onChange({
            ...personalizacion,
            notas: e.target.value,
            tallaSeleccionada: tallaSeleccionada || undefined,
          })}
          placeholder="Ej: quiero la foto del medio centrada, fondo blanco, texto ‘Feliz cumpleaños’ abajo…"
          maxLength={2000}
        />
      </div>

      {requiereContacto && (
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--hc-border)' }}
            placeholder="Tu nombre" value={contacto.nombre}
            onChange={e => onContactoChange({ ...contacto, nombre: e.target.value })} />
          <input className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--hc-border)' }}
            placeholder="Email" type="email" value={contacto.email}
            onChange={e => onContactoChange({ ...contacto, email: e.target.value })} />
          <input className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--hc-border)' }}
            placeholder="Teléfono" value={contacto.telefono}
            onChange={e => onContactoChange({ ...contacto, telefono: e.target.value })} />
        </div>
      )}

      <ComoFunciona modo={modo} product={product} />
    </div>
  )
}

function slotsDesdeImagenes(imagenes: string[] | undefined): string[] {
  const slots = ['', '', '']
  ;(imagenes || []).slice(0, MAX_IMAGENES).forEach((u, i) => { slots[i] = u })
  return slots
}

function ComoFunciona({ modo, product }: { modo: string | null; product: Producto }) {
  const pasos = modo === 'FIJO'
    ? ['Subís tus fotos y notas', 'Agregás al carrito y pagás', 'El artista recibe el encargo ya pagado']
    : ['Subís tus fotos y notas', 'El artista revisa y te cotiza', 'Recibís un link para pagar']

  let precioLabel = 'Precio a cotizar'
  if (modo === 'FIJO') {
    precioLabel = `Precio fijo: ₡${(product.precioVenta || product.precio || 0).toLocaleString('es-CR')}`
  } else if (modo === 'RANGO' && product.precioPersonalizadoMin != null && product.precioPersonalizadoMax != null) {
    precioLabel = `Desde ₡${product.precioPersonalizadoMin.toLocaleString('es-CR')} hasta ₡${product.precioPersonalizadoMax.toLocaleString('es-CR')}`
  }

  return (
    <div className="text-xs space-y-1.5 pt-1" style={{ color: 'var(--hc-muted)' }}>
      <p className="font-semibold" style={{ color: 'var(--hc-text)' }}>¿Cómo funciona?</p>
      <p>{precioLabel}</p>
      <ol className="list-decimal list-inside space-y-0.5">
        {pasos.map(p => <li key={p}>{p}</li>)}
      </ol>
    </div>
  )
}
