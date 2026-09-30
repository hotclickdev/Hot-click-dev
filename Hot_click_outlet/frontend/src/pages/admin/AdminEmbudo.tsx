import { useEffect, useState } from 'react'
import { embudoService, type ResumenEmbudo } from '@/services/embudoService'
import { useToast } from '@/components/ui/Toast'
import EmbudoAccion from './embudo/EmbudoAccion'
import EmbudoBarras from './embudo/EmbudoBarras'

export default function AdminEmbudo() {
  const { showToast } = useToast()
  const [dias, setDias] = useState<7 | 30>(7)
  const [resumen, setResumen] = useState<ResumenEmbudo | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    embudoService.resumen(dias)
      .then((data) => { if (vivo) setResumen(data) })
      .catch((err: unknown) => {
        console.error('[AdminEmbudo]', err)
        showToast('No se pudo cargar el embudo', 'error')
      })
      .finally(() => { if (vivo) setCargando(false) })
    return () => { vivo = false }
  }, [dias])

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-hc-text">Por qué no compran</h1>
          <p className="text-sm text-hc-muted mt-1">
            Quién entró, en qué paso se quedó y qué hacer antes, durante y después.
          </p>
        </div>
        <div className="flex gap-2">
          <Ventana actual={dias} valor={7} onElegir={setDias} />
          <Ventana actual={dias} valor={30} onElegir={setDias} />
        </div>
      </header>

      {cargando && <p className="text-sm text-hc-muted">Cargando…</p>}

      {!cargando && resumen && (
        <>
          <section className="rounded-2xl border border-hc-border bg-hc-surface p-4">
            <EmbudoBarras conteos={resumen} />
          </section>
          <EmbudoAccion resumen={resumen} />
          <p className="text-xs text-hc-muted leading-relaxed">
            Estos números son de quien aceptó cookies de analítica. Quien las rechazó no aparece.
            Los pedidos pagados salen de las ventas, no del navegador.
          </p>
        </>
      )}
    </div>
  )
}

function Ventana({ actual, valor, onElegir }: {
  actual: 7 | 30
  valor: 7 | 30
  onElegir: (dias: 7 | 30) => void
}) {
  const activo = actual === valor
  return (
    <button
      type="button"
      onClick={() => onElegir(valor)}
      className={`h-9 px-3 rounded-xl border text-sm ${activo ? 'border-hc-accent text-hc-text font-semibold' : 'border-hc-border text-hc-muted'}`}
    >
      {valor} días
    </button>
  )
}
