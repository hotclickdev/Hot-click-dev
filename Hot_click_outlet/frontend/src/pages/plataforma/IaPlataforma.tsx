import { useEffect, useState } from 'react'
import { securityService } from '@/services/securityService'
import { flagService } from '@/services/flagService'
import { campoLista, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, Carga, TARJETA } from './piezas'

export default function IaPlataforma() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [costo, setCosto] = useState<number | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)
  useEffect(() => {
    const hoy = new Date()
    securityService.getAiDashboard(hoy.getFullYear(), hoy.getMonth() + 1)
      .then((r) => {
        const data = r.data as { costoTotal?: unknown }
        setCosto(typeof data?.costoTotal === 'number' ? data.costoTotal : null)
        setFilas(campoLista(r.data, 'empresas'))
        setEstado('listo')
      })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo cargar el uso de IA.</Aviso>

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">IA</h1>
      <p className="text-sm text-hc-n-600">
        Costo estimado del mes: {costo == null ? '—' : `USD ${costo.toFixed(2)}`}. Es una estimación, no una factura.
      </p>
      {filas.length === 0 && <Aviso>No hay uso registrado este mes.</Aviso>}
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        const activo = fila.chatActivo === true
        return (
          <article key={id} className={TARJETA}>
            <p className="font-display text-[17px] font-bold">{texto(fila.nombre, 'Negocio')}</p>
            <p className="mt-1 text-xs text-hc-n-600">
              {texto(fila.llamadas, '0')} llamadas · tope {texto(fila.limite, '—')} · {texto(fila.plan, '')}
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-hc-blue-600"
              onClick={() => void alternar(id, activo, () => setMarca((n) => n + 1))}
            >
              {activo ? 'Apagar chat público' : 'Encender chat público'}
            </button>
          </article>
        )
      })}
    </div>
  )
}

async function alternar(id: string, activo: boolean, listo: () => void) {
  if (activo && !globalThis.confirm('¿Apagar el chat público de este negocio?')) return
  try {
    await flagService.set(id, 'chat_publico', !activo)
    listo()
  } catch (err) {
    console.error(err)
  }
}
