FROM eclipse-temurin:25 AS builder
WORKDIR /app

COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -B

COPY src ./src
RUN ./mvnw package -DskipTests -Dmaven.test.skip=true

FROM eclipse-temurin:25
RUN apt-get update -qq && apt-get install -y -qq curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8888
CMD ["java", "-jar", "app.jar"]
