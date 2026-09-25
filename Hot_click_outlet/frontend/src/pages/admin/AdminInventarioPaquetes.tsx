import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { inventarioPaqueteService, type PaqueteInventario } from '@/services/inventarioPaqueteService'
import { useToast } from '@/components/ui/Toast'

const ESTADOS_FILTRO = ['TODOS', 'ABIERTO', 'CERRADO', 'ASIGNADO'] as const

/** Lista de paquetes de digitalización (tablet ADMIN). */
export default function AdminInventarioPaquetes() {
  const toast = useToast()
  const [paquetes, setPaquetes] = useState<PaqueteInventario[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS')
  const [filtroCodigo, setFiltroCodigo] = useState('')

  const paquetesFiltrados = useMemo(() => {
    const codigo = filtroCodigo.trim().toLowerCase()
    return paquetes.filter((p) => {
      if (filtroEstado !== 'TODOS' && p.estado !== filtroEstado) return false
      if (codigo && !p.codigo.toLowerCase().includes(codigo)) return false
      return true
    })
  }, [paquetes, filtroEstado, filtroCodigo])

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await inventarioPaqueteService.listar()
      setPaquetes(Array.isArray(data) ? data : [])
    } catch {
      toast({ message: 'No se pudieron cargar los paquetes', type: 'error' })
    } finally {
      setCargando(false)
    }
  }, [toast])

  useEffect(() => { void cargar() }, [cargar])

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hc-text)' }}>Paquetes de inventario</h1>
          <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>
            Asigná negocio, exportá Excel o resolvé conflictos
          </p>
        </div>
        <Link to="/admin/inventario/captura?modo=captura"
          className="rounded-xl px-4 py-2 text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--hc-accent)' }}>
          Nueva captura
        </Link>
      </div>

      {!cargando && paquetes.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>
            Estado
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="mt-1 block rounded-xl px-3 py-2 text-sm"
              style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}>
              {ESTADOS_FILTRO.map((e) => (
                <option key={e} value={e}>{e === 'TODOS' ? 'Todos' : e.charAt(0) + e.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold flex-1 min-w-[12rem]" style={{ color: 'var(--hc-muted)' }}>
            Código
            <input
              type="search"
              value={filtroCodigo}
              onChange={(e) => setFiltroCodigo(e.target.value)}
              placeholder="Buscar por código…"
              className="mt-1 block w-full rounded-xl px-3 py-2 text-sm font-mono"
              style={{ border: '1px solid var(--hc-border)', backgroundColor: 'var(--hc-surface)', color: 'var(--hc-text)' }}
            />
          </label>
        </div>
      )}

      {cargando ? (
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</p>
      ) : paquetes.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>No hay paquetes todavía.</p>
      ) : paquetesFiltrados.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--hc-muted)' }}>Ningún paquete coincide con el filtro.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl"
          style={{ border: '1px solid var(--hc-border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--hc-surface)', color: 'var(--hc-muted)' }}>
                <th className="text-left p-3 font-semibold">Código</th>
                <th className="text-left p-3 font-semibold">Negocio</th>
                <th className="text-left p-3 font-semibold">Estado</th>
                <th className="text-right p-3 font-semibold">Ítems</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {paquetesFiltrados.map((p) => (
                <tr key={String(p.id)} style={{ borderTop: '1px solid var(--hc-border)' }}>
                  <td className="p-3 font-mono font-bold" style={{ color: 'var(--hc-text)' }}>{p.codigo}</td>
                  <td className="p-3" style={{ color: 'var(--hc-text)' }}>
                    {p.empresaNombre ?? p.nombreNegocioTemporal ?? '—'}
                  </td>
                  <td className="p-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: 'rgba(23,71,168,0.12)', color: 'var(--hc-accent)' }}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono" style={{ color: 'var(--hc-muted)' }}>{p.totalLineas}</td>
                  <td className="p-3 text-right space-x-3">
                    {p.estado === 'ABIERTO' && (
                      <Link
                        to={`/admin/inventario/captura?modo=captura&paqueteId=${p.id}`}
                        className="text-sm font-semibold"
                        style={{ color: 'var(--hc-accent)' }}
                      >
                        Continuar
                      </Link>
                    )}
                    <Link to={`/admin/inventario/paquetes/${p.id}`}
                      className="text-sm font-semibold" style={{ color: 'var(--hc-accent)' }}>
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
