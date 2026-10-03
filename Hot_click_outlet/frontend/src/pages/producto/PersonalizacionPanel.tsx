import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import type { Producto } from '@/types/producto'
import type { PersonalizacionCarrito } from '@/types/carrito'
import { encargoService, urlDesdeUploadEncargo } from '@/services/encargoService'
import { useToast } from '@/components/ui/Toast'
import { formatMiles } from '@/utils/format'
import { ICONOS_PRODUCTO } from './iconosProducto'

const MAX_IMAGENES = 3

/** Campo de Figma (manual de marca): radio 12, borde n200; foco b600 con halo b100. */
const CAMPO = 'w-full rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-[14px] py-[11px] text-[14px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500 focus:border-hc-blue-600 focus:shadow-[0_0_0_3px_var(--hc-blue-100)]'
const ETIQUETA = 'text-[13px] font-semibold leading-[normal] text-hc-n-900'

type Props = {
  product: Producto
  tallaSeleccionada: string | null
  personalizacion: PersonalizacionCarrito
  onChange: (next: PersonalizacionCarrito) => void
  contacto: { nombre: string; email: string; telefono: string }
  onContactoChange: (c: { nombre: string; email: string; telefono: string }) => void
  requiereContacto: boolean
}

/**
 * "Personalizá tu pedido" (Figma 44:1849, nodo 44:1884): indicaciones del artista en caja b50, tres
 * espacios de imagen punteados y notas. El presupuesto (opciones tipo tarjeta y rango en ₡), los datos
 * de contacto y "¿Cómo funciona?" (pasos numerados) no están en el frame: se derivan del manual de marca
 * (campos radio 12 con foco b600 + halo b100, pills 999). Con precio fijo no se muestran.
 */
export default function PersonalizacionPanel({
  product, tallaSeleccionada, personalizacion, onChange,
  contacto, onContactoChange, requiereContacto,
}: Props) {
  const { t } = useTranslation()
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
      toast({ message: t('product.personalizaErrorSubida'), type: 'error' })
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
    <section aria-labelledby="personaliza-titulo" className="px-4 pb-2 pt-[14px] lg:p-0">
      <div className="flex flex-col gap-[14px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4 leading-[normal]">
        <div className="flex flex-col gap-1">
          <h2 id="personaliza-titulo" className="font-sans text-[15px] font-semibold leading-[18px] tracking-normal text-hc-n-900">{t('product.personalizaTitulo')}</h2>
          <p className="text-[13px] leading-[18px] text-hc-n-600">{t('product.personalizaAyuda')}</p>
        </div>

        {product.instruccionesPersonalizacion && (
          <p className="rounded-[10px] bg-hc-blue-50 px-3 py-[10px] text-[13px] leading-[18px] text-hc-n-900">
            <span className="font-semibold">{t('product.indicacionesArtista')}</span>: {product.instruccionesPersonalizacion}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((slot) => {
            const url = slots[slot]
            return (
              <div
                key={slot}
                className={`relative flex h-[90px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[10px] border bg-hc-n-50 ${url ? 'border-hc-n-200' : 'border-dashed border-hc-n-400'}`}
              >
                {url ? (
                  <>
                    <img src={url} alt={t('product.referenciaN', { n: slot + 1 })} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => quitar(slot)}
                      className="absolute right-[6px] top-[6px] rounded-full bg-hc-n-900/70 px-2 py-[3px] text-[11px] font-semibold text-hc-n-0"
                    >
                      {t('product.quitar')}
                    </button>
                  </>
                ) : (
                  <label
                    className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 text-[12px] text-hc-n-600 focus-within:shadow-[inset_0_0_0_1.5px_var(--hc-blue-600)]"
                    aria-label={t('product.subirReferenciaN', { n: slot + 1 })}
                  >
                    <IconoFigma src={ICONOS_PRODUCTO.subirImagen} size={18} className="text-hc-n-500" />
                    <span>{subiendo === slot ? t('product.subiendo') : t('product.imagenN', { n: slot + 1 })}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={subiendo !== null}
                      onChange={(e) => void subir(slot, e.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
            )
          })}
        </div>

        <label htmlFor="notas-artista-personalizacion" className={`${ETIQUETA} -mb-2`}>
          {t('product.notasArtista')}
        </label>
        <textarea
          id="notas-artista-personalizacion"
          rows={3}
          className={`${CAMPO} min-h-[76px] resize-y leading-[19px]`}
          value={personalizacion.notas || ''}
          onChange={(e) => onChange({
            ...personalizacion,
            notas: e.target.value,
            tallaSeleccionada: tallaSeleccionada || undefined,
          })}
          placeholder={t('product.notasPlaceholder')}
          maxLength={2000}
        />

        {modo !== 'FIJO' && (
          <PresupuestoCliente personalizacion={personalizacion} onChange={onChange} tallaSeleccionada={tallaSeleccionada} />
        )}

        {requiereContacto && (
          <fieldset className="m-0 flex min-w-0 flex-col gap-[6px] border-0 p-0">
            <legend className={`${ETIQUETA} mb-2 p-0`}>{t('product.contactoTitulo')}</legend>
            <input className={CAMPO} aria-label={t('product.contactoNombre')} placeholder={t('product.contactoNombre')} autoComplete="name" value={contacto.nombre}
              onChange={(e) => onContactoChange({ ...contacto, nombre: e.target.value })} />
            <div className="grid gap-[6px] sm:grid-cols-2">
              <input className={CAMPO} aria-label={t('product.contactoEmail')} placeholder={t('product.contactoEmail')} type="email" autoComplete="email" value={contacto.email}
                onChange={(e) => onContactoChange({ ...contacto, email: e.target.value })} />
              <input className={CAMPO} aria-label={t('product.contactoTelefono')} placeholder={t('product.contactoTelefono')} type="tel" inputMode="tel" autoComplete="tel" value={contacto.telefono}
                onChange={(e) => onContactoChange({ ...contacto, telefono: e.target.value })} />
            </div>
          </fieldset>
        )}

        {modo !== 'FIJO' && <ComoFunciona modo={modo} product={product} />}
      </div>
    </section>
  )
}

function PresupuestoCliente({
  personalizacion,
  onChange,
  tallaSeleccionada,
}: {
  personalizacion: PersonalizacionCarrito
  onChange: (next: PersonalizacionCarrito) => void
  tallaSeleccionada: string | null
}) {
  const { t } = useTranslation()
  const tipo = personalizacion.presupuestoTipo ?? 'SIN_PRESUPUESTO'
  const labelId = 'presupuesto-encargo-label'

  function setTipo(next: 'SIN_PRESUPUESTO' | 'RANGO') {
    onChange({
      ...personalizacion,
      presupuestoTipo: next,
      presupuestoMin: next === 'RANGO' ? personalizacion.presupuestoMin : undefined,
      presupuestoMax: next === 'RANGO' ? personalizacion.presupuestoMax : undefined,
      tallaSeleccionada: tallaSeleccionada || undefined,
    })
  }

  const opciones = [
    { valor: 'SIN_PRESUPUESTO' as const, texto: t('product.presupuestoSin') },
    { valor: 'RANGO' as const, texto: t('product.presupuestoRango') },
  ]

  return (
    <div className="flex flex-col gap-2">
      <p className={ETIQUETA} id={labelId}>
        {t('product.presupuestoTitulo')}
      </p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby={labelId}>
        {opciones.map((o) => {
          const activo = tipo === o.valor
          return (
            <label
              key={o.valor}
              className={`flex cursor-pointer items-center gap-[10px] rounded-[12px] border px-3 py-[11px] text-[13px] leading-[18px] focus-within:shadow-[0_0_0_3px_var(--hc-blue-100)] ${
                activo ? 'border-hc-blue-600 bg-hc-blue-50 text-hc-n-900' : 'border-hc-n-200 bg-hc-n-0 text-hc-n-600'
              }`}
            >
              <input type="radio" name="presupuesto-tipo" className="sr-only" checked={activo} onChange={() => setTipo(o.valor)} />
              <span
                aria-hidden="true"
                className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${activo ? 'border-hc-blue-600' : 'border-hc-n-400'}`}
              >
                {activo && <span className="size-2 rounded-full bg-hc-blue-600" />}
              </span>
              {o.texto}
            </label>
          )
        })}
      </div>
      {tipo === 'RANGO' ? (
        <div className="grid grid-cols-2 gap-2">
          <CampoColones
            etiqueta={t('product.presupuestoMin')}
            valor={personalizacion.presupuestoMin ?? ''}
            onCambio={(v) => onChange({ ...personalizacion, presupuestoMin: v, presupuestoTipo: 'RANGO' })}
          />
          <CampoColones
            etiqueta={t('product.presupuestoMax')}
            valor={personalizacion.presupuestoMax ?? ''}
            onCambio={(v) => onChange({ ...personalizacion, presupuestoMax: v, presupuestoTipo: 'RANGO' })}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Monto en colones: el símbolo ₡ va dentro del campo, a la izquierda. */
function CampoColones({ etiqueta, valor, onCambio }: { etiqueta: string; valor: string | number; onCambio: (v: string) => void }) {
  return (
    <span className="relative block">
      <span aria-hidden="true" className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[14px] text-hc-n-600">
        ₡
      </span>
      <input
        type="number"
        min={1}
        inputMode="numeric"
        aria-label={etiqueta}
        className={`${CAMPO} pl-7`}
        placeholder={etiqueta.replace(/\s*₡\s*$/, '')}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      />
    </span>
  )
}

function slotsDesdeImagenes(imagenes: string[] | undefined): string[] {
  const slots = ['', '', '']
  ;(imagenes || []).slice(0, MAX_IMAGENES).forEach((u, i) => { slots[i] = u })
  return slots
}

function ComoFunciona({ modo, product }: { modo: string | null | undefined; product: Producto }) {
  const { t } = useTranslation()
  const pasos = [t('product.pasoCotiza1'), t('product.pasoCotiza2'), t('product.pasoCotiza3')]

  let precioLabel = t('product.precioCotizar')
  if (modo === 'RANGO' && product.precioPersonalizadoMin != null && product.precioPersonalizadoMax != null) {
    precioLabel = t('product.precioRango', {
      min: formatMiles(product.precioPersonalizadoMin),
      max: formatMiles(product.precioPersonalizadoMax),
    })
  }

  return (
    <div className="flex flex-col gap-[10px] rounded-[12px] bg-hc-n-50 p-3 leading-[normal]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-hc-n-900">{t('product.comoFunciona')}</p>
        <span className="rounded-full bg-hc-n-0 px-[10px] py-[3px] text-[12px] font-semibold text-hc-n-900 shadow-[inset_0_0_0_1px_var(--hc-n-200)]">
          {precioLabel}
        </span>
      </div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {pasos.map((p, i) => (
          <li key={p} className="flex items-center gap-[10px] text-[13px] leading-[18px] text-hc-n-600">
            <span aria-hidden="true" className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-[12px] font-bold text-hc-blue-600">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
    </div>
  )
}
