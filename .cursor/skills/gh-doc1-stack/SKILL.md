---
name: gh-doc1-stack
description: Deja que DOC1 regenere GENERATED_STACK.md en su PR semanal. Usar cuando el workflow de stack docs falle o abra ese PR.
disable-model-invocation: true
---

# Regenerar GENERATED_STACK.md

Workflow: `.github/workflows/docs-stack.yml`
Check: `Regenerar GENERATED_STACK.md`

## Cuándo corre

Los lunes. Regenera docs/GENERATED_STACK.md. Puede abrir un PR si el fingerprint cambió. Parches de README solo con --apply-safe-docs.

## Qué hacer para que no salga en rojo

1. No edites GENERATED_STACK.md a mano: el script lo pisa.
2. Si el PR semanal solo actualiza versiones detectadas, se revisa el diff. No mezcles una feature ahí.
3. Local: scripts/generate-stack-docs.sh. El flag --apply-safe-docs es el único que toca README o ESTADO_ACTUAL.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
