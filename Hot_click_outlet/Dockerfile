# Frontend pre-compilado localmente y committeado en src/main/resources/static/
# OBLIGATORIO antes de build/deploy de esta imagen:
#   cd Hot_click_outlet/frontend && pnpm build
# Sin eso, Docker sirve un bundle JS viejo (no hay Node en esta imagen).
# Render solo necesita compilar Java — sin Node/pnpm en el build.
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
# dependency:go-offline no respeta las <exclusions> del pom (intenta resolver
# igual el POM de jackson-dataformat-cbor:2.18.5, con su dep SNAPSHOT rota de
# jackson-databind) — dependency:resolve sí las respeta y cachea igual las deps
# en esta capa separada de COPY src, que es lo único que buscábamos acá.
RUN mvn dependency:resolve dependency:resolve-plugins -q
COPY src ./src
# maven.test.skip (no solo -DskipTests) porque hay tests de src/test que no compilan
# contra el código actual (ApiKeyCacheTest y varios de integración referencian clases
# que ya no existen) — -DskipTests solo salta la ejecución, no la compilación.
RUN mvn clean package -Dmaven.test.skip=true -q

FROM eclipse-temurin:21-jre-alpine
# Chromium empaquetado para Alpine (musl) — usado por CatalogoImportService como
# fallback headless cuando el scraping simple (Jsoup) no alcanza (sitios JS/SPA).
# Chromium y chromium-chromedriver vienen versionados juntos por Alpine, evita
# el problema de incompatibilidad que tendría el binario que descarga Selenium/Playwright.
RUN apk add --no-cache chromium chromium-chromedriver
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROMEDRIVER_PATH=/usr/bin/chromedriver
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
RUN chown appuser:appgroup app.jar
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
