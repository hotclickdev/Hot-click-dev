#!/usr/bin/env bash
# Aviso de fallo por Telegram (mismos secretos que ci.yml). Sin secretos: avisa en el log y no rompe.
set -euo pipefail
texto="${1:?texto}"
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "::warning::TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados: sin aviso por Telegram"
  exit 0
fi
curl -fsS -m 20 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode chat_id="$TELEGRAM_CHAT_ID" --data-urlencode text="$texto" >/dev/null
