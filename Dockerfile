# Frontend pre-compilado localmente y committeado en src/main/resources/static/
# Render solo necesita compilar Java — sin Node/pnpm en el build.
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /build
COPY Hot_click_outlet/pom.xml .
RUN mvn dependency:go-offline -q
COPY Hot_click_outlet/src ./src
RUN mvn clean package -Dmaven.test.skip=true -q

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /build/target/*.jar app.jar
RUN chown appuser:appgroup app.jar
USER appuser
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
