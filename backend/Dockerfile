FROM eclipse-temurin:25 AS builder
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -B

COPY src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8888
ENTRYPOINT [ "java", "-jar", "app.jar" ]