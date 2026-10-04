import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { warehouseService } from '@/services/orderService'
import { cargarBodegasVendedor } from './bodegasVendedorApi'
import { cargarProductosVendedor } from './catalogoVendedorApi'
import { metodosCobroService } from '@/services/metodosCobroService'
import type { HechosTour } from './tourPasos'
import {
  contextoTour,
  guardarPreferencia,
  leerPreferencias,
  pasoDeRuta,
  type PreferenciasTour,
} from './tourSellerRutas'
import { vistaTour, type VistaTour } from './tourSellerVista'

function storageSeguro(): Storage | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

function tieneUbicacion(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const registro = data as Record<string, unknown>
  const interno = registro.data && typeof registro.data === 'object'
    ? registro.data as Record<string, unknown>
    : registro
  return interno.tieneUbicacion === true
}

async function cargarHechos(): Promise<HechosTour> {
  const [bodegas, productos, cobro, ubicacion] = await Promise.all([
    cargarBodegasVendedor().catch(() => []),
    cargarProductosVendedor().catch(() => []),
    metodosCobroService.listar().then((res) => (Array.isArray(res.data) ? res.data : [])).catch(() => []),
    warehouseService.getUbicacionDespacho().then((res) => res.data).catch(() => null),
  ])
  return {
    bodegas: bodegas.length,
    productos: productos.length,
    metodosCobro: cobro.length,
    tieneUbicacion: tieneUbicacion(ubicacion),
    vioTienda: false,
  }
}

export function useTourSeller() {
  const { pathname } = useLocation()
  const userId = useAuthStore((s) => s.userId)
  const empresaId = useAuthStore((s) => s.empresaId)
  const ctx = contextoTour(pathname)
  const [hechos, setHechos] = useState<HechosTour | null>(null)
  const [error, setError] = useState(false)
  const prefsVacias: PreferenciasTour = { descartado: false, minimizado: false, vioTienda: false }
  const clavePrefs = userId != null && empresaId != null ? `${userId}:${empresaId}` : ''
  const [claveAplicada, setClaveAplicada] = useState('')
  const [prefs, setPrefs] = useState<PreferenciasTour>(prefsVacias)
  const [carga, setCarga] = useState(0)

  if (clavePrefs !== claveAplicada) {
    setClaveAplicada(clavePrefs)
    const storage = storageSeguro()
    setPrefs(
      storage && userId != null && empresaId != null
        ? leerPreferencias(storage, userId, empresaId)
        : prefsVacias,
    )
  }

  useEffect(() => {
    const alReabrir = () => {
      const storage = storageSeguro()
      if (!storage || userId == null || empresaId == null) return
      setPrefs(leerPreferencias(storage, userId, empresaId))
    }
    globalThis.addEventListener('hc-tour-reabrir', alReabrir)
    return () => globalThis.removeEventListener('hc-tour-reabrir', alReabrir)
  }, [userId, empresaId])

  useEffect(() => {
    if (!contextoTour(pathname) || userId == null || empresaId == null) return
    let cancelado = false
    cargarHechos()
      .then((datos) => {
        if (cancelado) return
        setHechos(datos)
        setError(false)
      })
      .catch(() => { if (!cancelado) setError(true) })
    return () => { cancelado = true }
  }, [pathname, userId, empresaId, carga])

  const cambiar = useCallback((sufijo: 'descartado' | 'minimizado' | 'tienda', activo: boolean) => {
    const storage = storageSeguro()
    if (!storage || userId == null || empresaId == null) return
    guardarPreferencia(storage, userId, empresaId, sufijo, activo)
    setPrefs(leerPreferencias(storage, userId, empresaId))
  }, [userId, empresaId])

  const vista: VistaTour | null = ctx && hechos
    ? vistaTour(hechos, prefs, ctx)
    : null

  return {
    listo: Boolean(ctx && userId != null && empresaId != null),
    error,
    vista,
    pasoRuta: pasoDeRuta(pathname),
    reintentar: () => setCarga((n) => n + 1),
    descartar: () => cambiar('descartado', true),
    minimizar: () => cambiar('minimizado', true),
    expandir: () => cambiar('minimizado', false),
    marcarTiendaVista: () => cambiar('tienda', true),
  }
}

export function reabrirGuiaTour() {
  const { userId, empresaId } = useAuthStore.getState()
  const storage = storageSeguro()
  if (storage && userId != null && empresaId != null) {
    guardarPreferencia(storage, userId, empresaId, 'descartado', false)
    guardarPreferencia(storage, userId, empresaId, 'minimizado', false)
  }
  globalThis.dispatchEvent(new Event('hc-tour-reabrir'))
}

