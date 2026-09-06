import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PHASES, PHASE_LABEL_KEYS, type Convenio, type HeroPhase } from './heroRotatorData'
import { esConvenio } from './heroRotatorHelpers'
import { convenioService, listaConvenios } from '@/services/convenioService'
import useChatStore from '@/store/chatStore'

/** Filtra y reordena PHASES según la config del homepage. Vacío o inválido = todas, orden original. */
function fasesActivas(heroSectionIds?: string[]): typeof PHASES {
  if (!heroSectionIds || heroSectionIds.length === 0) return PHASES
  const porId = new Map(PHASES.map((p) => [p.id, p]))
  const filtradas = heroSectionIds
    .map((id) => porId.get(id as HeroPhase['id']))
    .filter((p): p is (typeof PHASES)[number] => p != null)
  return filtradas.length > 0 ? filtradas : PHASES
}

/**
 * Estado y handlers del hero rotator.
 * El chat abre el drawer; el hero sigue rotando destacados y emprendimientos.
 */
export function useHeroRotator(heroSectionIds?: string[]) {
  const { t } = useTranslation()
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [convenios, setConvenios] = useState<Convenio[]>([])
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef   = useRef(false)

  const activePhases = useMemo(() => fasesActivas(heroSectionIds), [heroSectionIds])

  const phases: HeroPhase[] = useMemo(
    () => activePhases.map((p) => ({ ...p, label: t(PHASE_LABEL_KEYS[p.id]) })),
    [activePhases, t],
  )

  const phase = phases[phaseIdx] ?? phases[0]!

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

    const reduceMotion = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      setProgress(100)
      return
    }

    const step = 80
    const increment = (step / phase.duration) * 100

    const advancePhase = () => {
      if (progressRef.current != null) clearInterval(progressRef.current)
      setTimeout(() => setPhaseIdx((i) => (i + 1) % phases.length), 0)
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
  }, [phaseIdx, phase.duration, phases.length])

  function goTo(i: number) {
    if (progressRef.current != null) clearInterval(progressRef.current)
    setPhaseIdx(i)
  }

  return {
    phase,
    phases,
    phaseIdx,
    progress,
    convenios,
    pauseTimer,
    resumeTimer,
    handleChatSubmit,
    goTo,
  }
}
