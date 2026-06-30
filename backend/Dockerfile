## Start with a base image

FROM maven:3.9.6-eclipse-temurin-25 AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# ARG PROJECT_VERSION= 0.0.1
FROM eclipse-temurin:25-jre
WORKDIR /app

COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar /app/

EXPOSE 8888
ENTRYPOINT [ "java", "-jar", "backend-0.0.1-SNAPSHOT.jar" ]