# 🛠️ Naziran Matrix ERP - Installation & Setup Guide

This guide details the complete step-by-step setup procedure to install, configure, build, and run **Naziran Matrix ERP** on local development machines or production environments.

---

## 📋 System Prerequisites

Ensure your system meets the following requirements before installation:

| Requirement | Minimum Version | Recommended Version |
| :--- | :--- | :--- |
| **Node.js** | `v18.x` | `v20.x` LTS or higher |
| **npm** | `v9.x` | `v10.x` or higher |
| **Python** | `3.10.x` | `3.11.x` |
| **PostgreSQL** | `15.0` | `15.x` or `16.x` |
| **Docker & Compose** | `20.10.x` | Latest |
| **RAM** | `4 GB` | `8 GB` or higher |

---

## 🚀 Quick Start (Local Setup in 5 Steps)

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/Naziran-Matrix-ERP.git
cd Naziran-Matrix-ERP
```

### Step 2: Start PostgreSQL Database
Run a PostgreSQL container using Docker Compose:
```bash
docker compose up -d
```
*Verification*: Ensure PostgreSQL is listening on `localhost:5432`.

### Step 3: Install Node Dependencies
Install all workspace dependencies across the monorepo:
```bash
npm install
```

### Step 4: Setup Environment Variables
1. **API Environment (`apps/api/.env`)**:
   Create `apps/api/.env` with the following configuration:
   ```env
   PORT=5000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=naziran_matrix_db
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/naziran_matrix_db?schema=public"

   JWT_SECRET=super_secret_jwt_key_naziran_2026
   JWT_REFRESH_SECRET=super_secret_refresh_key_naziran_2026

   CLIENT_URL=http://localhost:5173
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

2. **Web Frontend Environment (`apps/web/.env`)**:
   Create `apps/web/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

3. **AI Service Environment (`apps/ai-service/.env`)**:
   Create `apps/ai-service/.env`:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=naziran_matrix_db
   ```

### Step 5: Initialize Database Schema & Seed Data
Navigate to `apps/api` to run Prisma migrations and load demo seed data:
```bash
cd apps/api
npx prisma migrate dev --name init
npx prisma db seed
cd ../..
```

---

## 🏃 Running Development Servers

You can launch all applications simultaneously:

```bash
# Run both Frontend (Vite) and Backend (Express) in parallel
npm run dev
```

Or run services individually:

- **Web Frontend**: `npm run dev:web` (Runs on `http://localhost:5173`)
- **Backend API**: `npm run dev:api` (Runs on `http://localhost:5000`)
- **AI Microservice**: 
  ```bash
  cd apps/ai-service
  python -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
  ```

---

## 🔐 Default Demo Accounts (Pre-Seeded)

The database seed command generates standard enterprise demo user profiles (Default Password: `Password123`):

| Role | Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@naziran.com` | `Password123` | Full System Control & Executive Dashboard |
| **HR Manager** | `hr@naziran.com` | `Password123` | Employee, Attendance, Payroll, Leave Approvals |
| **Finance Lead** | `finance@naziran.com` | `Password123` | Accounting, Ledger, P&L, Invoices, Transactions |
| **Sales Lead** | `sales@naziran.com` | `Password123` | Orders, Quotations, CRM Leads & Pipeline |
| **Dept Manager**| `manager@naziran.com` | `Password123` | Department Management & Reviews |
| **Employee** | `employee@naziran.com` | `Password123` | Self Attendance, Leave Request, Payslips |

---

## 🏗️ Production Build Commands

To test or generate production builds locally:

```bash
# Build web app bundle
cd apps/web
npm run build

# Start production preview
npm run preview
```

---

## ❓ Troubleshooting & FAQs

### 1. Database Connection Refused (`P1001`)
- Ensure PostgreSQL container is running: `docker ps`
- Verify credentials in `apps/api/.env` match `docker-compose.yml`.

### 2. Port Conflict (`EADDRINUSE: 5000`)
- Stop existing processes using port 5000:
  - Windows: `npx kill-port 5000`
  - Linux/Mac: `lsof -ti:5000 | xargs kill -9`
