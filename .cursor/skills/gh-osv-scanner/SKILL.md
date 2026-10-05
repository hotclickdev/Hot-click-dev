---
name: gh-osv-scanner
description: Mantiene pom.xml y pnpm-lock.yaml sin CVE HIGH o CRITICAL para que osv-scanner no falle. Usar al actualizar dependencias o cuando el check de vulnerabilidades salga en rojo.
disable-model-invocation: true
---

# osv-scanner (HIGH/CRITICAL)

Workflow: `.github/workflows/deps-vuln.yml`
Check: `osv-scanner (HIGH/CRITICAL)`

## Cuándo corre

Push, pull request a master y disparo manual. Lee el lockfile real y el pom. HIGH y CRITICAL fallan el check. Medium y low solo se informan.

## Qué hacer para que no salga en rojo

1. Subí la dependencia vulnerable a una versión corregida y actualizá el lockfile. No borres el lock para "pasar".
2. Un falso positivo va a scripts/eng-gates/osv-deps-allowlist.json con id, reason y acceptedAt. Preferí expiresOn.
3. El procedimiento está en docs/security/dependency-scanning.md.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
