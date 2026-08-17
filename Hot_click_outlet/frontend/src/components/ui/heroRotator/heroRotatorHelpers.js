/** Escala tamaño con viewport: 100% en 1440px → ~35% en 375px */
export function vs(size) {
  const min = Math.round(size * 0.32)
  return `clamp(${min}px, ${(size / 1440 * 100).toFixed(2)}vw, ${size}px)`
}
