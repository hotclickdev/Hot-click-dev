# Stage 1: Build React frontend
# - node:22-slim (glibc) requerido por rolldown/Vite 8 (bindings nativos)
# - NO usar --frozen-lockfile: pnpm necesita resolver los optional deps de
#   plataforma (rolldown linux-x64-gnu) que el lockfile generado en Windows
#   no instala automáticamente con frozen-lockfile.
#   La version de cada paquete sigue siendo la del lockfile (pnpm-lock.yaml).
FROM node:22-slim AS frontend-builder
WORKDIR /app/frontend
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile
COPY frontend/ ./
RUN mkdir -p /app/src/main/resources/static && pnpm run build

# Stage 2: Build Spring Boot
FROM maven:3.9-eclipse-temurin-21 AS backend-builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
COPY --from=frontend-builder /app/src/main/resources/static ./src/main/resources/static
RUN mvn clean package -DskipTests -q

# Stage 3: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=backend-builder /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
