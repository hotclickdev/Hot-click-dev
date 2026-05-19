# Stage 1: Build Spring Boot
# El frontend ya está compilado en src/main/resources/static/ (pnpm build local
# antes de cada commit). Docker solo compila el backend; no necesita Node ni pnpm.
FROM maven:3.9-eclipse-temurin-21 AS backend-builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn clean package -DskipTests -q

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=backend-builder /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
