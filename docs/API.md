# 🌐 Naziran Matrix ERP - API Reference Documentation

Welcome to the **Naziran Matrix ERP REST API** documentation. The API powers all backend enterprise workflows, role-based access controls, microservices, and AI integrations.

---

## 📌 Base URL & Headers

- **Base URL**: `http://localhost:5000/api`
- **Content-Type**: `application/json`
- **Authorization**: `Bearer <JWT_ACCESS_TOKEN>`

---

## 🔐 1. Authentication & Security Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new enterprise user & auto-login | ❌ No |
| `POST` | `/api/auth/login` | Authenticate user & receive access/refresh tokens | ❌ No |
| `POST` | `/api/auth/refresh-token` | Renew access token using valid refresh token | ❌ No |
| `POST` | `/api/auth/logout` | Revoke refresh token and log out | ❌ No |
| `GET` | `/api/auth/me` | Fetch active user session profile | ✅ Yes |
| `POST` | `/api/auth/change-password` | Change current user password | ✅ Yes |
| `GET` | `/api/auth/verify-email` | Verify email token | ❌ No |
| `POST` | `/api/auth/forgot-password` | Request password reset email | ❌ No |
| `POST` | `/api/auth/reset-password` | Reset password using reset token | ❌ No |

### Request & Response Examples

#### 1. Login (`POST /api/auth/login`)
```json
// Request Body
{
  "email": "superadmin@naziran.com",
  "password": "Password123"
}

// Response (200 OK)
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": {
    "id": "uuid-v4",
    "email": "superadmin@naziran.com",
    "name": "Anish Naziran",
    "role": "SUPER_ADMIN",
    "isVerified": true
  }
}
```

---

## 👥 2. Human Resources & Employee Management (`/api/employees`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/employees` | Get all employees list | ✅ Yes | All |
| `POST` | `/api/employees` | Create a new employee profile | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `HR` |
| `GET` | `/api/employees/:id` | Fetch specific employee details | ✅ Yes | All |
| `PUT` | `/api/employees/:id` | Update employee information | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `HR` |
| `DELETE` | `/api/employees/:id` | Delete or terminate employee record | ✅ Yes | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/employees/departments` | List all enterprise departments | ✅ Yes | All |
| `POST` | `/api/employees/departments` | Create new department | ✅ Yes | `SUPER_ADMIN`, `ADMIN` |
| `GET` | `/api/employees/designations` | List job designations | ✅ Yes | All |
| `POST` | `/api/employees/designations` | Create job designation | ✅ Yes | `SUPER_ADMIN`, `ADMIN` |

---

## ⏱️ 3. Attendance & Leave Operations (`/api/attendance`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/attendance/today-status` | Get today's attendance summary & employee clock statuses | ✅ Yes |
| `POST` | `/api/attendance/clock-in` | Record employee clock-in timestamp | ✅ Yes |
| `POST` | `/api/attendance/clock-out` | Record employee clock-out timestamp | ✅ Yes |
| `GET` | `/api/attendance/leaves` | List all leave requests | ✅ Yes |
| `POST` | `/api/attendance/leaves` | Submit new leave application | ✅ Yes |
| `PUT` | `/api/attendance/leaves/:id/status` | Approve or reject leave request | ✅ Yes |

---

## 💰 4. Payroll Management (`/api/payroll`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/payroll` | Fetch historical payroll records | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE` |
| `POST` | `/api/payroll/generate` | Run bulk monthly payroll calculations | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE` |
| `GET` | `/api/payroll/:id` | Get specific payslip details | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE`, Employee |
| `PUT` | `/api/payroll/:id/status` | Mark payroll status (PAID/PENDING) | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE` |

---

## 📦 5. Inventory & Supply Chain (`/api/inventory`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/inventory/products` | Fetch catalog with stock alert status | ✅ Yes |
| `POST` | `/api/inventory/products` | Add new product SKU to catalog | ✅ Yes |
| `GET` | `/api/inventory/categories` | List product categories | ✅ Yes |
| `POST` | `/api/inventory/categories` | Create product category | ✅ Yes |
| `GET` | `/api/inventory/suppliers` | List registered suppliers | ✅ Yes |
| `POST` | `/api/inventory/suppliers` | Register new supplier vendor | ✅ Yes |
| `GET` | `/api/inventory/purchase-orders` | Fetch purchase orders list | ✅ Yes |
| `POST` | `/api/inventory/purchase-orders` | Issue new purchase order | ✅ Yes |

---

## 🤝 6. Sales, Orders & Invoices (`/api/sales`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/sales/orders` | Fetch sales orders history | ✅ Yes |
| `POST` | `/api/sales/orders` | Create sales order | ✅ Yes |
| `GET` | `/api/sales/invoices` | List invoices and payment statuses | ✅ Yes |
| `POST` | `/api/sales/invoices` | Generate invoice for sales order | ✅ Yes |
| `GET` | `/api/sales/quotations` | List customer quotations | ✅ Yes |
| `POST` | `/api/sales/quotations` | Generate new quotation | ✅ Yes |

---

## 💼 7. CRM Pipeline (`/api/crm`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/crm/overview` | Fetch combined CRM metrics (Leads, Opportunities, Deals) | ✅ Yes |
| `POST` | `/api/crm/leads` | Create new customer lead | ✅ Yes |
| `PUT` | `/api/crm/leads/:id` | Update lead status/stage | ✅ Yes |
| `POST` | `/api/crm/opportunities` | Convert lead to opportunity | ✅ Yes |
| `PUT` | `/api/crm/opportunities/:id` | Update opportunity deal probability | ✅ Yes |
| `POST` | `/api/crm/deals` | Create customer deal record | ✅ Yes |
| `PUT` | `/api/crm/deals/:id` | Update deal status (WON / LOST) | ✅ Yes |

---

## 💳 8. Ledger Finance & Accounting (`/api/finance`)

| Method | Endpoint | Description | Auth Required | Allowed Roles |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/finance/transactions` | Fetch all income/expense transactions | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE` |
| `POST` | `/api/finance/transactions` | Log new manual transaction entry | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE` |
| `GET` | `/api/finance/profit-loss` | Generate dynamic P&L statement | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE` |
| `GET` | `/api/finance/balance-sheet` | Generate current balance sheet | ✅ Yes | `SUPER_ADMIN`, `ADMIN`, `FINANCE` |

---

## 🤖 9. AI Microservice & RAG Engine (`/api/ai`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/ai/chat` | Query AI ERP assistant powered by Gemini | ✅ Yes |
| `POST` | `/api/ai/screen-resume` | Analyze candidate resume against JD | ✅ Yes |
| `POST` | `/api/ai/generate-interview-questions` | Generate custom technical interview prompt | ✅ Yes |
| `POST` | `/api/ai/draft-email` | Build automated corporate communication draft | ✅ Yes |
| `POST` | `/api/ai/rag/upload` | Upload & index PDF policy document for RAG search | ✅ Yes |
| `POST` | `/api/ai/rag/query` | RAG vector search across policy documents | ✅ Yes |
| `GET` | `/api/ai/rag/documents` | List all indexed RAG documents | ✅ Yes |
| `DELETE` | `/api/ai/rag/documents/:id` | Remove document index from vector collection | ✅ Yes |

---

## 📁 10. File Storage & Upload (`/api/upload`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/upload` | Upload document or avatar file (`multipart/form-data`) | ✅ Yes |
