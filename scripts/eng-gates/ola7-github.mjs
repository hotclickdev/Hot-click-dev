/**
 * Issues / Telegram de ola 7. Soft-fail si no hay gh + token.
 * Reusa ola2-github y ola3-github (master). No depende de #60.
 */

export { upsertIssue, ensureLabels } from './ola2-github.mjs';
export { sendTelegram, hasGhContext } from './ola3-github.mjs';
