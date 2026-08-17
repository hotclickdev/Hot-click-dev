import { useState, useEffect, useRef } from 'react'
import { PHASES } from './heroRotatorData'

/**
 * Estado y handlers del hero rotator — bit-idéntico al original.
 */
export function useHeroRotator() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [convenios, setConvenios] = useState([])
  const [chatMode, setChatMode] = useState(false)
  const [chatQuery, setChatQuery] = useState(null)
  const progressRef = useRef(null)
  const pausedRef   = useRef(false)

  const phase = PHASES[phaseIdx]

  function pauseTimer()  { pausedRef.current = true }
  function resumeTimer() { pausedRef.current = false }

  function handleChatSubmit(text) {
    clearInterval(progressRef.current)
    setChatQuery(text)
    setChatMode(true)
  }

  function handleChatClose() {
    setChatMode(false)
    setChatQuery(null)
    setPhaseIdx(0)
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
    chatMode,
    chatQuery,
    pauseTimer,
    resumeTimer,
    handleChatSubmit,
    handleChatClose,
    goTo,
  }
}
