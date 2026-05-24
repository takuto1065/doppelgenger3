import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "app.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            google_id TEXT UNIQUE NOT NULL,
            email TEXT,
            name TEXT,
            picture TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            name TEXT,
            personality TEXT,
            hobby TEXT,
            thought TEXT,
            user_values TEXT,
            tone TEXT,
            decision TEXT,
            mode TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            topic TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
        );
    """)
    conn.commit()
    conn.close()

def get_or_create_user(google_id, email, name, picture):
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
    user = c.fetchone()
    if user is None:
        c.execute(
            "INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)",
            (google_id, email, name, picture)
        )
        conn.commit()
        c.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        user = c.fetchone()
    conn.close()
    return dict(user)

def get_profile(user_id):
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM profiles WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def save_profile(user_id, data):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO profiles (user_id, name, personality, hobby, thought, user_values, tone, decision, mode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            name=excluded.name,
            personality=excluded.personality,
            hobby=excluded.hobby,
            thought=excluded.thought,
            user_values=excluded.user_values,
            tone=excluded.tone,
            decision=excluded.decision,
            mode=excluded.mode,
            updated_at=CURRENT_TIMESTAMP
    """, (
        user_id,
        data.get("name"), data.get("personality"), data.get("hobby"),
        data.get("thought"), data.get("values"), data.get("tone"),
        data.get("decision"), data.get("mode")
    ))
    conn.commit()
    conn.close()

def create_chat_session(user_id, topic):
    conn = get_conn()
    c = conn.cursor()
    c.execute("INSERT INTO chat_sessions (user_id, topic) VALUES (?, ?)", (user_id, topic))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id

def save_chat_message(session_id, role, message):
    conn = get_conn()
    c = conn.cursor()
    c.execute(
        "INSERT INTO chat_messages (session_id, role, message) VALUES (?, ?, ?)",
        (session_id, role, message)
    )
    conn.commit()
    conn.close()

def get_chat_sessions(user_id, limit=10):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT cs.id, cs.topic, cs.created_at,
               COUNT(cm.id) as message_count
        FROM chat_sessions cs
        LEFT JOIN chat_messages cm ON cm.session_id = cs.id
        WHERE cs.user_id = ?
        GROUP BY cs.id
        ORDER BY cs.created_at DESC
        LIMIT ?
    """, (user_id, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]
