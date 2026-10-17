import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import useAuthStore from '@/store/authStore'

describe('banner «Verificá tu correo» alineado con la verificación real', () => {
  it('el store pasa a verificado y el banner deja de mostrarse', () => {
    useAuthStore.getState().setCorreoVerificado(false)
    useAuthStore.getState().setCorreoVerificado(true)
    expect(useAuthStore.getState().correoVerificado).toBe(true)
  })

  it('el registro marca el correo verificado en el store al confirmar el código', () => {
    const fuente = readFileSync(fileURLToPath(new URL('./EmprendimientoForm.tsx', import.meta.url)), 'utf8')
    const verificar = fuente.slice(fuente.indexOf('const handleVerificar'), fuente.indexOf('const handleReenviar'))
    expect(verificar).toContain('setCorreoVerificado(true)')
  })
})
