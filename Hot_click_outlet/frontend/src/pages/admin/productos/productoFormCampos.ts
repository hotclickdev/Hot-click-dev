import type { ChangeEvent, Dispatch, SetStateAction } from 'react'
import type { AdminProductoForm } from './productosHelpers'

export function setCampo(setForm: Dispatch<SetStateAction<AdminProductoForm>>, campo: keyof AdminProductoForm) {
  return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [campo]: e.target.value } as AdminProductoForm))
}

export function setField<K extends keyof AdminProductoForm>(
  setForm: Dispatch<SetStateAction<AdminProductoForm>>,
  campo: K,
  valor: AdminProductoForm[K],
) {
  setForm((prev) => ({ ...prev, [campo]: valor }))
}
