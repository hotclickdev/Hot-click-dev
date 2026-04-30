# Stage 1: Build
FROM eclipse-temurin:24-jdk AS builder

WORKDIR /build

COPY pom.xml .
COPY src ./src

RUN apt-get update && apt-get install -y maven && \
    mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:24-jre

WORKDIR /app

COPY --from=builder /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
