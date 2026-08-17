/**
 * @param {(updater: (prev: object) => object) => void} setForm
 * @param {string} campo
 */
export function setCampo(setForm, campo) {
  return (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }))
}

/**
 * @param {(updater: (prev: object) => object) => void} setForm
 * @param {string} campo
 * @param {*} valor
 */
export function setField(setForm, campo, valor) {
  setForm((prev) => ({ ...prev, [campo]: valor }))
}
