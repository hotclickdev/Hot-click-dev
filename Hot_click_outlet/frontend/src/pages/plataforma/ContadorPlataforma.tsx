import { useEffect, useState } from 'react'
import { contadorService, datos } from '@/services/contadorService'
import { fiscalService, type ReglasFiscales } from '@/services/fiscalService'
import { AVISO_LEGAL } from './contador'
import { ContadorAjustes } from './ContadorAjustes'
import { ContadorBorrador, ContadorEsteMes } from './ContadorEsteMes'
import { ContadorCalculadora, ContadorCalendario, ContadorChat, ContadorHacienda } from './ContadorHerramientas'
import { AvisoLegal } from './ContadorPiezas'
import { Encabezado, Segmento } from './piezas'

const PESTANAS = [
  { id: 'mes', label: 'Este mes' },
  { id: 'borrador', label: 'Borrador' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'calculadora', label: 'Calculadora' },
  { id: 'chat', label: 'Pregúntale al contador' },
  { id: 'hacienda', label: 'Confirmar con Hacienda' },
  { id: 'ajustes', label: 'Ajustes' },
]

type AvisoApp = { id: number; titulo: string; mensaje: string; venceEl: string; leido: boolean }

/** Contador IA (solo ADMIN): ayuda y prepara; nunca presenta, paga ni borra nada. */
export default function ContadorPlataforma() {
  const [pestana, setPestana] = useState('mes')
  const [regimen, setRegimen] = useState('SIMPLIFICADO')
  const [avisos, setAvisos] = useState<AvisoApp[]>([])

  useEffect(() => {
    fiscalService.getReglas()
      .then((r) => {
        const reglas = datos<ReglasFiscales>(r)
        if (reglas?.regimen) setRegimen(reglas.regimen)
      })
      .catch((err: unknown) => console.error(err))
    contadorService.avisos()
      .then((r) => setAvisos((datos<{ avisos: AvisoApp[] }>(r)?.avisos ?? []).filter((a) => !a.leido)))
      .catch((err: unknown) => console.error(err))
  }, [])

  async function leer(id: number) {
    try {
      await contadorService.avisoLeido(id)
      setAvisos((a) => a.filter((x) => x.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Encabezado
        titulo="Contador IA"
        detalle={`Régimen activo: ${regimen === 'TRADICIONAL' ? 'tradicional' : 'Simplificado (RTS)'}. Cifras de los comprobantes aceptados y de los valores que configurás.`}
      />
      <AvisoLegal texto={AVISO_LEGAL} />
      {avisos.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Avisos de vencimiento">
          {avisos.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hc-primary bg-hc-danger-bg px-3 py-2 text-sm">
              <span><b>{a.titulo}</b> · {a.mensaje}</span>
              <button type="button" className="text-xs font-semibold text-hc-primary-text underline" onClick={() => leer(a.id)}>Marcar como leído</button>
            </li>
          ))}
        </ul>
      )}
      <Segmento opciones={PESTANAS} valor={pestana} onChange={setPestana} />
      <div role="tabpanel">
        {pestana === 'mes' && <ContadorEsteMes />}
        {pestana === 'borrador' && <ContadorBorrador regimen={regimen} />}
        {pestana === 'calendario' && <ContadorCalendario />}
        {pestana === 'calculadora' && <ContadorCalculadora />}
        {pestana === 'chat' && <ContadorChat />}
        {pestana === 'hacienda' && <ContadorHacienda />}
        {pestana === 'ajustes' && <ContadorAjustes />}
      </div>
    </div>
  )
}
