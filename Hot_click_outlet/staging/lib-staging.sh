#!/usr/bin/env bash
# Validaciones compartidas de staging. No hace `source` del .env (no ejecuta su contenido).

leer_var() { # archivo nombre
  local v
  v="$(grep -E "^$2=" "$1" | tail -n1 | cut -d= -f2- || true)"
  v="${v%\"}"; v="${v#\"}"; v="${v%\'}"; v="${v#\'}"
  printf '%s' "$v"
}

validar_env_staging() { # archivo
  local f="$1" perfil onvo_on k
  [ -r "$f" ] || { echo "staging: no encuentro $f" >&2; return 10; }
  [ "$(leer_var "$f" HOTCLICK_ENV)" = "staging" ] || { echo "staging: HOTCLICK_ENV debe ser staging" >&2; return 11; }
  perfil="$(leer_var "$f" SPRING_PROFILES_ACTIVE)"
  case ",$perfil," in
    ,,) echo "staging: falta SPRING_PROFILES_ACTIVE" >&2; return 12 ;;
    *,dev,*|*,test,*) echo "staging: SPRING_PROFILES_ACTIVE no puede ser dev ni test" >&2; return 12 ;;
  esac
  if grep -qiE "onvo_live_|sk_live_|pk_live_" "$f"; then
    echo "staging: ABORTA: hay una llave LIVE en $f; staging solo usa llaves de prueba" >&2; return 13
  fi
  onvo_on="$(leer_var "$f" PAYMENTS_ONVO_ENABLED)"
  for k in ONVO_SECRET_KEY ONVO_PUBLISHABLE_KEY; do
    local val; val="$(leer_var "$f" "$k")"
    if [ -n "$val" ] && [[ "$val" != onvo_test_* ]]; then
      echo "staging: ABORTA: $k no es una llave de prueba (onvo_test_)" >&2; return 13
    fi
    if [ "$onvo_on" = "true" ] && [ -z "$val" ]; then
      echo "staging: PAYMENTS_ONVO_ENABLED=true exige $k de prueba" >&2; return 13
    fi
  done
  return 0
}
