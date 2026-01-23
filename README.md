<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->
<a id="readme-top"></a>
<!--
*** Thanks for checking out SmartCare. If you have a suggestion
*** that would make this better, please fork the repo and create a pull request
*** or simply open an issue with the tag "enhancement".
*** Don't forget to give the project a star!
*** Thanks again! Now go create something AMAZING!
-->

<!-- PROJECT SHIELDS -->
<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url] [![Forks][forks-shield]][forks-url] [![Stargazers][stars-shield]][stars-url] [![Issues][issues-shield]][issues-url] [![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <img src="./SmartCare Logo.png" alt="SmartCare Logo" width="500"/>
</div>

<h3 align="center">SmartCare</h3>

  <p align="center">
    A distributed healthcare platform built with NestJS, following microservices architecture principles to deliver scalable and secure healthcare solutions.
    <br />
    <a href="https://github.com/ElbaraaRadwan/smartcare"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/ElbaraaRadwan/smartcare">View Demo</a>
    &middot;
    <a href="https://github.com/ElbaraaRadwan/smartcare/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/ElbaraaRadwan/smartcare/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
        <li><a href="#local-development">Local Development</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#project-architecture">Project Architecture</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

SmartCare is a **secure distributed healthcare platform** built with NestJS, following microservices architecture principles to deliver scalable and HIPAA-compliant healthcare solutions.

The platform integrates key services such as authentication, clinic management, prescriptions, pharmacy operations, and payments, with enterprise-grade security including encrypted event communication, PHI audit logging, and account protection.

### 🔒 Security Features
- **Event Encryption**: AES-256-GCM encryption for inter-service communication
- **PHI Audit Logging**: HIPAA-compliant access tracking for protected health information
- **Account Protection**: Brute force prevention with Redis-based lockout
- **Rate Limiting**: Distributed rate limiting with Redis backend

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

This project leverages modern technologies to ensure robustness and scalability:

[![NestJS][NestJS]][NestJS-url] [![Node.js][Node.js]][Node-url] [![TypeScript][TypeScript]][TypeScript-url] [![PostgreSQL][PostgreSQL]][PostgreSQL-url] [![Redis][Redis]][Redis-url] [![Prisma][Prisma]][Prisma-url] [![Docker][Docker]][Docker-url] [![Nx][Nx]][Nx-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

To get a local copy of SmartCare up and running, follow these steps.

### Prerequisites

Ensure you have the following installed:
* Node.js (version 18 or higher)
* Docker and Docker Compose
* PostgreSQL 15+ (via Docker)
* Redis 7+ (via Docker)
* MinIO (via Docker, for file storage)
* npm or yarn

### Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/ElbaraaRadwan/smartcare.git
    ```
2. Navigate to the project directory:
    ```sh
    cd smartcare
    ```
3. Install root dependencies (Nx workspace):
    ```sh
    npm install
    ```
4. Start infrastructure services (PostgreSQL, Redis, MinIO):
    ```sh
    docker compose up -d postgres redis minio
    ```
5. Set up environment variables:
    ```sh
    cp .env.example .env
    # Edit .env with your configuration
    ```
6. Setup database (migrations + seeding):
    ```sh
    ./scripts/setup-database.sh
    ```
    This script will:
    - Run Prisma migrations for all services
    - Push schema changes to databases
    - Seed initial data for testing

### Local Development

To run the services locally for development:

#### Quick Start (All Services)
```sh
# Start all services automatically
./scripts/start-services.sh
```
This will start all microservices in the background and create log files.


<!-- PROJECT ARCHITECTURE -->
## Project Architecture

SmartCare implements a modern microservices architecture with advanced caching and event-driven communication.

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   API Gateway   │ ← JWT Auth, Rate Limiting
│   (Next.js)     │    │   (NestJS)      │
└─────────────────┘    └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
          ┌─────────▼─┐ ┌──────▼────┐ ┌───▼────┐
          │ Auth      │ │ Clinic    │ │ Prescr. │
          │ Service   │ │ Service   │ │ Service │
          │ Port 4001 │ │ Port 4002 │ │ Port 4003 │
          └───────────┘ └───────────┘ └─────────┘
                    │          │          │
          ┌─────────▼─┐ ┌──────▼────┐ ┌───▼────┐
          │ Pharmacy  │ │ Payments  │ │  Redis  │
          │ Service   │ │ Service   │ │  Cache  │
          │ Port 4004 │ │ Port 4005 │ │  Events │
          └───────────┘ └───────────┘ └─────────┘
                    │          │          │
                    └──────────┼──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    PostgreSQL       │
                    │   + Prisma ORM      │
                    └─────────────────────┘
```

### Key Components

**API Gateway (Port 4000):**
- JWT authentication and authorization
- Rate limiting (100 requests/minute)
- User context injection to downstream services
- Request routing and load balancing

**Microservices:**
- **Auth Service:** User management, JWT tokens, Redis session caching
- **Clinic Service:** Appointment scheduling, patient-doctor management
- **Prescription Service:** Medical prescription processing, medication tracking
- **Pharmacy Service:** Inventory management, order fulfillment, event consumers
- **Payments Service:** Stripe integration, checkout sessions, webhooks

**Infrastructure:**
- **PostgreSQL:** Primary database with Prisma ORM
- **Redis:** Caching + Event messaging
- **MinIO:** S3-compatible file storage
- **Docker:** Containerized deployment with health checks

### Data Flow

1. **Request** → API Gateway (auth + routing)
2. **User Context** → Service (x-user-id, x-user-email, x-user-role headers)
3. **Business Logic** → Database operations via Prisma
4. **Caching** → Redis for performance optimization
5. **Events** → Redis pub/sub for inter-service communication
6. **Response** → API Gateway → Client

### Performance Features

- **Redis Caching:** 82-93% reduction in database queries
- **JWT Tokens:** Efficient authentication with refresh mechanisms
- **Database Indexing:** Optimized queries with strategic indexes
- **Event-Driven:** Asynchronous processing for scalability

![SmartCare Database Architecture](./SmartCare%20Diagram.png)

### Microservices Overview

| Service | Port | Responsibility | Tech Stack |
|---------|------|---------------|------------|
| **API Gateway** | 4000 | Route requests, authentication, rate limiting | NestJS, Express, JWT, Redis |
| **Auth Service** | 4001 | User management, JWT authentication, RBAC | NestJS, Prisma, PostgreSQL, Redis |
| **Clinic Service** | 4002 | Appointment scheduling and management | NestJS, Prisma, PostgreSQL, Redis |
| **Prescription Service** | 4003 | Medical prescription processing and tracking | NestJS, Prisma, PostgreSQL, Redis |
| **Pharmacy Service** | 4004 | Inventory management and order fulfillment | NestJS, Prisma, PostgreSQL, Redis |
| **Payments Service** | 4005 | Stripe payment processing and billing | NestJS, Prisma, PostgreSQL, Stripe |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

### ✅ Completed Features
- [x] **Core Microservices**: Auth, Clinic, Prescription, Pharmacy, Payments services
- [x] **API Gateway**: Request routing, JWT auth, user context injection
- [x] **Redis Caching**: JWT tokens, user data, pharmacy stock (82-93% performance boost)
- [x] **Database Integration**: PostgreSQL with Prisma ORM across all services
- [x] **Event-Driven Architecture**: Redis pub/sub for inter-service communication
- [x] **Stripe Payments**: Complete payment processing with webhooks
- [x] **Security**: JWT authentication, Argon2 password hashing, rate limiting
- [x] **Testing Framework**: Comprehensive individual service and integration tests
- [x] **Docker Integration**: Complete containerization with health checks
- [x] **Enterprise Security**: AES-256-GCM encryption, PHI audit logging, account protection

### 🚧 In Progress
- [ ] **Frontend Integration**: Next.js patient portal and admin dashboard
- [ ] **File Upload**: MinIO integration for medical document storage
- [ ] **Email Notifications**: SMTP integration for appointment reminders
- [ ] **API Documentation**: Enhanced Swagger/OpenAPI with security schemas

### 🔮 Future Enhancements
- [ ] **Multi-tenant Support**: Organization-based access control
- [ ] **Advanced Analytics**: Healthcare metrics and reporting dashboard
- [ ] **Mobile App**: React Native patient and provider applications
- [ ] **IoT Integration**: Medical device connectivity and monitoring
- [ ] **AI/ML Features**: Predictive analytics for healthcare insights
- [ ] **Multi-language Support**: Internationalization for global healthcare
- [ ] **OAuth2 Integration**: Third-party authentication providers
- [ ] **Kubernetes Deployment**: Production container orchestration

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement". Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/ElbaraaRadwan/smartcare.svg?style=for-the-badge
[contributors-url]: https://github.com/ElbaraaRadwan/smartcare/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/ElbaraaRadwan/smartcare.svg?style=for-the-badge
[forks-url]: https://github.com/ElbaraaRadwan/smartcare/network/members
[stars-shield]: https://img.shields.io/github/stars/ElbaraaRadwan/smartcare.svg?style=for-the-badge
[stars-url]: https://github.com/ElbaraaRadwan/smartcare/stargazers
[issues-shield]: https://img.shields.io/github/issues/ElbaraaRadwan/smartcare.svg?style=for-the-badge
[issues-url]: https://github.com/ElbaraaRadwan/smartcare/issues
[license-shield]: https://img.shields.io/github/license/ElbaraaRadwan/smartcare.svg?style=for-the-badge
[license-url]: https://github.com/ElbaraaRadwan/smartcare/blob/master/LICENSE.txt
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[NestJS]: https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white
[NestJS-url]: https://nestjs.com/
[TypeScript]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[PostgreSQL]: https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white
[PostgreSQL-url]: https://www.postgresql.org/
[Redis]: https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white
[Redis-url]: https://redis.io/
[Prisma]: https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white
[Prisma-url]: https://www.prisma.io/
[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[Nx]: https://img.shields.io/badge/Nx-143055?style=for-the-badge&logo=nx&logoColor=white
[Nx-url]: https://nx.dev/
