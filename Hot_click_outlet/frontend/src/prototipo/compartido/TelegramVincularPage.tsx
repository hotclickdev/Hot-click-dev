import TelegramVinculoPanel from './TelegramVinculoPanel'
import EntradaPagina from './motion/EntradaPagina'
import { EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Vincular Telegram del negocio (mismo API que Configuración → Telegram).
 */
export default function TelegramVincularPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px] md:max-w-[760px] md:px-12 md:py-12 md:pt-12">
      <EntradaPagina>
        <EncabezadoPagina
          titulo="Telegram"
          subtitulo="Avisos de este negocio en tu chat"
          volverA={ruta('opciones')}
        />
        <TelegramVinculoPanel />
      </EntradaPagina>
    </main>
  )
}
