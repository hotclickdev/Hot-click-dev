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

const CAMPO = 'rounded-[10px] border border-hc-n-200 bg-hc-n-0 px-3 py-[10px] text-[14px] text-hc-n-900 placeholder:text-hc-n-500 focus:border-hc-blue-600 focus:outline-none'

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
 * "Personalizá tu pedido" (Figma 44:1849, nodo 44:1884): indicaciones del artista, tres espacios
 * de imagen de referencia y notas. El presupuesto, los datos de contacto y "¿Cómo funciona?"
 * no están en Figma: se conservan de la versión anterior con los mismos tokens, salvo con precio
 * fijo (el frame no los muestra).
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
      <div className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px] leading-[normal]">
        <h2 id="personaliza-titulo" className="font-sans text-[15px] font-semibold leading-[18px] tracking-normal text-hc-n-900">{t('product.personalizaTitulo')}</h2>
        <p className="text-[12px] leading-4 text-hc-n-600">{t('product.personalizaAyuda')}</p>

        {product.instruccionesPersonalizacion && (
          <p className="rounded-[10px] bg-hc-blue-50 px-3 py-[10px] text-[12px] leading-4 text-hc-n-900">
            <span className="font-semibold">{t('product.indicacionesArtista')}</span>: {product.instruccionesPersonalizacion}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((slot) => {
            const url = slots[slot]
            return (
              <div
                key={slot}
                className={`relative flex h-[90px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[10px] border border-hc-n-200 bg-hc-n-50 ${url ? '' : 'border-dashed'}`}
              >
                {url ? (
                  <>
                    <img src={url} alt={t('product.referenciaN', { n: slot + 1 })} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => quitar(slot)}
                      className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-hc-n-0"
                    >
                      {t('product.quitar')}
                    </button>
                  </>
                ) : (
                  <label
                    className="flex size-full cursor-pointer flex-col items-center justify-center gap-1 text-[11px] text-hc-n-600"
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

        <label htmlFor="notas-artista-personalizacion" className="text-[13px] font-medium text-hc-n-900">
          {t('product.notasArtista')}
        </label>
        <textarea
          id="notas-artista-personalizacion"
          rows={2}
          className={`${CAMPO} min-h-[61px] w-full resize-y border-[1.5px] leading-[19px]`}
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
          <div className="grid gap-2 sm:grid-cols-3">
            <input className={CAMPO} placeholder={t('product.contactoNombre')} value={contacto.nombre}
              onChange={(e) => onContactoChange({ ...contacto, nombre: e.target.value })} />
            <input className={CAMPO} placeholder={t('product.contactoEmail')} type="email" value={contacto.email}
              onChange={(e) => onContactoChange({ ...contacto, email: e.target.value })} />
            <input className={CAMPO} placeholder={t('product.contactoTelefono')} value={contacto.telefono}
              onChange={(e) => onContactoChange({ ...contacto, telefono: e.target.value })} />
          </div>
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

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-medium text-hc-n-900" id={labelId}>
        {t('product.presupuestoTitulo')}
      </p>
      <div className="flex flex-col gap-2" role="radiogroup" aria-labelledby={labelId}>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-hc-n-600">
          <input type="radio" name="presupuesto-tipo" checked={tipo === 'SIN_PRESUPUESTO'} onChange={() => setTipo('SIN_PRESUPUESTO')} />
          {t('product.presupuestoSin')}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-hc-n-600">
          <input type="radio" name="presupuesto-tipo" checked={tipo === 'RANGO'} onChange={() => setTipo('RANGO')} />
          {t('product.presupuestoRango')}
        </label>
      </div>
      {tipo === 'RANGO' ? (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={1}
            className={CAMPO}
            placeholder={t('product.presupuestoMin')}
            value={personalizacion.presupuestoMin ?? ''}
            onChange={(e) => onChange({ ...personalizacion, presupuestoMin: e.target.value, presupuestoTipo: 'RANGO' })}
          />
          <input
            type="number"
            min={1}
            className={CAMPO}
            placeholder={t('product.presupuestoMax')}
            value={personalizacion.presupuestoMax ?? ''}
            onChange={(e) => onChange({ ...personalizacion, presupuestoMax: e.target.value, presupuestoTipo: 'RANGO' })}
          />
        </div>
      ) : null}
    </div>
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
    <div className="flex flex-col gap-[6px] text-[12px] leading-4 text-hc-n-600">
      <p className="font-semibold text-hc-n-900">{t('product.comoFunciona')}</p>
      <p>{precioLabel}</p>
      <ol className="list-inside list-decimal space-y-0.5">
        {pasos.map((p) => <li key={p}>{p}</li>)}
      </ol>
    </div>
  )
}
