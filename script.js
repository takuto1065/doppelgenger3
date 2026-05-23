/* =========================
   APIキー取得
========================= */
let GEMINI_API_KEY = "";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/key");
    const data = await res.json();
    GEMINI_API_KEY = data.apiKey;

    console.log("APIキー取得OK");
  } catch (err) {
    console.error("APIキー取得失敗", err);
  }

  // Enter送信
  const input = document.getElementById("followupInput");
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        sendFollowup();
      }
    });
  }
});

/* =========================
   状態
========================= */
let currentProfile = null;
let conversationHistory = [];
let isSummoned = false;

const loadingMessages = [
  "人格解析中...",
  "思考を読み取り中...",
  "価値観コピー中...",
  "分身生成中...",
  "議論準備中..."
];

/* =========================
   入力取得
========================= */
function getValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function createProfile() {
  return {
    name: getValue("nameInput"),
    personality: getValue("personalityInput"),
    hobby: getValue("hobbyInput"),
    thought: getValue("thoughtInput"),
    values: getValue("valuesInput"),
    tone: getValue("toneInput") || "やさしい口調",
    decision: getValue("decisionInput") || "納得感重視",
    mode: getValue("modeInput") || "共感モード",
    topic: getValue("topicInput")
  };
}

/* =========================
   チャットUI
========================= */
function addMessage(text, type) {
  const area = document.getElementById("chatArea");

  const div = document.createElement("div");
  div.className = `chat-message ${type}`;
  div.textContent = text;

  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function typeMessage(text, type) {
  return new Promise((resolve) => {
    const area = document.getElementById("chatArea");

    const div = document.createElement("div");
    div.className = `chat-message ${type}`;
    area.appendChild(div);

    let i = 0;

    const timer = setInterval(() => {
      div.textContent += text.charAt(i);
      i++;

      area.scrollTop = area.scrollHeight;

      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, 15);
  });
}

/* =========================
   Gemini呼び出し
========================= */
async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error("API key not ready");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error("API error");
  }

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "応答を取得できませんでした"
  );
}

/* =========================
   プロンプト
========================= */
function buildPrompt(profile, userMsg) {
  return `
あなたはユーザー本人の分身AIです。

【プロフィール】
性格:${profile.personality}
価値観:${profile.values}
考え方:${profile.thought}

【テーマ】
${profile.topic}

【発言】
${userMsg}

自然に会話してください。
`;
}

/* =========================
   召喚
========================= */
async function summonAI() {
  const profile = createProfile();

  if (!profile.topic) {
    alert("テーマ入れて");
    return;
  }

  currentProfile = profile;
  isSummoned = true;
  conversationHistory = [];

  document.getElementById("chatArea").innerHTML = "";

  addMessage(profile.topic, "user-msg");
  addMessage("分身を召喚中...", "system-msg");

  let reply = "";

  try {
    reply = await callGemini(buildPrompt(profile, profile.topic));
  } catch {
    reply = "現在AIが混み合っています";
  }

  await typeMessage(reply, "ai-msg");

  conversationHistory.push({ role: "user", text: profile.topic });
  conversationHistory.push({ role: "ai", text: reply });
}

/* =========================
   追加入力
========================= */
async function sendFollowup() {
  if (!isSummoned) {
    alert("先に召喚して");
    return;
  }

  const input = document.getElementById("followupInput");
  const msg = input.value.trim();

  if (!msg) return;

  input.value = "";

  addMessage(msg, "user-msg");

  let reply = "";

  try {
    reply = await callGemini(buildPrompt(currentProfile, msg));
  } catch {
    reply = "応答失敗";
  }

  await typeMessage(reply, "ai-msg");
}