From maven:3.9-eclipse-temurin-25 as build

WORKDIR /app

COPY pom.xml .

RUN mvn dependency:go-offline -B --no-transfer-progress

COPY src ./src

RUN mvn clean package -B -DskipTests --no-transfer-progress

FROM eclipse-temurin:25-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]