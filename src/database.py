import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def init_db():
    pass


def get_or_create_user(google_id, email, name, picture):
    response = supabase.table("users").select("*").eq("google_id", google_id).execute()
    if response.data:
        return response.data[0]
    new_user = {"google_id": google_id, "email": email, "name": name, "picture": picture}
    response = supabase.table("users").insert(new_user).execute()
    return response.data[0]


def get_profile(user_id):
    response = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
    return response.data[0] if response.data else None


def save_profile(user_id, data):
    existing = supabase.table("profiles").select("id").eq("user_id", user_id).execute()
    profile_data = {
        "user_id": user_id,
        "name": data.get("name"),
        "personality": data.get("personality"),
        "hobby": data.get("hobby"),
        "thought": data.get("thought"),
        "user_values": data.get("values"),
        "tone": data.get("tone"),
        "decision": data.get("decision"),
        "mode": data.get("mode"),
    }
    if existing.data:
        supabase.table("profiles").update(profile_data).eq("user_id", user_id).execute()
    else:
        supabase.table("profiles").insert(profile_data).execute()


def create_chat_session(user_id, topic):
    response = supabase.table("chat_sessions").insert({"user_id": user_id, "topic": topic}).execute()
    return response.data[0]["id"]


def save_chat_message(session_id, role, message):
    supabase.table("chat_messages").insert({"session_id": session_id, "role": role, "message": message}).execute()


def get_chat_sessions(user_id, limit=10):
    response = (
        supabase.table("chat_sessions")
        .select("id, topic, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return response.data
