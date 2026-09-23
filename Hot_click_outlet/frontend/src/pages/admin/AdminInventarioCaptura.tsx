import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BarcodeHidInput from '@/components/inventario/BarcodeHidInput'
import BarcodeCameraScan from '@/components/inventario/BarcodeCameraScan'
import CapturaProductoForm from '@/components/inventario/CapturaProductoForm'
import CapturaPwaInstallBanner from '@/components/inventario/CapturaPwaInstallBanner'
import { esPwaStandalone } from '@/utils/pwaDisplay'
import {
  inventarioPaqueteService,
  type InventarioLookup,
  type LineaRequest,
  type PaqueteInventario,
  type PaqueteLinea,
} from '@/services/inventarioPaqueteService'
import { adminService } from '@/services/orderService'
import { encolarCaptura, comprimirImagenCaptura } from '@/db/capturaOffline'
import { useOffline } from '@/hooks/useOffline'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import { bindWakeLockCaptura } from '@/utils/wakeLockCaptura'
import { listaEmpresasDesdeRespuesta, type EmpresaLista } from './empresas/empresasHelpers'
import type { Id } from '@/types/api'
import './captura-pwa.css'

const TIP_PISTOLA_BLUETOOTH = 'Pistola Bluetooth: emparejá como teclado y escaneá aquí.'

/**
 * Modo captura mobile para ADMIN: pistola/cámara → lookup → foto/datos → línea.
 * Query ?modo=captura o PWA instalada (standalone) oculta el resto del admin vía layout.
 */
export default function AdminInventarioCaptura() {
  const [searchParams] = useSearchParams()
  const pwaStandalone = esPwaStandalone()
  const modoCaptura = searchParams.get('modo') === 'captura' || pwaStandalone
  const { isOnline, pendientesCaptura, recargarConteo } = useOffline()
  const toast = useToast()

  const [empresas, setEmpresas] = useState<EmpresaLista[]>([])
  const [empresaId, setEmpresaId] = useState<Id | ''>('')
  const [nombreTemporal, setNombreTemporal] = useState('')
  const [paquete, setPaquete] = useState<PaqueteInventario | null>(null)
  const [lineas, setLineas] = useState<PaqueteLinea[]>([])
  const [barcode, setBarcode] = useState<string | null>(null)
  const [lookup, setLookup] = useState<InventarioLookup | null>(null)
  const [camara, setCamara] = useState(false)
  const [busy, setBusy] = useState(false)
  const [iniciando, setIniciando] = useState(false)

  const paqueteIdParam = searchParams.get('paqueteId')

  useEffect(() => {
    adminService.getEmpresas()
      .then((res) => setEmpresas(listaEmpresasDesdeRespuesta(res.data)))
      .catch(() => { /* listado opcional */ })
  }, [])

  const refrescar = useCallback(async (id: Id) => {
    const { data } = await inventarioPaqueteService.obtener(id)
    setPaquete(data)
    setLineas(data.lineas ?? [])
  }, [])

  useEffect(() => {
    if (!paqueteIdParam) return
    const id = Number(paqueteIdParam)
    if (!Number.isFinite(id)) return
    void refrescar(id).catch(() => {
      toast({ message: 'No se pudo cargar el paquete', type: 'error' })
    })
  }, [paqueteIdParam, refrescar, toast])

  useEffect(() => {
    return bindWakeLockCaptura(paquete?.estado === 'ABIERTO')
  }, [paquete?.estado])

  async function iniciarPaquete() {
    if (!empresaId && !nombreTemporal.trim()) {
      toast({ message: 'Indicá una empresa o un nombre temporal', type: 'error' })
      return
    }
    setIniciando(true)
    try {
      const { data } = await inventarioPaqueteService.crear({
        empresaId: empresaId || null,
        nombreNegocioTemporal: empresaId ? null : nombreTemporal.trim(),
      })
      setPaquete(data)
      setLineas([])
      toast({ message: `Paquete ${data.codigo} abierto`, type: 'success' })
    } catch (e: unknown) {
      toast({ message: mensajeErrorApi(e, 'No se pudo crear el paquete'), type: 'error' })
    } finally {
      setIniciando(false)
    }
  }

  async function onScan(codigo: string) {
    if (!paquete || busy) return
    setCamara(false)
    setBusy(true)
    try {
      if (!isOnline) {
        setBarcode(codigo)
        setLookup({ match: 'NUEVO', barcode: codigo })
        return
      }
      const { data } = await inventarioPaqueteService.lookup(codigo, paquete.id)
      setLookup(data)
      setBarcode(codigo)
      if (data.match === 'EN_PAQUETE') {
        toast({ message: 'Ya está en el paquete — podés sumar stock', type: 'info' })
      }
    } catch {
      setBarcode(codigo)
      setLookup({ match: 'NUEVO', barcode: codigo })
    } finally {
      setBusy(false)
    }
  }

  async function onSubmitLinea(linea: LineaRequest, foto?: File | null) {
    if (!paquete || !barcode) return
    setBusy(true)
    try {
      if (!isOnline) {
        const blob = foto ? await comprimirImagenCaptura(foto) : null
        await encolarCaptura({
          tipo: 'CAPTURA_LINEA',
          paqueteId: paquete.id,
          payload: linea,
          fotoBlob: blob,
        })
        await recargarConteo()
        toast({ message: 'Sin conexión: línea en cola offline', type: 'success' })
        setBarcode(null)
        setLookup(null)
        return
      }

      let imagenUrl = linea.imagenUrl
      if (foto) {
        const compressed = await comprimirImagenCaptura(foto)
        const file = new File([compressed], 'captura.jpg', { type: 'image/jpeg' })
        const { data } = await inventarioPaqueteService.subirImagen(file)
        imagenUrl = data.url
      }

      await inventarioPaqueteService.agregarLinea(paquete.id, { ...linea, imagenUrl })
      toast({ message: 'Producto agregado', type: 'success' })
      setBarcode(null)
      setLookup(null)
      await refrescar(paquete.id)
    } catch (e: unknown) {
      toast({ message: mensajeErrorApi(e, 'Error al guardar línea'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function cerrarPaquete() {
    if (!paquete) return
    setBusy(true)
    try {
      await inventarioPaqueteService.cerrar(paquete.id)
      toast({ message: 'Paquete cerrado', type: 'success' })
      await refrescar(paquete.id)
    } catch (e: unknown) {
      toast({ message: mensajeErrorApi(e, 'No se pudo cerrar'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function borrarLinea(lineaId: Id) {
    if (!paquete || paquete.estado !== 'ABIERTO') return
    setBusy(true)
    try {
      await inventarioPaqueteService.eliminarLinea(paquete.id, lineaId)
      toast({ message: 'Línea eliminada', type: 'success' })
      await refrescar(paquete.id)
    } catch (e: unknown) {
      toast({ message: mensajeErrorApi(e, 'No se pudo eliminar'), type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={[
        'mx-auto space-y-4',
        modoCaptura ? 'p-3 max-w-lg' : 'p-6 max-w-2xl',
        pwaStandalone ? 'hc-captura-standalone' : '',
      ].filter(Boolean).join(' ')}
    >
      <CapturaPwaInstallBanner />

      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black" style={{ color: 'var(--hc-text)' }}>Captura de inventario</h1>
          {modoCaptura ? (
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              {TIP_PISTOLA_BLUETOOTH}
            </p>
          ) : (
            <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
              Pistola Bluetooth o cámara · {isOnline ? 'en línea' : 'offline'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!modoCaptura && (
            <Link to="/admin/inventario/paquetes" className="text-sm font-semibold"
              style={{ color: 'var(--hc-accent)' }}>
              Ver paquetes
            </Link>
          )}
          <Link to="/admin/offline/cola"
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              color: pendientesCaptura > 0 ? '#fff' : 'var(--hc-accent)',
              backgroundColor: pendientesCaptura > 0 ? 'var(--hc-accent)' : 'transparent',
              border: pendientesCaptura > 0 ? 'none' : '1px solid var(--hc-border)',
            }}>
            Cola: {pendientesCaptura}
          </Link>
        </div>
      </div>

      {!paquete ? (
        <div className="rounded-2xl p-4 space-y-3"
          style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
          <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Empresa (si ya existe)</label>
          <select value={String(empresaId)} onChange={(e) => setEmpresaId(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
            <option value="">— Sin empresa / negocio nuevo —</option>
            {empresas.map((e) => (
              <option key={String(e.id)} value={String(e.id)}>
                {e.nombreEmpresa ?? `Empresa ${e.id}`}
              </option>
            ))}
          </select>
          {!empresaId && (
            <>
              <label className="block text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>Nombre temporal del negocio</label>
              <input value={nombreTemporal} onChange={(e) => setNombreTemporal(e.target.value)}
                placeholder="Ej: Pulpería San José"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
            </>
          )}
          <button type="button" onClick={iniciarPaquete} disabled={iniciando}
            className="w-full rounded-xl py-3 text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--hc-accent)' }}>
            {iniciando ? 'Abriendo…' : 'Iniciar paquete'}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-2xl p-3 flex items-center justify-between"
            style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
            <div>
              <p className="font-mono text-sm font-bold" style={{ color: 'var(--hc-text)' }}>{paquete.codigo}</p>
              <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
                {paquete.empresaNombre ?? paquete.nombreNegocioTemporal ?? 'Sin negocio'} · {paquete.estado} · {lineas.length} ítems
              </p>
            </div>
            {paquete.estado === 'ABIERTO' && (
              <button type="button" onClick={cerrarPaquete} disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                Cerrar
              </button>
            )}
          </div>

          {paquete.estado === 'ABIERTO' && !barcode && (
            <div className="space-y-2">
              <BarcodeHidInput onScan={onScan} disabled={busy} />
              <button type="button" onClick={() => setCamara(true)}
                className="w-full rounded-xl py-2.5 text-sm font-semibold"
                style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}>
                Usar cámara
              </button>
            </div>
          )}

          {barcode && (
            <CapturaProductoForm
              barcode={barcode}
              lookup={lookup}
              busy={busy}
              onCancel={() => { setBarcode(null); setLookup(null) }}
              onSubmit={onSubmitLinea}
            />
          )}

          {lineas.length > 0 && (
            <ul className="space-y-2">
              {lineas.map((l) => (
                <li key={String(l.id)} className="rounded-xl px-3 py-2 text-sm flex justify-between items-center gap-2"
                  style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
                  <span style={{ color: 'var(--hc-text)' }}>{l.nombre}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-xs" style={{ color: 'var(--hc-muted)' }}>
                      ×{l.stock} {l.barcode ? `· ${l.barcode}` : ''}
                    </span>
                    {paquete.estado === 'ABIERTO' && (
                      <button type="button" onClick={() => void borrarLinea(l.id)} disabled={busy}
                        className="text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ border: '1px solid var(--hc-border)', color: '#f87171' }}>
                        Borrar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {camara && (
        <BarcodeCameraScan
          onScan={onScan}
          onClose={() => setCamara(false)}
        />
      )}
    </div>
  )
}
