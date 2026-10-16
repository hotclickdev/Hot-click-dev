#!/usr/bin/env bash
# Tests de API contra el staging efímero (localhost). Requiere: curl, jq, openssl, STAGING_JWT_SECRET.
set -uo pipefail
BASE="${BASE_URL:-http://localhost:8080}"
FAIL=0

b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
# JWT HS256 de prueba (Backend confirmado): el filtro staging lee Authorization: Bearer y los claims email y role.
jwt() {
  local email="$1" role="$2" now; now=$(date +%s)
  local h p s
  h=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  p=$(printf '{"sub":"%s","email":"%s","role":"%s","iat":%d,"exp":%d}' "$email" "$email" "$role" "$now" $((now+900)) | b64url)
  s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$STAGING_JWT_SECRET" -binary | b64url)
  printf '%s.%s.%s' "$h" "$p" "$s"
}
ADMIN=$(jwt admin@staging.test ADMIN)
VENDEDOR=$(jwt vendedor@staging.test EMPRENDEDOR)
COMPRADOR=$(jwt comprador@staging.test CLIENTE)

# check NOMBRE ESPERADO METODO RUTA [TOKEN] [BODY]
check() {
  local name="$1" want="$2" method="$3" path="$4" tok="${5:-}" body="${6:-}"
  local args=(-s -o /tmp/resp.json -w '%{http_code}' -X "$method" "$BASE$path" -H 'Content-Type: application/json')
  [ -n "$tok" ] && args+=(-H "Authorization: Bearer $tok")
  [ -n "$body" ] && args+=(-d "$body")
  local got; got=$(curl "${args[@]}")
  if [[ "$got" =~ ^($want)$ ]]; then echo "OK   $name ($got)"; else echo "FAIL $name: esperado $want, obtuvo $got"; head -c 400 /tmp/resp.json; echo; FAIL=1; fi
}

echo "== Destacar producto =="
check "destacar sin permiso (vendedor) → 403"   403 PATCH /api/productos/9201/destacado "$VENDEDOR"  '{"destacado":true}'
check "destacar sin permiso (comprador) → 403"  403 PATCH /api/productos/9201/destacado "$COMPRADOR" '{"destacado":true}'
check "destacar sin token → 401/403"        '401|403' PATCH /api/productos/9201/destacado ""          '{"destacado":true}'
check "control: destacar como admin → 200"      200 PATCH /api/productos/9201/destacado "$ADMIN"     '{"destacado":true}'

echo "== Contra entrega =="
# Backend: envío normal = metodoEnvio que empieza con ENVIO_NORMAL (ContraEntregaPolitica). provider CONTRA_ENTREGA es el valor
# que ya usa PedidoPagoManualService, PERO /api/payments/checkout todavía no valida contra entrega vs metodoEnvio → este caso hoy NO da 400 (pendiente).
check "contra entrega con envío no normal → 400" 400 POST /api/payments/checkout "$COMPRADOR" \
  '{"provider":"CONTRA_ENTREGA","bodegaId":9301,"metodoEnvio":"EXPRESS","direccionEntrega":"Dirección ficticia, San José","items":[{"productoId":9201,"cantidad":1}]}'

echo "== Tienda pausada =="
# Backend: ruta confirmada GET /api/tienda/{slug} (StorefrontController). La pausa implementada (feat/pausa-cobros-tienda,
# columna cobros_pausados) solo bloquea el pago en línea con 400; no oculta la tienda ni la saca de destacados (pendiente S3-35).
check "tienda pausada no se expone → 404/410/403" '404|410|403' GET /api/tienda/tienda-pausada
check "control: tienda activa → 200"              200           GET /api/tienda/tienda-activa
check "compra en tienda pausada → 4xx"     '400|403|404|409|422' POST /api/payments/checkout "$COMPRADOR" \
  '{"provider":"CONTRA_ENTREGA","metodoEnvio":"ENVIO_NORMAL","direccionEntrega":"Dirección ficticia, San José","items":[{"productoId":9202,"cantidad":1}]}'
if curl -fs "$BASE/api/productos/destacados" | jq -e '[.. | objects | select(.id? == 9202)] | length > 0' >/dev/null 2>&1; then
  echo "FAIL producto de tienda pausada aparece en destacados"; FAIL=1
else echo "OK   producto de tienda pausada no sale en destacados"; fi

exit $FAIL
