import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify, session, redirect, url_for, send_from_directory
from flask_cors import CORS
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from authlib.integrations.flask_client import OAuth
from google import genai
from dotenv import load_dotenv
from database import init_db, get_or_create_user, get_profile, save_profile, create_chat_session, save_chat_message, get_chat_sessions

dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path, override=True)

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), ".."))
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")
CORS(app, supports_credentials=True)

login_manager = LoginManager(app)
oauth = OAuth(app)

google_oauth = oauth.register(
    name="google",
    client_id=os.environ.get("GOOGLE_CLIENT_ID"),
    client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

init_db()


class User(UserMixin):
    def __init__(self, user_dict):
        self.id = user_dict["id"]
        self.google_id = user_dict["google_id"]
        self.email = user_dict["email"]
        self.name = user_dict["name"]
        self.picture = user_dict["picture"]


@login_manager.user_loader
def load_user(user_id):
    from database import get_conn
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return User(dict(row)) if row else None


# --- 静的ファイル配信 ---

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


# --- Google OAuth ---

@app.route("/auth/login")
def auth_login():
    redirect_uri = url_for("auth_callback", _external=True)
    return google_oauth.authorize_redirect(redirect_uri)

@app.route("/auth/callback")
def auth_callback():
    token = google_oauth.authorize_access_token()
    userinfo = token.get("userinfo")
    user_dict = get_or_create_user(
        google_id=userinfo["sub"],
        email=userinfo.get("email"),
        name=userinfo.get("name"),
        picture=userinfo.get("picture"),
    )
    user = User(user_dict)
    login_user(user)
    return redirect("/")

@app.route("/auth/logout")
def auth_logout():
    logout_user()
    return redirect("/")

@app.route("/api/me")
def api_me():
    if current_user.is_authenticated:
        return jsonify({
            "logged_in": True,
            "name": current_user.name,
            "email": current_user.email,
            "picture": current_user.picture,
        })
    return jsonify({"logged_in": False})


# --- プロフィール ---

@app.route("/api/profile", methods=["GET"])
@login_required
def api_get_profile():
    profile = get_profile(current_user.id)
    return jsonify(profile or {})

@app.route("/api/profile", methods=["POST"])
@login_required
def api_save_profile():
    data = request.get_json()
    save_profile(current_user.id, data)
    return jsonify({"ok": True})


# --- チャット履歴 ---

@app.route("/api/history", methods=["GET"])
@login_required
def api_get_history():
    sessions = get_chat_sessions(current_user.id)
    return jsonify(sessions)

@app.route("/api/history", methods=["POST"])
@login_required
def api_save_history():
    data = request.get_json()
    topic = data.get("topic", "")
    messages = data.get("messages", [])
    session_id = create_chat_session(current_user.id, topic)
    for msg in messages:
        save_chat_message(session_id, msg["role"], msg["text"])
    return jsonify({"ok": True, "session_id": session_id})


# --- Gemini API ---

@app.route("/api/summon", methods=["POST"])
def summon():
    data = request.get_json()
    prompt = data.get("prompt", "")
    if not prompt:
        return jsonify({"error": "promptが空です"}), 400
    response = gemini_client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )
    return jsonify({"reply": response.text})


if __name__ == "__main__":
    app.run(port=5001, debug=True)
