---
name: gh-ci-tests-java
description: Deja mvn test en verde para que el check Tests Java de CI no falle. Usar al cambiar Java o antes de un pull request a master.
disable-model-invocation: true
---

# Tests Java

Workflow: `.github/workflows/ci.yml`
Check: `Tests Java`

## Cuándo corre

Push y pull request a master. Corre mvn test de Hot_click_outlet/pom.xml con H2 en memoria.

## Qué hacer para que no salga en rojo

1. Antes del PR, corré los tests de las clases que tocaste: .\maven\bin\mvn -pl Hot_click_outlet -Dtest=Clase1,Clase2 test.
2. Si el corte no es claro, el módulo entero. No uses -DskipTests en el commit que querés mergear.
3. El fallo de un test no se "arregla" con NOSONAR ni con un label.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
