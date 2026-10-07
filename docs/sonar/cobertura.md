# Cobertura

Instrucción obligatoria. Se enfoca en cuántas líneas ejecutan las pruebas. No se quita `sonar.coverage.exclusions` sin publicar el informe de pruebas en el mismo cambio.

Hoy está en 0 % porque `sonar-project.properties` la excluye con `sonar.coverage.exclusions=**/*`. Esa exclusión existe para que la falta de informe de cobertura no frene el quality gate.

No bloquea el verde. Cuando se quiera medir de verdad, se quita esa línea y se publica el informe `lcov` del frontend y el de Java.
