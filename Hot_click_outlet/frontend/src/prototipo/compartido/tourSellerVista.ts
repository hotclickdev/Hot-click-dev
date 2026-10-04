import { evaluarPasos, guiaObligatoriaLista, indicePasoActivo, pasoSiguiente, type HechosTour, type PasoTour } from './tourPasos'
import { rutasDePasos, type ContextoTour, type PreferenciasTour } from './tourSellerRutas'

export type VistaTour = {
  pasos: PasoTour[]
  rutas: ReturnType<typeof rutasDePasos>
  oculto: boolean
  minimizado: boolean
  lista: boolean
  siguiente: PasoTour | null
  indice: number
}

export function vistaTour(hechos: HechosTour, prefs: PreferenciasTour, ctx: ContextoTour): VistaTour {
  const pasos = evaluarPasos({ ...hechos, vioTienda: hechos.vioTienda || prefs.vioTienda })
  return {
    pasos,
    rutas: rutasDePasos(ctx),
    oculto: prefs.descartado,
    minimizado: prefs.minimizado,
    lista: guiaObligatoriaLista(pasos),
    siguiente: pasoSiguiente(pasos),
    indice: indicePasoActivo(pasos),
  }
}
