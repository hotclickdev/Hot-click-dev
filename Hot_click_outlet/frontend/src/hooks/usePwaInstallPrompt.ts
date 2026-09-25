import { useCallback, useEffect, useRef, useState } from 'react'

/** Evento beforeinstallprompt (Chromium). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/**
 * Escucha beforeinstallprompt y expone instalación nativa cuando el navegador lo permite.
 * Nunca lanza: fallos de API quedan silenciados.
 */
export function usePwaInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      try {
        e.preventDefault()
        deferredRef.current = e as BeforeInstallPromptEvent
        setCanInstall(true)
      } catch {
        /* noop */
      }
    }

    try {
      window.addEventListener('beforeinstallprompt', onBeforeInstall)
    } catch {
      /* noop */
    }

    return () => {
      try {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      } catch {
        /* noop */
      }
    }
  }, [])

  const instalar = useCallback(async () => {
    try {
      const prompt = deferredRef.current
      if (!prompt) return
      await prompt.prompt()
      await prompt.userChoice
      deferredRef.current = null
      setCanInstall(false)
    } catch {
      /* noop */
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      deferredRef.current = null
      setCanInstall(false)
    } catch {
      /* noop */
    }
  }, [])

  return { canInstall, instalar, dismiss }
}
