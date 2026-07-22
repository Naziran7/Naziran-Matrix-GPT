import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import DATABASE_URL
import urllib.parse as urlparse

def get_db_connection():
    # Parse the DATABASE_URL to avoid connection string format issues in python
    url = urlparse.urlparse(DATABASE_URL)
    dbname = url.path[1:]
    user = url.username
    password = url.password
    host = url.hostname
    port = url.port
    
    return psycopg2.connect(
        dbname=dbname,
        user=user,
        password=password,
        host=host,
        port=port
    )

def query_db(query: str, params: tuple = None) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if cur.description:
                return cur.fetchall()
            conn.commit()
            return []
    except Exception as e:
        print(f"[DB Error] Failed executing: {query}. Error: {e}")
        return []
    finally:
        conn.close()
