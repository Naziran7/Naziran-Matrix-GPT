from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import shutil
from pydantic import BaseModel

from app.services.assistant import ask_assistant
from app.services.insights import generate_insights
from app.services.resume import screen_resume, generate_interview_questions
from app.services.rag import index_document, query_rag_chat
from app.services.analytics import analyze_expenses, forecast_sales, analyze_employees
from app.services.email import generate_email_draft

app = FastAPI(title="Naziran ERP AI Microservice", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp storage for parsing PDFs
TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp_uploads")
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR, exist_ok=True)

# Pydantic Schemas for JSON endpoints
class AssistantRequest(BaseModel):
    prompt: str

class DocumentChatRequest(BaseModel):
    prompt: str

class EmailGenRequest(BaseModel):
    type: str
    details: str

class InterviewGenRequest(BaseModel):
    jobTitle: str
    focusArea: str

@app.get("/")
def read_root():
    return {"status": "online", "service": "Naziran ERP AI Service"}

@app.post("/ai/assistant")
async def assistant_endpoint(payload: AssistantRequest):
    return ask_assistant(payload.prompt)

@app.get("/ai/insights")
async def insights_endpoint():
    return generate_insights()

@app.post("/ai/resume-screener")
async def resume_screener_endpoint(
    file: UploadFile = File(...),
    jobDescription: str = Form(...)
):
    try:
        # Save file to temp path
        file_path = os.path.join(TEMP_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        result = screen_resume(file_path, jobDescription)
        
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to screen resume: {str(e)}")

@app.post("/ai/interview-gen")
async def interview_gen_endpoint(payload: InterviewGenRequest):
    return generate_interview_questions(payload.jobTitle, payload.focusArea)

@app.post("/ai/upload-document")
async def upload_document_endpoint(
    file: UploadFile = File(...),
    category: str = Form("POLICY")
):
    try:
        file_path = os.path.join(TEMP_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        success = index_document(file_path, category)
        
        if os.path.exists(file_path):
            os.remove(file_path)
            
        if not success:
            raise HTTPException(status_code=400, detail="Failed to parse document text.")
            
        return {"success": True, "message": f"Successfully indexed {file.filename} into RAG database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index document: {str(e)}")

@app.post("/ai/document-chat")
async def document_chat_endpoint(payload: DocumentChatRequest):
    return query_rag_chat(payload.prompt)

@app.post("/ai/email-generator")
async def email_generator_endpoint(payload: EmailGenRequest):
    return generate_email_draft(payload.type, payload.details)

@app.get("/ai/expense-analyzer")
async def expense_analyzer_endpoint():
    return analyze_expenses()

@app.get("/ai/sales-forecast")
async def sales_forecast_endpoint():
    return forecast_sales()

@app.get("/ai/employee-analytics")
async def employee_analytics_endpoint():
    return analyze_employees()
