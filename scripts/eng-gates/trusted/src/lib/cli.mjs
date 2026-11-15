// Arranque seguro de los bins (fail-closed). Sustituye a `import.meta.url === \`file://${process.argv[1]}\``,
// que con rutas con espacios/codificadas (%, #, ñ) o por symlink era falso y salía 0 sin ejecutar nada.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// true solo si el fichero en ejecución (argv[1], tras resolver symlinks) es el módulo que llama.
export function isMain(importMetaUrl, argv1 = process.argv[1]) {
  try { return !!argv1 && realpathSync(argv1) === realpathSync(fileURLToPath(importMetaUrl)); } catch { return false; }
}

// fn() devuelve el código de salida: SOLO el entero 0 explícito es éxito; undefined/otro => != 0.
// exitCode=1 se fija ANTES de ejecutar (si algo mata el proceso a medias nunca queda 0);
// cualquier excepción => mensaje a stderr y exit 2.
export async function runMain(fn) {
  process.exitCode = 1;
  try {
    const rc = await fn();
    process.exitCode = rc === 0 ? 0 : (Number.isInteger(rc) && rc > 0 && rc < 256 ? rc : 1);
  } catch (e) {
    try { process.stderr.write(`error: ${e?.stack ?? e}\n`); } catch { /* sin stderr: igualmente != 0 */ }
    process.exitCode = 2;
  }
}
