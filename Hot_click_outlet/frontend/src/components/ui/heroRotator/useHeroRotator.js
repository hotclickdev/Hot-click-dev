import { useState, useEffect, useRef } from 'react'
import { PHASES } from './heroRotatorData'
import useChatStore from '@/store/chatStore'

/**
 * Estado y handlers del hero rotator.
 * El chat abre el drawer; el hero sigue rotando destacados y emprendimientos.
 */
export function useHeroRotator() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [convenios, setConvenios] = useState([])
  const progressRef = useRef(null)
  const pausedRef   = useRef(false)

  const phase = PHASES[phaseIdx]

  function pauseTimer()  { pausedRef.current = true }
  function resumeTimer() { pausedRef.current = false }

  function handleChatSubmit(text) {
    useChatStore.getState().open(text)
  }

  useEffect(() => {
    import('@/services/api').then(({ default: api }) => {
      api.get('/convenios/publicos')
        .then((r) => setConvenios(r.data?.data ?? []))
        .catch((err) => { console.error('[useHeroRotator] convenios', err) })
    })
  }, [])

  useEffect(() => {
    setProgress(0)
    pausedRef.current = false
    clearInterval(progressRef.current)

    const step = 80
    const increment = (step / phase.duration) * 100

    const advancePhase = () => {
      clearInterval(progressRef.current)
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

    return () => clearInterval(progressRef.current)
  }, [phaseIdx, phase.duration])

  function goTo(i) {
    clearInterval(progressRef.current)
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
