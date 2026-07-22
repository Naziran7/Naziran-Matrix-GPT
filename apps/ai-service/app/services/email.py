import google.generativeai as genai
from app.config import GEMINI_API_KEY

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def generate_email_draft(email_type: str, details: str) -> dict:
    if not GEMINI_API_KEY:
        return get_mock_email_draft(email_type, details)

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        You are a corporate AI communications manager.
        Draft a highly professional, well-formatted email template of type: "{email_type}"
        incorporating these specific input details:
        "{details}"
        
        The draft must have:
        1. A clear Subject line.
        2. A structured email body (Salutation, Body, Signature/Sign-off).
        Use standard placeholders where details are missing.
        
        Return ONLY valid JSON format:
        {{
          "subject": "Subject Line Here",
          "body": "Email body content here..."
        }}
        Do not add any text wrappers or markdown code blocks around the JSON output.
        """
        
        response_text = model.generate_content(prompt).text
        # Clean markdown wrappers
        clean_json = response_text.replace("```json", "").replace("```", "").strip()
        import json
        return json.loads(clean_json)
        
    except Exception as e:
        print(f"[Email Gen Error] {e}")
        return get_mock_email_draft(email_type, details)

def get_mock_email_draft(email_type: str, details: str) -> dict:
    return {
        "subject": f"Update: {email_type} Notification",
        "body": f"Dear recipient,\n\nRegarding the request for '{email_type}':\n\n{details if details else 'The requested process has been successfully verified in the Naziran ERP database.'}\n\nPlease reach out to Administration if you have any questions.\n\nBest regards,\nERP Admin Desk"
    }
