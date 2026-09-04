import TelegramVinculoPanel from '@/prototipo/compartido/TelegramVinculoPanel'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Vincular Telegram del negocio Emprendedor.
 */
export default function TelegramPage() {
  return (
    <EmprendedorPageFrame
      titulo="Telegram"
      subtitulo="Avisos de este negocio en tu chat"
      volverA={`${RUTA_EMPRENDEDOR}/opciones`}
    >
      <TelegramVinculoPanel />
    </EmprendedorPageFrame>
  )
}
