# SonarCloud API — Hot-click-dev

Dashboard: https://sonarcloud.io/project/overview?id=hotclickdev_Hot-click-dev

```
projectKey = hotclickdev_Hot-click-dev
organization = hotclickdev
```

Base: `https://sonarcloud.io/api`

## Llamadas (en este orden)

1. Quality Gate

```
GET /qualitygates/project_status?projectKey=hotclickdev_Hot-click-dev
```

El gate mira **código nuevo**. Rating A exige 0 bugs y 0 vulns en ese período (también los MINOR).

2. Totales

```
GET /measures/component?component=hotclickdev_Hot-click-dev&metricKeys=alert_status,bugs,vulnerabilities,security_hotspots,code_smells,reliability_rating,security_rating,sqale_rating,new_bugs,new_vulnerabilities,new_code_smells
```

3. Agregados — `ps=1`, **no** listar todos los issues

```
GET /issues/search?componentKeys=hotclickdev_Hot-click-dev&resolved=false&ps=1&facets=types,rules,directories,severities,languages
```

Código nuevo que tumba el gate:

```
GET /issues/search?componentKeys=hotclickdev_Hot-click-dev&resolved=false&inNewCodePeriod=true&types=BUG,VULNERABILITY&ps=1&facets=rules,severities
GET /issues/search?componentKeys=hotclickdev_Hot-click-dev&resolved=false&types=BUG&createdAfter=YYYY-MM-DD&ps=50
```

(`createdAfter` = fecha del período en `qualitygates.projectStatus.periods[0].date`.)

Detalle de una regla (máx. 50):

```
GET /issues/search?componentKeys=hotclickdev_Hot-click-dev&resolved=false&rules=RULE_KEY&ps=50
```

## Plantilla de informe

```
Quality Gate: OK | ERROR
  - new_reliability_rating / new_security_rating (umbral vs actual)
Totales: N bugs, N vulns, N smells (no expandir smells)

Por área (bugs+vulns):
  - service/: …
  - controller/: …
  - frontend admin/: …
  - otros: …

Código nuevo que tumba el gate (lista corta, regla + archivo)

Contrastado con local:
  - sigue / se movió / ya no está

Slice recomendado: el más chico que deja el gate en verde
Fuera de alcance: smells masivos (S1192, S3358, S3776) salvo boy scout
```

## Áreas típicas de este repo

- `Hot_click_outlet/src/main/java/com/hotclick/service` — mayoría de bugs Java
- `Hot_click_outlet/src/main/java/com/hotclick/controller`
- `Hot_click_outlet/frontend/src/pages/admin` — a11y `S1082`, `Math.random`
- `Hot_click_outlet/frontend/src/utils` — p.ej. hooks fuera de componente

## Reglas que ya tumbaron el gate (referencia)

- `javascript:S2245` — `Math.random` (UI = falso positivo; crypto = fix)
- `javascript:S1082` — click sin teclado
- `java:S8700` — `Duration.between` tipos naive vs con zona
- `java:S2142` — `InterruptedException` sin `interrupt()`
- `java:S5866` — `CASE_INSENSITIVE` sin `UNICODE_CASE`

## Workflow de re-scan

`.github/workflows/sonarcloud.yml` — `workflow_dispatch` o push/PR a `master`.
Secretos: `SONAR_TOKEN`. No pedir el token ni pegarlo en el chat.
