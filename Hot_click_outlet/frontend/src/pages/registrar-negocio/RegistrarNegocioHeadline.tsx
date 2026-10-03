import { AltaTitulo } from '@/pages/registro-empresa/AltaVendedorUI'

/** Titular del registro de negocio: un solo h1 Sora con acento rojo (propuesta de Diseño, variante comprador). */
export default function RegistrarNegocioHeadline({ userName }: { userName: string | null }) {
  const saludo = userName ? `Hola, ${userName.split(' ')[0]}. Empezá a` : 'Empezá a'
  return (
    <div className="mb-5">
      <AltaTitulo antes={saludo} acento="vender" sub="Completá los datos de tu negocio para entrar a tu panel de vendedor. Vas a vender con tu misma cuenta." />
    </div>
  )
}
