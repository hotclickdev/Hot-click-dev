type WakeLockHandle = WakeLockSentinel | null

function wakeLockDisponible(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
    && typeof navigator.wakeLock?.request === 'function'
}

async function solicitarWakeLock(
  handle: { current: WakeLockHandle },
  generation: { current: number },
  expectedGen: number,
): Promise<void> {
  if (!wakeLockDisponible() || handle.current) return
  try {
    const lock = await navigator.wakeLock!.request('screen')
    if (generation.current !== expectedGen) {
      try { await lock.release() } catch { /* noop */ }
      return
    }
    handle.current = lock
    lock.addEventListener('release', () => {
      if (handle.current === lock) handle.current = null
    })
  } catch {
    if (generation.current === expectedGen) handle.current = null
  }
}

async function liberarWakeLock(handle: { current: WakeLockHandle }): Promise<void> {
  const lock = handle.current
  handle.current = null
  if (!lock) return
  try {
    await lock.release()
  } catch {
    /* ya liberado */
  }
}

/** Mantiene la pantalla encendida mientras `active` y la pestaña visible. Retorna cleanup. */
export function bindWakeLockCaptura(active: boolean): () => void {
  if (!wakeLockDisponible()) return () => {}

  const handle = { current: null as WakeLockHandle }
  const generation = { current: 0 }

  const sync = () => {
    if (active && document.visibilityState === 'visible') {
      const gen = ++generation.current
      void solicitarWakeLock(handle, generation, gen)
    } else {
      generation.current++
      void liberarWakeLock(handle)
    }
  }

  sync()
  document.addEventListener('visibilitychange', sync)

  return () => {
    generation.current++
    document.removeEventListener('visibilitychange', sync)
    void liberarWakeLock(handle)
  }
}
