# 🚀 Naziran Matrix ERP

**Naziran Matrix ERP** is an Enterprise Resource Planning (ERP) platform powered by AI microservices, Prisma ORM, Node.js Express backend, and a modern React frontend. It provides end-to-end management for Human Resources (HRM), Payroll, Inventory, Sales & CRM, Finance & Accounting, Document Management, and AI-driven business intelligence.

---

## 📐 System Architecture & Monorepo Structure

```
Naziran-Matrix ERP/
├── apps/
│   ├── api/                # Express 5 + TypeScript + Prisma ORM (Port: 5000)
│   ├── web/                # React 19 + Vite + TailwindCSS v4 + Lucide Icons (Port: 5173)
│   └── ai-service/         # Python FastAPI + Gemini AI + PyPDF + RAG Engine (Port: 8000)
├── packages/               # Shared packages across workspace
│   ├── config/             # Shared TypeScript & ESLint configs
│   ├── types/              # Common TypeScript definitions
│   ├── ui/                 # Shared UI components library
│   └── utils/              # Common utility functions
├── docker/                 # Container configs
├── docker-compose.yml      # PostgreSQL 15 container definition
├── package.json            # Monorepo NPM workspace configuration
└── README.md
```

---

## ✨ Key Modules & Features

### 🏢 1. Human Resource Management (HRM)
- **Employee Management:** Directory, profiles, departmental assignment, designation hierarchy, and employment status tracking.
- **Attendance & Time Tracking:** Daily clock-in/clock-out tracking, overtime calculation, late penalty minutes, and daily status logs.
- **Leave Management:** Application workflow for Annual, Sick, Casual, and Unpaid leave with approval routing.
- **Performance Management:** Employee review scores, feedback logging, and target goal assignments.

### 💰 2. Payroll & Compensation
- **Salary Processing:** Automated calculations combining Basic Salary, Allowances, Bonuses, Deductions, and Tax.
- **Payslip Generation:** Automated monthly payslip status tracking and delivery.

### 📦 3. Inventory & Supply Chain Management
- **Product Catalog:** SKU tracking, barcode support, stock levels, and low-stock alerts.
- **Category & Supplier Management:** Vendor relations and procurement classification.
- **Purchase Orders:** Supplier ordering workflows from Draft to Received status.

### 🤝 4. Sales & CRM (Customer Relationship Management)
- **Customer Directory:** Lead, Opportunity, Deal, and Customer pipeline stages.
- **Quotation & Order Lifecycle:** Quotation builder, sales orders, GST & tax calculations.
- **Invoicing:** Automatic invoice generation from orders with status tracking (Unpaid, Paid, Overdue).

### 💳 5. Finance & Accounting
- **Transaction Ledger:** Income & Expense logging categorised by business area (Salaries, Utilities, Sales, Marketing).
- **Financial Analytics:** Real-time revenue tracking and expense aggregation.

### 🤖 6. AI Microservice & Intelligent RAG Engine
- **Business AI Assistant:** Natural language query resolution powered by Google Gemini AI.
- **Document RAG Chat:** Document upload (PDF/Policy Handbooks) with vector indexing and Retrieval-Augmented Generation (RAG) query engine.
- **Resume Screener:** Automated candidate resume parsing against job descriptions.
- **Interview Question Generator:** Custom interview prompt generator by position & focus area.
- **Smart Email Builder:** Automated email draft generation for enterprise communications.
- **AI Analytics & Forecasting:** Expense analysis, sales forecasting, and HR employee sentiment analytics.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, Vite, React Router v7 |
| **Styling & Icons** | TailwindCSS v4, Lucide React, Recharts |
| **State & Data Fetching**| TanStack Query (React Query) |
| **Backend API** | Node.js, Express 5, TypeScript |
| **Database & ORM** | PostgreSQL 15, Prisma ORM |
| **Security & Auth** | JWT Authentication, Bcrypt, Helmet, CORS, Express Rate Limit |
| **AI Microservice** | Python 3.10+, FastAPI, Uvicorn, Google Generative AI (Gemini), PyPDF |
| **Containerization** | Docker, Docker Compose |

---

## ⚙️ Environment Configuration

### 1. Backend API Environment (`apps/api/.env`)
Create an `.env` file inside `apps/api/`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=naziran_matrix_db
DATABASE_URL="postgresql://postgres:your_postgres_password@localhost:5432/naziran_matrix_db?schema=public"

JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_refresh_secret_key

CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_google_gemini_api_key
```

### 2. AI Microservice Environment (`apps/ai-service/.env`)
Create an `.env` file inside `apps/ai-service/`:
```env
GEMINI_API_KEY=your_google_gemini_api_key
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=naziran_matrix_db
```

---

## 🚀 How to Run the Project (Step-by-Step)

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v18.x or higher) & **npm**
- **Python** (v3.10 or higher)
- **Docker** & **Docker Compose** (or a local PostgreSQL instance)

---

### Step 1: Start PostgreSQL Database
Run PostgreSQL using Docker Compose from the root directory:
```bash
docker compose up -d
```
*This starts a PostgreSQL 15 instance running on `localhost:5432` with database `naziran_matrix_db`.*

---

### Step 2: Install Node Dependencies & Setup Database
1. In the root directory, install workspace dependencies:
   ```bash
   npm install
   ```

2. Navigate to `apps/api` to run Prisma Database Migrations and Seed initial data:
   ```bash
   cd apps/api
   npx prisma migrate dev --name init
   npx prisma db seed
   cd ../..
   ```

---

### Step 3: Run the Services

You can run the three core components in separate terminal windows:

#### 🟢 Option A: Run via Workspace Scripts (Recommended)

1. **Start Express Node.js API (Port 5000):**
   ```bash
   npm run dev:api
   ```

2. **Start React Frontend (Port 5173):**
   ```bash
   npm run dev:web
   ```

3. **Start Python AI Microservice (Port 8000):**
   - First setup the Python virtual environment (once):
     ```bash
     cd apps/ai-service
     python -m venv .venv
     ```
     - Windows PowerShell: `.venv\Scripts\Activate.ps1`
     - macOS/Linux: `source .venv/bin/activate`
     ```bash
     pip install -r requirements.txt
     cd ../..
     ```
   - Run AI service:
     ```bash
     npm run dev:ai
     ```

#### 🔵 Option B: Run Individually from App Subfolders

- **Node API**: `cd apps/api && npm run dev`
- **React Frontend**: `cd apps/web && npm run dev`
- **Python AI Microservice**: `cd apps/ai-service && uvicorn app.main:app --reload`

---

## 🔗 Port Access Matrix

| Service | Protocol / Port | URL |
| :--- | :--- | :--- |
| **Frontend Web App** | HTTP / 5173 | [http://localhost:5173](http://localhost:5173) |
| **Express Backend API** | HTTP / 5000 | [http://localhost:5000](http://localhost:5000) |
| **API Health Check** | HTTP / 5000 | [http://localhost:5000/](http://localhost:5000/) |
| **AI Microservice** | HTTP / 8000 | [http://localhost:8000](http://localhost:8000) |
| **FastAPI Swagger Docs** | HTTP / 8000 | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **PostgreSQL Database** | TCP / 5432 | `localhost:5432` |

---

## 📡 REST API & AI Service Endpoints Summary

### Express API (`http://localhost:5000/api`)
- `/api/auth` - Login, Registration, Token Refresh, Password Reset
- `/api/employees` - Employee profile CRUD & Department management
- `/api/attendance` - Clock-in/Clock-out logging & Monthly reports
- `/api/payroll` - Monthly salary processing & Payslip lookup
- `/api/inventory` - Products, Categories, Stock, Purchase Orders
- `/api/sales` - Orders, Quotations, Invoicing
- `/api/crm` - Customers, Leads, Opportunities, Deals
- `/api/finance` - Transactions, Revenue & Expense reports
- `/api/ai` - Router proxying calls to Python AI Microservice

### Python AI Service (`http://localhost:8000`)
- `POST /ai/assistant` - General enterprise AI assistant chat
- `GET  /ai/insights` - Automated system insights generation
- `POST /ai/resume-screener` - Candidate resume vs job description analyzer
- `POST /ai/interview-gen` - Interview question builder
- `POST /ai/upload-document` - Index documents for RAG engine
- `POST /ai/document-chat` - Document-based Q&A chat
- `POST /ai/email-generator` - Enterprise email composer
- `GET  /ai/expense-analyzer` - AI Expense breakdown & anomaly detection
- `GET  /ai/sales-forecast` - AI Predictive sales forecasting
- `GET  /ai/employee-analytics` - AI Employee retention & performance analysis

---

## 📝 License

This project is licensed under the ISC License.
