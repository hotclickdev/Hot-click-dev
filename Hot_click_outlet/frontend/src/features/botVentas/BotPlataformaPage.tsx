import BotPage from './BotPage'
import { PESTANAS_PLATAFORMA } from './botHelpers'

/** Panel del bot de HotClick en la consola de plataforma (`/plataforma/bot`): solo las pestañas que no exigen un negocio. */
export default function BotPlataformaPage() {
  return <BotPage pestanas={PESTANAS_PLATAFORMA} />
}
