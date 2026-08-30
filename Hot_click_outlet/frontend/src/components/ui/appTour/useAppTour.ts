import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { TOUR_KEY, pasosTourParaRol } from './appTourSteps'
import { TOUR_CSS } from './appTourStyles'

/**
 * Tour legacy opcional (evento hc-open-legacy-tour).
 * La primera visita la maneja MentalModelCoach.
 */
export function useAppTour() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const navigate = useNavigate()
  const userRole = useAuthStore((s) => s.userRole)
  const steps = useMemo(() => pasosTourParaRol(userRole), [userRole])
  const total = steps.length

  useEffect(() => {
    const el = document.createElement('style')
    el.textContent = TOUR_CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('hc-tour-active', show)
    return () => document.body.classList.remove('hc-tour-active')
  }, [show])

  useEffect(() => {
    const handler = () => {
      if (localStorage.getItem('hc-mm-v1-off') === '1') {
        setStep(0)
        setShow(true)
      }
    }
    globalThis.addEventListener('hc-open-legacy-tour', handler as EventListener)
    return () => globalThis.removeEventListener('hc-open-legacy-tour', handler as EventListener)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1')
    setShow(false)
  }, [])

  const go = useCallback((next: number) => {
    if (next < 0 || next >= total) { dismiss(); return }
    const s = steps[next]
    if (s?.path) navigate(s.path)
    setStep(next)
  }, [navigate, dismiss, steps, total])

  const current = steps[step] ?? steps[0]
  const isSpecial = current?.type === 'welcome' || current?.type === 'done'
  const isFirst = step === 0
  const isLast = step === total - 1

  return { show, step, current, isSpecial, isFirst, isLast, dismiss, go, steps }
}
