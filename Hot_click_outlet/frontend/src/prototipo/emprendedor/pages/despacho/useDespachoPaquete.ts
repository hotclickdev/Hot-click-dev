import { useEffect, useState } from 'react'
import { cargarDespachoPaquete, despacharPaqueteApi } from '@/prototipo/compartido/pedidosVendedorApi'
import type { DespachoPaquete } from './despachoPaquete'

export type EstadoCarga = 'cargando' | 'listo' | 'error'

export function useDespachoPaquete(id: string) {
  const [despacho, setDespacho] = useState<DespachoPaquete | null>(null)
  const [estado, setEstado] = useState<EstadoCarga>('cargando')

  useEffect(() => {
    let activo = true
    cargarDespachoPaquete(id)
      .then((datos) => {
        if (!activo) return
        setDespacho(datos)
        setEstado('listo')
      })
      .catch((err: unknown) => {
        console.error('[Despacho] no se pudo cargar el paquete', err)
        if (activo) setEstado('error')
      })
    return () => {
      activo = false
    }
  }, [id])

  async function despachar(numeroGuia: string | null) {
    await despacharPaqueteApi(id, numeroGuia)
    setDespacho((actual) => (actual ? { ...actual, estado: 'ENVIADO', numeroGuia } : actual))
  }

  return { despacho, estado, despachar }
}
