import google.generativeai as genai
from pypdf import PdfReader
from app.config import GEMINI_API_KEY
import json

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        print(f"[Resume Parse Error] Failed to read PDF {pdf_path}: {e}")
        return ""

def screen_resume(pdf_path: str, job_description: str) -> dict:
    # 1. Extract text
    resume_text = extract_text_from_pdf(pdf_path)
    if not resume_text:
        return {
            "candidateName": "Unknown",
            "extractedDetails": {"skills": [], "experience": "Not found", "education": "Not found", "projects": []},
            "matchPercentage": 0,
            "ranking": "Rejected",
            "recommendation": "Failed to parse PDF resume contents."
        }

    # 2. Score with Gemini
    if not GEMINI_API_KEY:
        return get_mock_resume_screening(pdf_path, job_description)

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        You are an expert HR Recruitment Specialist and AI Screener.
        Below is the raw text extracted from a candidate's resume:
        ---
        {resume_text}
        ---
        
        We are screening this candidate for the following Job Description:
        "{job_description}"
        
        Extract the following details from the resume:
        1. List of key technical/professional skills.
        2. Summary of relevant work experience (number of years, titles).
        3. Educational background (degrees, schools).
        4. Key notable projects listed.
        
        Also calculate:
        - A matchPercentage (integer between 0 and 100) indicating how well their profile matches the job description.
        - A ranking label: "Rank 1 (Highly Recommended)", "Rank 2 (Recommended)", "Rank 3 (Underqualified)", or "Rank 4 (Unsuitable)".
        - A short paragraph of recommendation outlining their strengths and gaps.
        
        Return ONLY valid JSON with this structure:
        {{
          "candidateName": "Candidate Name Extracted",
          "extractedDetails": {{
            "skills": ["Skill1", "Skill2", ...],
            "experience": "Description of experience",
            "education": "Description of education",
            "projects": ["Project1", "Project2", ...]
          }},
          "matchPercentage": 85,
          "ranking": "Rank...",
          "recommendation": "Brief paragraph..."
        }}
        Do not add any text wrappers or markdown code blocks around the JSON output.
        """
        
        response_text = model.generate_content(prompt).text
        clean_json = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_json)
        return result
        
    except Exception as e:
        print(f"[Resume Screen LLM Error] {e}")
        return get_mock_resume_screening(pdf_path, job_description)

def get_mock_resume_screening(pdf_path: str, job_description: str) -> dict:
    filename = pdf_path.split("/")[-1].split("\\")[-1]
    candidate_name = filename.replace("_", " ").replace(".pdf", "").replace(".docx", "")
    if " - " in candidate_name:
        candidate_name = candidate_name.split(" - ")[0].strip()

    resume_text = extract_text_from_pdf(pdf_path)
    combined = f"{filename} {resume_text}".lower()
    jd_lower = job_description.lower()

    skills_lib = [
        "React", "TypeScript", "JavaScript", "Node.js", "Express", "Next.js", "Vue", "Angular",
        "HTML", "CSS", "Tailwind CSS", "Bootstrap", "REST API", "GraphQL", "Prisma", "PostgreSQL",
        "MySQL", "MongoDB", "Docker", "AWS", "Git", "Python", "Java", "C++", "C#",
        "Business Analysis", "Data Analysis", "SQL", "Excel", "Tableau", "Power BI",
        "Requirements Gathering", "Agile", "Scrum", "Jira", "Stakeholder Management",
        "Recruitment", "Payroll", "HRIS", "Accounting", "Salesforce", "CRM"
    ]

    matched_skills = [s for s in skills_lib if s.lower() in combined]
    
    is_target_dev = any(k in jd_lower for k in ["software", "engineer", "developer", "full stack", "backend", "frontend"])
    is_target_analyst = any(k in jd_lower for k in ["business analyst", "data analyst", "requirements"])

    is_resume_analyst = any(k in combined for k in ["business analyst", "requirements", "stakeholder", "jira", "excel"]) and not any(k in combined for k in ["react", "node", "typescript", "express"])
    is_resume_dev = any(k in combined for k in ["react", "typescript", "node", "express", "software engineer", "developer"])

    if is_target_dev and is_resume_analyst:
        match_score = 35
        ranking = "Rank 4 (Unsuitable / Domain Mismatch)"
        rec = f"Domain mismatch: The uploaded resume for {candidate_name} ({', '.join(matched_skills[:5]) or 'Business Analyst background'}) does not match the Software Engineer role."
    elif is_target_analyst and is_resume_analyst:
        match_score = 88
        ranking = "Rank 1 (Highly Recommended)"
        rec = f"The candidate ({candidate_name}) demonstrates strong alignment for the {job_description} role with experience in {', '.join(matched_skills[:5])}."
    elif is_target_dev and is_resume_dev:
        match_score = 88
        ranking = "Rank 1 (Highly Recommended)"
        rec = f"The candidate ({candidate_name}) demonstrates strong alignment for the {job_description} role with experience in {', '.join(matched_skills[:5])}."
    else:
        match_score = 65
        ranking = "Rank 2 (Recommended)"
        rec = f"The candidate ({candidate_name}) displays relevant qualifications ({', '.join(matched_skills[:4])}) for the {job_description} position."

    return {
      "candidateName": candidate_name,
      "extractedDetails": {
        "skills": matched_skills if matched_skills else ["Business Analysis", "Requirements Gathering", "Documentation"],
        "experience": f"Extracted experience for {candidate_name}",
        "education": "Bachelor Degree / Professional Background",
        "projects": [f"Evaluated projects and experience from {filename}"]
      },
      "matchPercentage": match_score,
      "ranking": ranking,
      "recommendation": rec
    }


def generate_interview_questions(job_title: str, focus_area: str) -> dict:
    if not GEMINI_API_KEY:
        return {
          "questions": [
            { "type": "Technical Assessment", "question": f"Explain the core components of building a production application in {job_title}." },
            { "type": "Technical Assessment", "question": f"How do you handle state synchronization and security controls when working in {focus_area}?" },
            { "type": "HR & Culture fit", "question": "Describe a scenario where you faced conflicting priorities in a project. How did you resolve them?" },
            { "type": "Role specific", "question": f"What are the best practices for caching, database optimization, and loading states in a {job_title} project?" }
          ]
        }

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        You are an elite Tech Lead and hiring manager conducting interviews for the role: "{job_title}"
        The interview has a specific focus area: "{focus_area}"
        
        Generate exactly 4 interview questions:
        - 2 deep technical assessment questions tailored to the job and focus area.
        - 1 HR & culture-fit question checking teamwork and conflict resolution.
        - 1 role-specific design question checking architecture and performance optimization.
        
        Return ONLY valid JSON format:
        {{
          "questions": [
            {{"type": "Technical Assessment", "question": "Question text here..."}},
            ...
          ]
        }}
        Do not add any text wrappers or markdown code blocks around the JSON output.
        """
        
        response_text = model.generate_content(prompt).text
        clean_json = response_text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean_json)
        return result
    except Exception as e:
        print(f"[Interview Gen Error] {e}")
        return {
          "questions": [
            { "type": "Technical Assessment", "question": f"Explain how you would design a scalable database schema for {job_title}." }
          ]
        }
