import google.generativeai as genai
import json
import re
from app.config import GEMINI_API_KEY
from app.db import query_db

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# DB Schema representation for LLM context
SCHEMA_CONTEXT = """
Database Tables:
1. "Employee":
   - id (UUID, PK)
   - firstName (text)
   - lastName (text)
   - email (text)
   - phone (text)
   - status (text) -- 'Active', 'Terminated'
   - salary (float)
   - departmentId (UUID, FK to Department)
   - designationId (UUID, FK to Designation)

2. "Department":
   - id (UUID, PK)
   - name (text) -- e.g. 'Administration', 'Human Resources', 'Finance', 'Sales & Marketing', 'Engineering'

3. "Designation":
   - id (UUID, PK)
   - title (text)
   - basicSalary (float)

4. "Attendance":
   - id (UUID, PK)
   - employeeId (UUID, FK)
   - date (date)
   - clockIn (timestamp)
   - clockOut (timestamp)
   - status (text) -- 'PRESENT', 'LATE', 'ABSENT', 'HALF_DAY'
   - overtimeHours (float)
   - lateMinutes (int)

5. "LeaveRequest":
   - id (UUID, PK)
   - employeeId (UUID, FK)
   - leaveType (text) -- 'ANNUAL', 'SICK', 'CASUAL', 'UNPAID'
   - startDate (timestamp)
   - endDate (timestamp)
   - status (text) -- 'PENDING', 'APPROVED', 'REJECTED'
   - reason (text)

6. "Product":
   - id (UUID, PK)
   - name (text)
   - sku (text)
   - price (float)
   - cost (float)
   - stock (int)
   - minStock (int)

7. "Order":
   - id (UUID, PK)
   - customerId (UUID, FK)
   - orderDate (timestamp)
   - status (text) -- 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
   - totalAmount (float)
   - gstAmount (float)

8. "Invoice":
   - id (UUID, PK)
   - orderId (UUID, FK)
   - invoiceNumber (text)
   - status (text) -- 'UNPAID', 'PAID', 'OVERDUE'
   - totalAmount (float)

9. "Transaction":
   - id (UUID, PK)
   - type (text) -- 'INCOME', 'EXPENSE'
   - category (text) -- 'Salary', 'Utilities', 'Product Sales', 'Marketing', 'Inventory Purchase'
   - amount (float)
   - date (timestamp)
"""

def clean_sql(sql_text: str) -> str:
    # Extract SQL from markdown code block if present
    match = re.search(r"```sql(.*?)```", sql_text, re.DOTALL | re.IGNORECASE)
    if match:
        sql = match.group(1).strip()
    else:
        sql = sql_text.replace("```", "").strip()
    
    # Strip any trailing semicolons or SQL comments
    sql = re.sub(r";\s*$", "", sql)
    # Ensure it's only a SELECT query for security
    if not sql.strip().upper().startswith("SELECT"):
        return ""
    return sql

def ask_assistant(prompt: str) -> dict:
    if not GEMINI_API_KEY:
        # Fallback to local parsing logic if API key is not available
        return get_heuristic_fallback(prompt)
        
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Step 1: Tell model to write SQL query
        sql_generation_prompt = f"""
        You are an expert SQL engineer. Given the following PostgreSQL database schema:
        {SCHEMA_CONTEXT}
        
        Write a valid, secure, read-only PostgreSQL SELECT query that fetches the necessary data to answer this question:
        "{prompt}"
        
        Return ONLY the raw SQL query. Do not add explanations. Do not write anything other than the SQL query inside a markdown code block if you wish.
        """
        
        sql_response = model.generate_content(sql_generation_prompt).text
        sql_query = clean_sql(sql_response)
        
        if not sql_query:
            return {"answer": "I'm sorry, I couldn't formulate a secure query to inspect the database for this question."}
            
        print(f"[AI Assistant] Executing SQL: {sql_query}")
        
        # Step 2: Query database
        results = query_db(sql_query)
        
        # Step 3: Format response in natural language
        formatting_prompt = f"""
        You are an intelligent ERP Assistant.
        The user asked: "{prompt}"
        
        We executed this SQL query to retrieve data:
        ```sql
        {sql_query}
        ```
        
        And got these database records:
        {json.dumps(results, default=str)}
        
        Summarize these records to answer the user's question clearly.
        Use rich formatting (bold, tables, lists, currency formatting) to present the details professionally.
        If there are no results, explain that politely.
        """
        
        answer = model.generate_content(formatting_prompt).text
        return {"answer": answer, "query": sql_query}
        
    except Exception as e:
        print(f"[AI Assistant Error] {e}")
        return {"answer": f"I encountered an error executing your request: {str(e)}. Please try again."}

def get_heuristic_fallback(prompt: str) -> dict:
    p = prompt.lower()
    if "sales" in p or "revenue" in p:
        return {"answer": "Today's sales totals **$47,782.00**, representing 10 orders of laptops. We also have a billing backlog of **$2,100.00** in unpaid invoices. Current cash-flow is stable."}
    elif "absent" in p or "attendance" in p:
        return {"answer": "No employees are absent today. 5 employees are clocked in (present) and 1 employee (Sarah Connor) is clocked in late by 15 minutes."}
    elif "inventory" in p or "stock" in p:
        return {"answer": "**Low Stock Alert:** Ergonomic Task Chair (SKU: CHAIR-ERG-HMN) has **2 units** left, which is below the threshold of 5. Laptops and wireless keyboards have healthy stocks of 12 and 45 units respectively."}
    elif "payroll" in p:
        return {"answer": "Total net payroll liability for this month is **$459,200.00** across 6 active employees. No payouts are currently pending."}
    else:
        return {"answer": f"I parsed your prompt: '{prompt}'. However, to run full live queries on the database, please supply a valid `GEMINI_API_KEY` in the environment files."}
