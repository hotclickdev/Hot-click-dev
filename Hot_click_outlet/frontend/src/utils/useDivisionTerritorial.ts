import { useEffect, useState } from 'react'
import { cargarDivisionTerritorial } from '@/services/divisionTerritorialService'
import { PROVINCIAS_CR, cantonesDe } from './divisionTerritorialCR'
import {
  cantonesDeCatalogo,
  distritosDeCatalogo,
  presentarCatalogo,
  type ProvinciaOficial,
} from './divisionTerritorialOficial'

/**
 * Provincias, cantones y distritos del IGN.
 * Si el servicio no responde, provincia y cantón siguen con la lista local y el distrito queda vacío.
 */
export function useDivisionTerritorial() {
  const [catalogo, setCatalogo] = useState<ProvinciaOficial[]>([])
  const [error, setError] = useState(false)

  useEffect(() => {
    let vivo = true
    cargarDivisionTerritorial()
      .then((lista) => { if (vivo) setCatalogo(presentarCatalogo(lista)) })
      .catch((err: unknown) => {
        console.error('[division territorial]', err)
        if (vivo) setError(true)
      })
    return () => { vivo = false }
  }, [])

  const listo = catalogo.length > 0
  return {
    listo,
    error,
    provincias: listo ? catalogo.map((provincia) => provincia.nombre) : [...PROVINCIAS_CR],
    cantonesDe(provincia: string): string[] {
      if (!listo) return [...cantonesDe(provincia)]
      return cantonesDeCatalogo(catalogo, provincia)
    },
    distritosDe(provincia: string, canton: string): string[] {
      if (!listo) return []
      return distritosDeCatalogo(catalogo, provincia, canton)
    },
  }
}
