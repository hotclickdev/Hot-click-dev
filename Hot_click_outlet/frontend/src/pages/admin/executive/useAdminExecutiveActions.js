import { useCallback } from 'react'
import { executiveService } from '@/services/executiveService'

/**
 * Handlers AI summary e impresión — bit-idéntico al original.
 * @param {object} deps
 */
export function useAdminExecutiveActions(deps) {
  const {
    data,
    aiText,
    printRef,
    setAiText,
    setAiLoading,
    setGuardado,
    setError,
  } = deps

  const generarAiSummary = useCallback(async () => {
    setAiLoading(true)
    setAiText('')
    setGuardado(false)
    const rawAuth = localStorage.getItem('hotclick-auth')
    const token   = rawAuth ? (JSON.parse(rawAuth)?.state?.token ?? '') : ''

    try {
      const response = await fetch('/api/admin/executive/ai-summary', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = '', assembled = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const parsed = JSON.parse(line.slice(5).trim())
              if (parsed.text) { assembled += parsed.text; setAiText(assembled) }
            } catch { /* malformed SSE chunk — skip */ }
          }
        }
      }
    } catch {
      setError('Error generando resumen AI')
    } finally {
      setAiLoading(false)
    }
  }, [setAiLoading, setAiText, setError, setGuardado])

  const guardarResumen = useCallback(async () => {
    const periodo = data?.periodo?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)
    try {
      await executiveService.guardarResumen({ periodo, resumen: aiText })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch { /* save is best-effort, not critical */ }
  }, [aiText, data, setGuardado])

  const imprimir = useCallback(() => {
    const style = document.createElement('style')
    style.id = '__executive-print-style'
    style.textContent = `
      @media print {
        body > * { display: none !important; }
        #root > * { display: none !important; }
        #root > div > aside,
        #root > div > nav,
        [data-sidebar],
        nav { display: none !important; }
        .executive-print-content { display: block !important; }
      }
    `
    document.head.appendChild(style)
    printRef.current?.classList.add('executive-print-content')
    globalThis.print()
    setTimeout(() => {
      document.getElementById('__executive-print-style')?.remove()
      printRef.current?.classList.remove('executive-print-content')
    }, 1000)
  }, [printRef])

  return {
    generarAiSummary,
    guardarResumen,
    imprimir,
  }
}
