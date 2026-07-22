import os
from dotenv import load_dotenv

# Try to find .env in parent directories
load_dotenv()
load_dotenv(dotenv_path="../api/.env")
load_dotenv(dotenv_path="../../.env")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Nazi@localhost:5432/naziran_matrix_db")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# If GEMINI_API_KEY is not set but Google Generative AI is used, it looks for GOOGLE_API_KEY or GEMINI_API_KEY
if not os.getenv("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
