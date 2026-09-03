import { useState } from 'react'
import { Campo } from '@/prototipo/compartido/ui'
import FormularioPorPasos from '@/prototipo/compartido/FormularioPorPasos'
import { ZONA_FUERA_GAM, ZONA_GAM } from './zonaLogistica'
import { PASOS_RECOLECCION, validarPasoRecoleccion } from './recoleccionPasos'
import type { RecoleccionCreatePayload } from './recoleccionTipos'

type Props = Readonly<{
  enviando: boolean
  onEnviar: (payload: RecoleccionCreatePayload) => Promise<void>
}>

const VACIO: RecoleccionCreatePayload = {
  zona: ZONA_GAM,
  direccionRecoleccion: '',
  contactoRecoleccion: '',
  telefonoRecoleccion: '',
  direccionEntrega: '',
  contactoEntrega: '',
  telefonoEntrega: '',
  notas: '',
}

export default function RecoleccionFormulario({ enviando, onEnviar }: Props) {
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState(VACIO)
  const idPaso = PASOS_RECOLECCION[paso]?.id

  function setCampo<K extends keyof RecoleccionCreatePayload>(clave: K, valor: RecoleccionCreatePayload[K]) {
    setForm((prev) => ({ ...prev, [clave]: valor }))
  }

  async function enviar() {
    await onEnviar({ ...form, notas: form.notas?.trim() || undefined })
    setForm(VACIO)
    setPaso(0)
  }

  return (
    <FormularioPorPasos
      pasos={PASOS_RECOLECCION}
      pasoActual={paso}
      onPasoChange={setPaso}
      validarPaso={(i) => validarPasoRecoleccion(i, form)}
      onFinalizar={enviar}
      etiquetaFinal="Pedir tarifa a HOTCLICK"
      enviando={enviando}
    >
      {idPaso === 'zona' ? (
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-hc-muted">Zona</legend>
          <div className="flex flex-col gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-hc-border px-3 text-sm">
              <input
                type="radio"
                name="zona"
                checked={form.zona === ZONA_GAM}
                onChange={() => setCampo('zona', ZONA_GAM)}
              />
              Gran Área Metropolitana (GAM)
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-hc-border px-3 text-sm text-hc-muted">
              <input type="radio" name="zona" disabled checked={form.zona === ZONA_FUERA_GAM} />
              Fuera de la GAM — en desarrollo
            </label>
          </div>
        </fieldset>
      ) : null}
      {idPaso === 'pickup' ? (
        <>
          <Campo
            etiqueta="Dirección de recolección"
            value={form.direccionRecoleccion}
            onChange={(v) => setCampo('direccionRecoleccion', v)}
            placeholder="Provincia, cantón, señas"
          />
          <Campo
            etiqueta="Quién entrega el paquete"
            value={form.contactoRecoleccion}
            onChange={(v) => setCampo('contactoRecoleccion', v)}
          />
          <Campo
            etiqueta="Teléfono de recolección"
            value={form.telefonoRecoleccion}
            onChange={(v) => setCampo('telefonoRecoleccion', v)}
            type="tel"
          />
        </>
      ) : null}
      {idPaso === 'entrega' ? (
        <>
          <Campo
            etiqueta="Dirección de entrega"
            value={form.direccionEntrega}
            onChange={(v) => setCampo('direccionEntrega', v)}
            placeholder="Dirección del cliente con señas"
          />
          <Campo
            etiqueta="Nombre del cliente"
            value={form.contactoEntrega}
            onChange={(v) => setCampo('contactoEntrega', v)}
          />
          <Campo
            etiqueta="Teléfono del cliente"
            value={form.telefonoEntrega}
            onChange={(v) => setCampo('telefonoEntrega', v)}
            type="tel"
          />
        </>
      ) : null}
      {idPaso === 'notas' ? (
        <label className="block">
          <span className="mb-2 block text-xs font-medium text-hc-muted">Notas (opcional)</span>
          <textarea
            value={form.notas}
            onChange={(e) => setCampo('notas', e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-hc-surface-2 px-3.5 py-3 text-sm text-hc-text"
          />
        </label>
      ) : null}
    </FormularioPorPasos>
  )
}
