---
name: gh-e11-sensitive
description: Exige un test nominal al tocar pago, auth, POS, SINPE o wallet para que E11 no falle. Usar al modificar esas clases Java.
disable-model-invocation: true
---

# E11 Tests nominales Payment/Auth/Pos/Sinpe/Wallet

Workflow: `.github/workflows/gate-sensitive.yml`
Check: `E11 Tests nominales Payment/Auth/Pos/Sinpe/Wallet`

## Cuándo corre

Pull request que toca Payment*, Auth*, Pos*, Sinpe* o Wallet* en src/main/java. No corre Maven: mira que el test exista.

## Qué hacer para que no salga en rojo

1. Si tocás producción de esa familia, el diff (o el repo) tiene que incluir el test nominal: *Payment*Test*.java, *Auth*Test*.java, y lo mismo para Pos, Sinpe y Wallet.
2. En pago, auth, 2FA, POS y wallet no mezcles un refactor de "limpieza" con un cambio de comportamiento.
3. El gate no ejecuta los tests. CI (Tests Java) sí. Corré la clase tocada en local.

## Label de skip

Label `skip-sensitive-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
