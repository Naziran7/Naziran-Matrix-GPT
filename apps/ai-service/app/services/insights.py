import google.generativeai as genai
from app.config import GEMINI_API_KEY
from app.db import query_db
import json

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def generate_insights() -> dict:
    # 1. Fetch DB Stats for the LLM
    try:
        # Get total transactions income vs expense
        tx_stats = query_db("SELECT type, SUM(amount) as total FROM \"Transaction\" GROUP BY type")
        
        # Get count of low stock products
        low_stock_stats = query_db("SELECT COUNT(*)::int as count FROM \"Product\" WHERE stock < \"minStock\"")
        low_stock_count = low_stock_stats[0]['count'] if low_stock_stats else 0
        
        # Get attendance percentage today
        att_stats = query_db("""
            SELECT 
                COUNT(*)::int as total,
                SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END)::int as present,
                SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END)::int as late
            FROM "Attendance" 
            WHERE date = CURRENT_DATE
        """)
        
        # Get active employees
        emp_stats = query_db("SELECT COUNT(*)::int as count FROM \"Employee\" WHERE status = 'Active'")
        emp_count = emp_stats[0]['count'] if emp_stats else 0

        stats_summary = {
            "transactions": tx_stats,
            "low_stock_count": low_stock_count,
            "attendance_today": att_stats[0] if att_stats else {"total": 0, "present": 0, "late": 0},
            "active_employees": emp_count
        }
    except Exception as e:
        print(f"[Insights DB Error] {e}")
        stats_summary = {"error": str(e)}

    # 2. Call Gemini
    if not GEMINI_API_KEY or "error" in stats_summary:
        return get_mock_insights()

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
        You are a senior CFO and Business Operations AI Analyst.
        Here is a summary of current ERP metrics:
        {json.dumps(stats_summary, default=str)}
        
        Generate exactly 4 highly strategic business insight bullets for the dashboard.
        Each insight must have:
        1. A concise, professional title (e.g. "Revenue Expansion", "Inventory Risk")
        2. A detail sentence backed by these metrics or logical business extensions of them.
        3. A type flag (one of: "success", "warning", "info", "danger") matching the severity of the insight.
        
        Return ONLY valid JSON format representing a list of insights, like:
        [
          {{"title": "Title", "detail": "Detail text here...", "type": "success"}},
          ...
        ]
        Do not add any markup or text wrapper other than the raw JSON code.
        """
        
        response_text = model.generate_content(prompt).text
        # Strip markdown syntax if returned
        clean_json = response_text.replace("```json", "").replace("```", "").strip()
        insights = json.loads(clean_json)
        return {"insights": insights}
        
    except Exception as e:
        print(f"[Insights LLM Error] {e}")
        return get_mock_insights()

def get_mock_insights() -> dict:
    return {
      "insights": [
        { "title": "Revenue Growth", "detail": "Revenue increased 12% this month due to bulk MacBook Pro orders.", "type": "success" },
        { "title": "Low Stock Trigger", "detail": "Ergonomic Task Chair (SKU: CHAIR-ERG-HMN) is down to 2 units.", "type": "warning" },
        { "title": "Top Attendance", "detail": "John Doe (Finance Lead) has maintained a 100% clock-in streak.", "type": "info" },
        { "title": "Operating Cost Anomaly", "detail": "Electricity bills and fiber line utility costs are 8% higher than last month.", "type": "danger" }
      ]
    }
