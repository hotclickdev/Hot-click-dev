// Entorno node de vitest: localStorage en memoria para que zustand persist funcione.
// Se importa ANTES del store en los tests que lo necesitan.
const m = new Map<string, string>()
const ls: Storage = {
  getItem: (k) => m.get(k) ?? null,
  setItem: (k, v) => { m.set(k, String(v)) },
  removeItem: (k) => { m.delete(k) },
  clear: () => m.clear(),
  key: (i) => [...m.keys()][i] ?? null,
  get length() { return m.size },
}
Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true, writable: true })
// zustand persist usa window.localStorage
if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true, writable: true })
}
export {}
