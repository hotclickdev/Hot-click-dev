export type VariantePilar = 'primary' | 'ghost' | 'outline'

export type PilarId = 'comprar' | 'vender' | 'emprender'

export type PilarHotClick = {
  id: PilarId
  to: string
  labelKey: string
  hintKey: string
  variant: VariantePilar
}

export const PILARES_HOTCLICK: PilarHotClick[] = [
  {
    id: 'comprar',
    to: '/productos',
    labelKey: 'home.jobsComprar',
    hintKey: 'home.jobsComprarHint',
    variant: 'primary',
  },
  {
    id: 'vender',
    to: '/emprende',
    labelKey: 'home.jobsVender',
    hintKey: 'home.jobsVenderHint',
    variant: 'ghost',
  },
  {
    id: 'emprender',
    to: '/emprende',
    labelKey: 'home.jobsEmprender',
    hintKey: 'home.jobsEmprenderHint',
    variant: 'outline',
  },
]
