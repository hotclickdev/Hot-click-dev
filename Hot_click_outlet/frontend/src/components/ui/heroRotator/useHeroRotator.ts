import { useState, useEffect, useRef } from 'react'
import { PHASES, type Convenio } from './heroRotatorData'
import { esConvenio } from './heroRotatorHelpers'
import { convenioService, listaConvenios } from '@/services/convenioService'
import useChatStore from '@/store/chatStore'

/**
 * Estado y handlers del hero rotator.
 * El chat abre el drawer; el hero sigue rotando destacados y emprendimientos.
 */
export function useHeroRotator() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef   = useRef(false)

  const phase = PHASES[phaseIdx]

  function pauseTimer()  { pausedRef.current = true }
  function resumeTimer() { pausedRef.current = false }

  function handleChatSubmit(text: string) {
    useChatStore.getState().open(text)
  }

  useEffect(() => {
    convenioService.getPublicos()
      .then((r) => setConvenios(listaConvenios(r).filter(esConvenio)))
      .catch((err: unknown) => { console.error('[useHeroRotator] convenios', err) })
  }, [])

  useEffect(() => {
    setProgress(0)
    pausedRef.current = false
    if (progressRef.current != null) clearInterval(progressRef.current)

    const step = 80
    const increment = (step / phase.duration) * 100

    const advancePhase = () => {
      if (progressRef.current != null) clearInterval(progressRef.current)
      setTimeout(() => setPhaseIdx((i) => (i + 1) % PHASES.length), 0)
    }

    progressRef.current = setInterval(() => {
      if (pausedRef.current) return
      setProgress((p) => {
        const next = p + increment
        if (next >= 100) { advancePhase(); return 100 }
        return next
      })
    }, step)

    return () => {
      if (progressRef.current != null) clearInterval(progressRef.current)
    }
  }, [phaseIdx, phase.duration])

  function goTo(i: number) {
    if (progressRef.current != null) clearInterval(progressRef.current)
    setPhaseIdx(i)
  }

  return {
    phase,
    phaseIdx,
    progress,
    convenios,
    pauseTimer,
    resumeTimer,
    handleChatSubmit,
    goTo,
  }
}
