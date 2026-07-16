FROM eclipse-temurin:25 AS builder
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -B

COPY src ./src

EXPOSE 8888
CMD ["./mvnw", "spring-boot:run"]
