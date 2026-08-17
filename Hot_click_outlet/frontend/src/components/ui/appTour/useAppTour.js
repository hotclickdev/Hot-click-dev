import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { TOUR_KEY, STEPS, TOTAL } from './appTourSteps'
import { TOUR_CSS } from './appTourStyles'

/**
 * Estado y handlers del tour admin — bit-idéntico al original.
 */
export function useAppTour() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      const t = setTimeout(() => setShow(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

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
    const handler = () => { setStep(0); setShow(true) }
    globalThis.addEventListener('hc-open-tour', handler)
    return () => globalThis.removeEventListener('hc-open-tour', handler)
  }, [setShow])

  const dismiss = useCallback(() => {
    localStorage.setItem(TOUR_KEY, '1')
    setShow(false)
  }, [setShow])

  const go = useCallback((next) => {
    if (next < 0 || next >= TOTAL) { dismiss(); return }
    const s = STEPS[next]
    if (s.path) navigate(s.path)
    setStep(next)
  }, [navigate, dismiss])

  const current = STEPS[step]
  const isSpecial = current.type === 'welcome' || current.type === 'done'
  const isFirst   = step === 0
  const isLast    = step === TOTAL - 1

  return { show, step, current, isSpecial, isFirst, isLast, dismiss, go }
}
