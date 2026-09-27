import { useTranslation } from 'react-i18next'
import type { OpcionEntrega } from './paquetesCompra'

/** Título, detalle y etiqueta corta de cada método de entrega (Figma `29:1248` y `29:1344`). */
export function useTextosEntrega() {
  const { t } = useTranslation()

  function titulo(metodo: string | undefined): string {
    return t(`compra.envio.${metodo}.titulo`)
  }

  function detalle(opcion: OpcionEntrega): string {
    if (!opcion.retiro) return t(`compra.envio.${opcion.metodo}.detalle`)
    return [opcion.retiro.direccion, opcion.retiro.horario].filter(Boolean).join(' · ')
  }

  function corto(metodo: string | undefined): string {
    return t(`compra.envio.${metodo}.corto`)
  }

  return { titulo, detalle, corto }
}
