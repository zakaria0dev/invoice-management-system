# 🛠️ Technology Stack

## Overview

Invoice Manager is built with a modern, scalable, and production-ready technology stack using the latest frameworks and best practices.

---

## Backend Stack

### Core Framework
- **Express.js** 4.22+ - Fast, unopinionated web framework
- **TypeScript** - Type-safe development
- **Node.js** 18+ - Runtime environment

### Database & ORM
- **PostgreSQL** - Robust relational database
- **Prisma 6** - Modern ORM with type safety
- **Database Migrations** - Automated schema versioning

### Authentication & Security
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcryptjs** - Password hashing and verification
- **Helmet** - Security headers middleware
- **express-rate-limit** - API rate limiting
- **xss-clean** - XSS protection middleware
- **CORS** - Cross-origin resource sharing

### Data Processing & Export
- **ExcelJS** - Excel (.xlsx) file generation
- **json2csv** - CSV data export
- **pdf-lib** - PDF generation and manipulation
- **@pdf-lib/fontkit** - Font support for PDFs

### Utilities
- **dotenv** - Environment variable management
- **Zod** - Schema validation and parsing
- **Nodemailer** - Email sending service
- **node-cron** - Scheduled task execution
- **Multer** - File upload handling

### Testing & Development
- **Jest** - Unit testing framework
- **ts-node** - TypeScript execution for Node
- **ts-node-dev** - Development auto-reload

---

## Frontend Stack

### Core Framework
- **React 18+** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Next-generation build tool

### UI & Styling
- **shadcn/ui** - High-quality React component library
- **Radix UI** - Headless UI components
  - Accordion, Alert Dialog, Avatar, Checkbox
  - Collapsible, Context Menu, Dialog
  - Dropdown Menu, Hover Card, Label
  - Menubar, Navigation Menu, Popover
  - Progress, Radio Group, Scroll Area
  - Select, Separator, Slider
  - Switch, Tabs, Toast, Toggle
- **Tailwind CSS** - Utility-first CSS framework
- **Class Variance Authority** - Component styling variants
- **clsx** - Utility for conditional classnames

### Form & Validation
- **React Hook Form** - Efficient form state management
- **@hookform/resolvers** - Form validation resolvers
- **Zod** - Schema validation

### Data Management
- **@tanstack/react-query** - Server state management
- **Axios** - HTTP client

### UI/UX Features
- **Embla Carousel** - Carousel/slider component
- **cmdk** - Command palette component
- **date-fns** - Date utilities and manipulation
- **@base-ui/react** - Additional base UI components

### Testing
- **Vitest** - Unit and integration testing
- **@testing-library/react** - Component testing utilities

### Internationalization
- **i18n** - Multi-language support ready

### Build & Dev Tools
- **Vite** - Fast bundling and HMR
- **TypeScript** - Compilation and type checking
- **PostCSS** - CSS processing
- **Tailwind CSS** - CSS generation

---

## Deployment & DevOps

### Containerization
- **Docker** - Container support
- **Docker Compose** - Multi-container orchestration

### Development
- **Git** - Version control
- **ESLint** - Code linting
- **Package Management** - npm/bun

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)             │
│  ┌─────────────────────────────────────────────────┐ │
│  │  UI Components (shadcn/ui + Radix)              │ │
│  │  React Query | React Hook Form | Tailwind CSS   │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓ (HTTPS/REST)
┌─────────────────────────────────────────────────────┐
│              Backend API (Express + TS)              │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Routes | Controllers | Services | Middleware   │ │
│  │  JWT Auth | RBAC | Data Validation (Zod)       │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓ (SQL)
┌─────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                   │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Tables | Relations | Indexes | Constraints    │ │
│  │  Prisma ORM | Migrations                        │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Microservices
- **PDF Service** - Dedicated PDF generation microservice
- **Email Service** - Nodemailer integration

---

## Development Workflow

### Local Development
```bash
Frontend:  npm run dev  (Vite dev server)
Backend:   npm run dev  (ts-node-dev with auto-reload)
Database:  Prisma migrations + PostgreSQL
```

### Production Build
```bash
Frontend:  npm run build  (Optimized Vite bundle)
Backend:   npm run build  (TypeScript compilation)
Database:  PostgreSQL with production optimization
```

---

## Performance Optimizations

### Frontend
- **Code Splitting**: Vite automatic chunk splitting
- **Tree Shaking**: Dead code elimination
- **Lazy Loading**: Component and route-level code splitting
- **Image Optimization**: Responsive image handling
- **Caching**: React Query stale time and cache strategies

### Backend
- **Database Indexing**: Optimized queries with Prisma
- **Rate Limiting**: API endpoint protection
- **Connection Pooling**: PostgreSQL connection management
- **Middleware Optimization**: Efficient request handling
- **Compression**: Response compression

---

## Security Implementation

### Authentication
- JWT tokens with secure expiration
- Refresh token rotation
- Secure password hashing (bcrypt)

### Authorization
- Role-based access control (RBAC)
- Permission checking on every operation
- Resource-level authorization

### Data Protection
- XSS protection via sanitization
- SQL injection prevention (Prisma ORM)
- CSRF token support ready
- Helmet security headers
- CORS validation

### API Security
- Rate limiting (8 requests per 15 minutes)
- Input validation (Zod schemas)
- Output sanitization
- Secure headers

---

## Scalability

The stack is designed to scale:
- **Database**: PostgreSQL with indexing and query optimization
- **API**: Stateless Express servers (horizontal scaling)
- **Frontend**: Static asset CDN deployment ready
- **Caching**: Redis-ready architecture
- **Queue**: Cron jobs scalable to message queues

---

## Dependencies Summary

- **Production Dependencies**: 25+
- **Development Dependencies**: 15+
- **Total Packages**: 40+

All pinned to secure, stable versions with regular updates.

---

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## System Requirements

**Minimum:**
- Node.js 18+
- PostgreSQL 12+
- 512MB RAM
- 1GB storage

**Recommended:**
- Node.js 20+
- PostgreSQL 15+
- 2GB RAM
- 5GB storage

---

## Summary

Invoice Manager uses **industry-leading technologies** focused on:
- ✅ Developer experience (TypeScript, modern frameworks)
- ✅ Performance (Vite, React Query, optimized bundles)
- ✅ Security (JWT, bcrypt, CORS, rate limiting)
- ✅ Scalability (Stateless design, database optimization)
- ✅ Maintainability (Clean architecture, type safety)

**Production-ready and continuously updated** with latest security patches.
