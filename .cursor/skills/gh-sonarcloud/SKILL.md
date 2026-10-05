---
name: gh-sonarcloud
description: Deja el Quality Gate de Sonar en verde (cero bugs y vulnerabilidades en código nuevo). Usar al cerrar un issue de Sonar, antes de mergear, o cuando SonarCloud Code Analysis salga en rojo.
disable-model-invocation: true
---

# Escaneo SonarCloud

Workflow: `.github/workflows/sonarcloud.yml`
Check: `Escaneo SonarCloud`

## Cuándo corre

Push y pull request a master. El workflow publica el análisis. El check SonarCloud Code Analysis es el Quality Gate: en código nuevo, rating A exige 0 bugs y 0 vulnerabilidades.

## Qué hacer para que no salga en rojo

1. Un bug o vulnerabilidad de código nuevo se corrige en el código. No bajes el Quality Gate.
2. NOSONAR solo en un falso positivo puntual, en la misma línea, con la frase que dice por qué. No lo uses para complejidad ni para una función larga.
3. Un http:// en un test que afirma que el helper rechaza http es falso positivo: comentario NOSONAR en esa línea, como en solicitudesHelpers.test.ts.
4. Una promesa que no se espera y ya tiene catch adentro se marca con void. Eso no agrega manejo de error: el catch tiene que existir.
5. El token SONAR_TOKEN no se pega en el repo ni en el chat.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
