# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY Hot_click_outlet/frontend/package*.json ./
RUN npm ci --quiet
COPY Hot_click_outlet/frontend/ ./
# vite.config.js: outDir = ../src/main/resources/static
RUN mkdir -p /app/src/main/resources/static && npm run build

# Stage 2: Build Spring Boot
FROM maven:3.9-eclipse-temurin-21 AS backend-builder
WORKDIR /build
COPY Hot_click_outlet/pom.xml .
RUN mvn dependency:go-offline -q
COPY Hot_click_outlet/src ./src
COPY --from=frontend-builder /app/src/main/resources/static ./src/main/resources/static
RUN mvn clean package -DskipTests -q

# Stage 3: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=backend-builder /build/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
