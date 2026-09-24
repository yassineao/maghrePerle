# Maghreperle

## E-commerce platform for Morocco

Maghreperle is a modern online store designed for the Moroccan market. The platform is built with a microservice architecture so that catalog management, customer accounts, shopping carts, and the storefront can evolve independently.

This directory contains the **Products microservice**, the backend responsible for the Maghreperle product catalog.

## What this project provides

- Product catalog management
- Product categories and active/inactive catalog visibility
- Product image upload and storage through Supabase Storage
- PostgreSQL persistence with Flyway database migrations
- Authenticated product and category management
- Service-to-service communication with the User and Cart services
- Docker-ready deployment
- REST APIs for the Angular storefront and other services

## Architecture

```text
                         ┌─────────────────────┐
                         │  Angular storefront │
                         └──────────┬──────────┘
                                    │ REST
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
       ▼                            ▼                            ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ User service  │           │Products       │           │ Cart service  │
│ Auth & users  │◄─────────►│service        │◄─────────►│ Shopping cart │
└───────────────┘           │Catalog & media│           └───────────────┘
                            └───────┬───────┘
                                    │
                            ┌───────▼───────┐
                            │ PostgreSQL    │
                            │ + Supabase    │
                            └───────────────┘
```

| Component | Responsibility |
| --- | --- |
| `Products/` | Products, categories, product images, and catalog APIs |
| `user/` | Customer registration, login, JWT sessions, and authorization |
| `cart/` | Shopping cart initialization and product selection |
| `frontend/frontend/` | Angular storefront for browsing and shopping |

## Products service stack

- **Java 25**
- **Spring Boot 4**
- **Spring MVC**
- **Spring Data JPA**
- **Spring Cloud OpenFeign**
- **PostgreSQL**
- **Flyway**
- **Supabase Storage**
- **Maven**
- **Docker**

## Project structure

```text
Products/
├── src/main/java/          Java application and domain code
├── src/main/resources/     Application configuration and migrations
├── compose.yaml            Local PostgreSQL container
├── Dockerfile              Multi-stage production image
├── pom.xml                 Maven build configuration
├── .env.example            Environment variable template
└── README.md
```

## Getting started

### Requirements

- JDK 25
- Docker Desktop
- A PostgreSQL database, local or hosted
- Supabase project credentials for product image storage

Maven is not required because the project includes the Maven Wrapper.

### 1. Configure the environment

From the `Products` directory, create a local environment file:

```powershell
Copy-Item .env.example .env
```

Update `.env` with your database and Supabase values:

| Variable | Description | Local default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://localhost:5432/mydatabase` |
| `DATABASE_USERNAME` | PostgreSQL username | `myuser` |
| `DATABASE_PASSWORD` | PostgreSQL password | `secret` |
| `USER_BACKEND_URL` | User service URL | `http://localhost:8081` |
| `SUPABASE_URL` | Supabase project URL | `http://localhost` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase key | — |
| `SUPABASE_STORAGE_BUCKET` | Image storage bucket | `products` |
| `SUPABASE_SIGNED_URL_EXPIRATION_SECONDS` | Signed URL lifetime | `3600` |

Never commit `.env` files or Supabase service-role keys.

### 2. Start the database

```powershell
docker compose up -d postgres
```

The local compose configuration starts PostgreSQL on port `5432` with database `mydatabase`.

### 3. Start the service

```powershell
.\mvnw.cmd spring-boot:run
```

The service runs on `http://localhost:8080` by default. When running alongside the Cart service, use port `8082`:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.arguments=--server.port=8082"
```

Flyway applies the database migrations automatically at startup.

## API overview

Base URL: `http://localhost:8080`

Authenticated write operations require an access token issued by the User service.

### Products

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/product` | Retrieve all products |
| `GET` | `/product/active` | Retrieve active products |
| `GET` | `/product/{id}` | Retrieve a product by UUID |
| `POST` | `/product` | Create one or more products |
| `PATCH` | `/product/{id}` | Update a product |
| `DELETE` | `/product/{id}` | Delete a product |

### Categories

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/category` | Retrieve all categories |
| `GET` | `/category/active` | Retrieve active categories |
| `GET` | `/category/name/{categoryName}` | Find a category by name |
| `POST` | `/category` | Create a category |
| `PATCH` | `/category` | Update a category |
| `DELETE` | `/category/{categoryName}` | Delete a category |

### Product images

Image endpoints are available under `/product-image` for uploading, retrieving by product, and deleting images. Uploads are limited to 10 MB per file and 12 MB per request.

## Build, test, and package

Run the verification suite:

```powershell
.\mvnw.cmd clean verify
```

Create a package without tests:

```powershell
.\mvnw.cmd clean package -DskipTests
```

## Docker deployment

Build the production image:

```powershell
docker build -t maghreperle-products .
```

Run the service with environment variables:

```powershell
docker run --rm --env-file .env -p 8080:8080 maghreperle-products
```

The Docker image uses a multi-stage Maven build and runs on a lightweight Eclipse Temurin JRE image.

## Running the full platform

To run the complete Maghreperle application locally:

1. Start PostgreSQL and the Products service.
2. Start the User service on port `8081` or update `USER_BACKEND_URL`.
3. Start the Cart service and configure `PRODUCT_SERVICE_URL` to point to the Products service.
4. Start the Angular storefront:

   ```powershell
   cd ..\frontend\frontend
   npm install
   npm start
   ```

The storefront is available at `http://localhost:4200`.

## Project status

The Products service is structured for continued development and deployment as part of the Maghreperle platform. The modular design makes it possible to add catalog features, administration tools, order workflows, payment integrations, and Morocco-specific delivery options without coupling every part of the system.

## License

No license has been specified yet for this project.
