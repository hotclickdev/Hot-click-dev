import { useQuitarJsonLdServidor } from '@/utils/quitarJsonLdServidor'

/** Se monta junto al JSON-LD del cliente: quita el que el servidor puso en el HTML inicial. */
export default function QuitarJsonLdServidor() {
  useQuitarJsonLdServidor()
  return null
}
