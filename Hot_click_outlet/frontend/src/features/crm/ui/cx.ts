// Tremor cx [v0.0.0] — Apache-2.0 (tremorlabs/tremor). Igual al `cn` de shadcn/ui (MIT).
import clsx, { type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cx(...args: ClassValue[]) {
  return twMerge(clsx(...args))
}
