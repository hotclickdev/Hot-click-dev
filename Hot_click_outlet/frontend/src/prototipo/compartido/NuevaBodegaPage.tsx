import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { crearBodegaVendedor } from './bodegasVendedorApi'
import FormularioPorPasos from './FormularioPorPasos'
import CamposUbicacion from './CamposUbicacion'
import MapaGoogleBodega from './MapaGoogleBodega'
import PhoneField from '@/components/ui/PhoneField'
import type { PasoFormulario } from './formularioPorPasosHelpers'
import {
  FORM_BODEGA_INICIAL, mensajeErrorGuardarBodega, validarPasoBodega,
  type FormBodega, type PasoBodega,
} from './nuevaBodegaHelpers'
import { erroresUbicacion, type UbicacionDespacho } from './ubicacionDespachoHelpers'

const PASOS: readonly (PasoFormulario & { id: PasoBodega })[] = [
  { id: 'nombre', titulo: 'Nombre de la bodega' },
  { id: 'ubicacion', titulo: 'Ubicación de despacho' },
  { id: 'telefono', titulo: 'Teléfono' },
  { id: 'encargado', titulo: 'Encargado', opcional: true },
]

type Props = Readonly<{
  volverA: string
  rutaExito?: string
  /** Solo wizard (sin main/encabezado); para shell Emprendedor. */
  soloFormulario?: boolean
}>

/**
 * Alta de bodega (Figma 78:325) — wizard conversacional.
 */
export function NuevaBodegaPage({
  volverA,
  rutaExito,
  soloFormulario = false,
}: Props) {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState<FormBodega>(FORM_BODEGA_INICIAL)
  const [intentoUbicacion, setIntentoUbicacion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const idPaso = PASOS[paso]?.id
  const destino = rutaExito ?? volverA

  function setCampo(campo: 'nombre' | 'telefono' | 'encargado') {
    return (valor: string) => setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function setUbicacion(ubicacion: UbicacionDespacho) {
    setForm((prev) => ({ ...prev, ubicacion }))
  }

  function validar(i: number): string | null {
    const id = PASOS[i]?.id
    if (id === 'ubicacion') setIntentoUbicacion(true)
    return validarPasoBodega(id, form)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      await crearBodegaVendedor(form)
      navigate(destino)
    } catch (err: unknown) {
      console.error('[NuevaBodega]', err)
      setError(mensajeErrorGuardarBodega(err))
    } finally {
      setGuardando(false)
    }
  }

  const wizard = (
    <div className="w-full max-w-[640px]">
      <FormularioPorPasos
        pasos={PASOS}
        pasoActual={paso}
        onPasoChange={setPaso}
        validarPaso={validar}
        onFinalizar={guardar}
        etiquetaFinal="Guardar bodega"
        enviando={guardando}
      >
        {idPaso === 'nombre' ? (
          <Campo
            etiqueta="Nombre de la bodega"
            value={form.nombre}
            onChange={setCampo('nombre')}
            placeholder="Ej: Bodega Central"
          />
        ) : null}
        {idPaso === 'ubicacion' ? (
          <>
            <CamposUbicacion
              ubicacion={form.ubicacion}
              onChange={setUbicacion}
              errores={intentoUbicacion ? erroresUbicacion(form.ubicacion) : undefined}
            />
            <MapaGoogleBodega
              latitud={form.ubicacion.latitud ?? null}
              longitud={form.ubicacion.longitud ?? null}
              onCambio={(latitud, longitud) => setForm((prev) => ({
                ...prev,
                ubicacion: { ...prev.ubicacion, latitud, longitud },
              }))}
            />
          </>
        ) : null}
        {idPaso === 'telefono' ? (
          <PhoneField label="Teléfono de la bodega" value={form.telefono} onChange={setCampo('telefono')} required forceDialCode />
        ) : null}
        {idPaso === 'encargado' ? (
          <Campo
            etiqueta="Encargado (opcional)"
            value={form.encargado}
            onChange={setCampo('encargado')}
            placeholder="Ej: Sofía Vargas"
          />
        ) : null}
        {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
      </FormularioPorPasos>
    </div>
  )

  if (soloFormulario) return wizard

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Nueva Bodega" volverA={volverA} />
      {wizard}
    </main>
  )
}

/** Default para SellerRoutes: resuelve rutas con useSellerRuta. */
export default function NuevaBodegaSellerPage() {
  const ruta = useSellerRuta()
  return <NuevaBodegaPage volverA={ruta('bodegas')} rutaExito={ruta('bodegas')} />
}
