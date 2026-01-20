# 🏥 SmartCare

A **Healthcare Management Platform** built with [NestJS](https://nestjs.com/) and microservices architecture, designed to deliver modern healthcare functionalities including intelligent appointment scheduling, digital prescriptions, pharmacy operations, and patient management.

---

## 🧰 Tools & Dependencies

The core tools and dependencies used in this project:

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" alt="NestJS" height="100" />
  <img src="https://img.icons8.com/color/100/000000/postgreesql.png" alt="PostgreSQL" height="100" />
  <img src="https://img.icons8.com/color/100/000000/redis.png" alt="Redis" height="100" />
  <img src="https://icon.icepanel.io/Technology/svg/Prisma.svg" alt="Prisma" height="100" />
  <img src="https://img.icons8.com/?size=100&id=wU62u24brJ44&format=png&color=000000" alt="MinIO" height="100" />
  <img src="https://img.icons8.com/color/100/000000/nextjs.png" alt="Next.js" height="100" />
  <img src="https://img.icons8.com/color/100/000000/typescript.png" alt="TypeScript" height="100" />
  <img src="https://img.icons8.com/color/100/000000/docker.png" alt="Docker" height="100" />
</p>

### 🚢 Infrastructure & Deployment

<p align="center">
  <img src="https://img.icons8.com/color/100/000000/kubernetes.png" alt="Kubernetes" height="100" />
  <img src="https://nx.dev/images/nx-logo.png" alt="Nx" height="100" />
  <img src="https://img.icons8.com/color/100/000000/nginx.png" alt="NGINX" height="100" />
  <img src="https://img.icons8.com/color/100/000000/amazon-web-services.png" alt="AWS" height="100" />
  <img src="https://icon.icepanel.io/AWS/svg/Containers/Elastic-Container-Registry.svg" alt="AWS ECR" height="100">
</p>

---

## 🚀 Features

### Core Services
- **API Gateway**: Centralized entry point with authentication, routing, and rate limiting
- **Auth Service**: User management, JWT authentication, role-based access control
- **Clinic Service**: Appointment scheduling, consultation management, doctor-patient interactions
- **Prescription Service**: Digital prescriptions, medication management, OCR integration

### Planned Services
- **Pharmacy Service**: Inventory management, dispensing, medication tracking
- **Payment Service**: Billing, transactions, insurance processing
- **Notification Service**: Email/SMS alerts, appointment reminders
- **OCR Service**: Prescription scanning, document digitization

### Frontend
- **Next.js Dashboard**: Patient/doctor portals, administrative interfaces

## 🏗️ Architecture

### High-Level Overview
```
┌─────────────┐
│   Next.js   │ (Frontend / API Gateway)
│  (Port 3000)│
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│           API Gateway (NestJS)                  │
│              (Port 4000)                        │
└───┬─────┬──────┬──────┬──────┬──────┬──────┬────┘
    │     │      │      │      │      │      │
    ▼     ▼      ▼      ▼      ▼      ▼      ▼
┌─────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│Auth │ │Clin│ │Pres│ │Phar│ │Pay │ │Noti│ │OCR │
│4001 │ │4002│ │4003│ │4004│ │4005│ │4006│ │8000│
└─────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘
```

For detailed architecture diagrams, see:
- [High-Level Architecture Diagram](High-Level%20Architecture%20Diagram.txt)
- [Database Schema Diagram](Database%20Schema%20Diagram.md)
- [SmartCare System ER Diagram (Mermaid)](SmartCare%20Diagram%20v1.mmd)
- ![SmartCare System ER Diagram](SmartCare%20Diagram%20v1.png)

## 🛠️ Tech Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Message Queue**: BullMQ
- **Object Storage**: MinIO
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14 (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand/React Query

### DevOps & Tools
- **Monorepo**: Nx
- **Containerization**: Docker & Docker Compose
- **Testing**: Jest + Supertest
- **Linting**: ESLint
- **Code Formatting**: Prettier
- **CI/CD**: GitHub Actions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- MinIO (optional, for file storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/smartcare.git
   cd smartcare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure**
   ```bash
   docker-compose up -d postgres redis minio
   ```

5. **Run database migrations**
   ```bash
   npx nx run-many --target=migrate --all
   ```

6. **Start development servers**
   ```bash
   # Start all services
   npm run dev

   # Or start individual services
   npx nx serve api-gateway
   npx nx serve auth-service
   npx nx serve clinic-service
    npx nx serve prescription-service
   ```

## 📡 API Documentation

### Swagger/OpenAPI

Once the services are running, access the API documentation for each service:

- **API Gateway**: `http://localhost:4000/api`
- **Auth Service**: `http://localhost:4001/api`
- **Clinic Service**: `http://localhost:4002/api`
- **Prescription Service**: `http://localhost:4003/api`

---

## 📦 Package Highlights

This project uses a rich set of modern libraries and frameworks to deliver robust, scalable, and efficient healthcare functionality. Key packages include:

### 🔧 Framework & Core
- **@nestjs/core** – Core NestJS framework module
- **@nestjs/jwt**, **@nestjs/passport** – Authentication with JWT and Passport strategies
- **@nestjs/config** – Configuration management
- **@nestjs/throttler** – Rate limiting for API protection

### 📡 API & Communication
- **supertest** – HTTP endpoint testing
- **rxjs** – Reactive programming utilities (built-in with NestJS)
- **axios** – HTTP client for inter-service communication

### 🧠 Data Management
- **@prisma/client** – Database client for PostgreSQL
- **prisma** – ORM for schema management and migrations
- **class-validator**, **class-transformer** – Decorator-based validation and transformation
- **uuid** – Universal unique ID generator

### ☁️ Cloud & Storage
- **@aws-sdk/client-s3** – AWS S3 SDK for file handling
- **minio** – Object storage for documents and images

### 🔄 Message Queue & Cache
- **bullmq** – Message queue for background jobs
- **ioredis** – Redis client for caching and sessions

### 🧪 Testing & Quality
- **jest** – Testing framework
- **@types/jest** – TypeScript definitions for Jest
- **eslint**, **prettier** – Code linting and formatting

### 🎨 Frontend
- **next** – React framework for the frontend
- **react**, **react-dom** – Core React libraries
- **tailwindcss** – Utility-first CSS framework

---

> This collection of tools empowers the platform to handle healthcare APIs, authentication, data persistence, cloud storage, messaging, and more—all in a modular, maintainable microservices way.

## 📝 License

This project is [MIT licensed](LICENSE).

---

For questions or support, please open an issue on GitHub or contact the development team.
