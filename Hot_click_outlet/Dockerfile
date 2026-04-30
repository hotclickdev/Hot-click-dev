# Stage 1: Build
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copiar pom.xml primero (para cachear dependencias)
COPY pom.xml .

# Descargar dependencias (esto se cachea si el pom.xml no cambia)
RUN mvn dependency:go-offline

# Copiar el código fuente
COPY src ./src

# Compilar el proyecto
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Copiar el JAR desde la etapa de build
COPY --from=builder /build/target/*.jar app.jar

# Puerto de la aplicación
EXPOSE 8080

# Comando para ejecutar la aplicación
ENTRYPOINT ["java", "-jar", "app.jar"]