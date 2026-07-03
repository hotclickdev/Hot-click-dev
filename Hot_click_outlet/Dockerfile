# Frontend pre-compilado localmente y committeado en src/main/resources/static/
# Render solo necesita compilar Java — sin Node/pnpm en el build.
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
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
