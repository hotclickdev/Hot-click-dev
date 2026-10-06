import { PROVINCIAS_CR, cantonesDe } from './divisionTerritorialCR'

export type CantonOficial = { nombre: string; distritos: string[] }
export type ProvinciaOficial = { nombre: string; cantones: CantonOficial[] }

export function sinTildes(valor: string): string {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Si el IGN manda el nombre sin tilde, usa la forma que ya conoce el resto de la app. */
export function nombreConocido(nombre: string, conocidos: readonly string[]): string {
  const clave = sinTildes(nombre)
  return conocidos.find((item) => sinTildes(item) === clave) ?? nombre
}

export function presentarCatalogo(provincias: ProvinciaOficial[]): ProvinciaOficial[] {
  return provincias.map((provincia) => {
    const nombre = nombreConocido(provincia.nombre, PROVINCIAS_CR)
    const conocidos = cantonesDe(nombre)
    return {
      nombre,
      cantones: provincia.cantones.map((canton) => ({
        nombre: nombreConocido(canton.nombre, conocidos),
        distritos: canton.distritos,
      })),
    }
  })
}

export function cantonesDeCatalogo(catalogo: ProvinciaOficial[], provincia: string): string[] {
  const encontrada = catalogo.find((item) => sinTildes(item.nombre) === sinTildes(provincia))
  return encontrada?.cantones.map((canton) => canton.nombre) ?? []
}

export function distritosDeCatalogo(catalogo: ProvinciaOficial[], provincia: string, canton: string): string[] {
  const cantones = catalogo.find((item) => sinTildes(item.nombre) === sinTildes(provincia))?.cantones ?? []
  return cantones.find((item) => sinTildes(item.nombre) === sinTildes(canton))?.distritos ?? []
}
