const loadingMessages = [
  "人格解析中…",
  "思考パターンを読み取り中…",
  "価値観をコピー中…",
  "分身の口調を調整中…",
  "議論準備中…"
];
const roastNames = [
  "🕊️ 平和",
  "🙂 普通",
  "🔥 白熱",
  "☢️ 修羅場"
];

function updateRoastLabel() {
  const slider = document.getElementById("roastSlider");
  const label = document.getElementById("roastLabel");

  if (!slider || !label) return;

  label.textContent = roastNames[Number(slider.value)];
}

let currentProfile = null;
let conversationHistory = [];
let isSummoned = false;

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function setTopic(topic) {
  const topicInput = document.getElementById("topicInput");

  if (topicInput) {
    topicInput.value = topic;
    topicInput.focus();
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMessage(text, type) {
  const chatArea = document.getElementById("chatArea");

  const emptyState = chatArea.querySelector(".empty-state");
  if (emptyState) {
    emptyState.remove();
  }

  const div = document.createElement("div");
  div.className = `chat-message ${type}`;
  div.textContent = text;

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function typeMessage(text, type) {
  return new Promise((resolve) => {
    const chatArea = document.getElementById("chatArea");

    const emptyState = chatArea.querySelector(".empty-state");
    if (emptyState) {
      emptyState.remove();
    }

    const div = document.createElement("div");
    div.className = `chat-message ${type}`;
    chatArea.appendChild(div);

    let index = 0;

    const timer = setInterval(() => {
      div.textContent += text.charAt(index);
      index++;

      chatArea.scrollTop = chatArea.scrollHeight;

      if (index >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, 14);
  });
}

function setChatInputEnabled(enabled) {
  const followupInput = document.getElementById("followupInput");
  const sendButton = document.getElementById("sendButton");

  if (followupInput) {
    followupInput.disabled = !enabled;
  }

  if (sendButton) {
    sendButton.disabled = !enabled;
  }
}

function setAutoDebateEnabled(enabled) {
  const autoDebateButton = document.getElementById("autoDebateButton");

  if (autoDebateButton) {
    autoDebateButton.disabled = !enabled;
  }
}

function createProfileFromInputs() {
  return {
    name: getValue("nameInput"),
    personality: getValue("personalityInput"),
    hobby: getValue("hobbyInput"),
    thought: getValue("thoughtInput"),
    values: getValue("valuesInput"),
    tone: getValue("toneInput") || "やさしく落ち着いた口調",
    decision: getValue("decisionInput") || "自分の気持ちと納得感を大事にして判断する",
    mode: getValue("modeInput") || "共感しながら一緒に考える",
    topic: getValue("topicInput"),
    roastLevel: Number(document.getElementById("roastSlider")?.value || 1)
  };
}

function updateAvatarCard(profile) {
  const avatarName = document.getElementById("avatarName");
  const avatarMeta = document.getElementById("avatarMeta");

  const displayName = profile.name || "あなた";
  const alterName = `${displayName} Mirror`;

  if (avatarName) avatarName.textContent = alterName;
  if (avatarMeta) avatarMeta.textContent = `${profile.tone} / ${profile.mode} / ${profile.decision}`;
}

function createSystemPrompt(profile) {
  return `
あなたは、ユーザー本人の人格を再現したAI分身です。

以下のプロフィールをもとに、本人らしい価値観・話し方・判断基準で会話してください。

【プロフィール】
名前: ${profile.name || "未入力"}
性格: ${profile.personality || "未入力"}
趣味: ${profile.hobby || "未入力"}
考え方: ${profile.thought || "未入力"}
大事にしている価値観: ${profile.values || "未入力"}
話し方: ${profile.tone}
判断スタイル: ${profile.decision}
分身モード: ${profile.mode}

【最初の議論テーマ】
${profile.topic}

【ルール】
・あなたは一般的なAIではなく、ユーザーの分身として話す
・過去の会話の流れを踏まえて返答する
・ユーザーの性格、価値観、趣味、考え方を自然に反映する
・話し方は「${profile.tone}」に合わせる
・分身モード「${profile.mode}」に合わせる
・長すぎず、会話として自然に返す
・必要なら共感、反論、整理、提案を行う
・最後に、次に考えるとよさそうな問いを1つ添える
`;
}

function buildConversationPrompt(profile, latestUserMessage) {
  const historyText = conversationHistory
    .map((message) => {
      const speaker = message.role === "user" ? "ユーザー" : "AI分身";
      return `${speaker}: ${message.text}`;
    })
    .join("\n");

  return `
${createSystemPrompt(profile)}

【これまでの会話】
${historyText || "まだ会話はありません。"}

【今回のユーザー発言】
ユーザー: ${latestUserMessage}

上記を踏まえて、AI分身として自然に返答してください。
`;
}

function createAutoDebatePrompt(profile) {
  return `
あなたは議論シミュレーターです。

以下の2人を登場させて、テーマについて議論させてください。

【登場人物1：議論AI】
役割:
・一般的なAIとして、客観的・論理的な意見を出す
・必要に応じて質問や反論をする
・中立的な視点を持つ

【登場人物2：${profile.name || "ユーザー"} Mirror】
役割:
・ユーザー本人の人格を再現したAI分身
・ユーザー本人の代わりに議論する

【分身プロフィール】
名前: ${profile.name || "未入力"}
性格: ${profile.personality || "未入力"}
趣味: ${profile.hobby || "未入力"}
考え方: ${profile.thought || "未入力"}
大事にしている価値観: ${profile.values || "未入力"}
話し方: ${profile.tone}
判断スタイル: ${profile.decision}
分身モード: ${profile.mode}

【議論テーマ】
${profile.topic}
【煽りレベル】
${roastNames[profile.roastLevel]}

■煽りレベル詳細

0: 🕊️ 平和
・煽りは禁止
・互いを尊重しながら議論する
・反論しても丁寧に行う

1: 🙂 普通
・軽い皮肉やツッコミは可
・基本は落ち着いた議論
・挑発は最小限

2: 🔥 白熱
・優勢時はやや強めの煽り可
・論理的な反論を積極的に行う
・相手の矛盾を鋭く指摘してよい

3: ☢️ 修羅場
・かなり挑発的な議論を許可
・皮肉や強い論破表現を使用してよい
・ただし人格否定、暴言、差別表現は禁止
・必ず論理的根拠を伴うこと

【議論ルール】
・議論AIと${profile.name || "ユーザー"} Mirrorが交互に話す
・4〜6ターン程度で議論する
・${profile.name || "ユーザー"} Mirrorは、本人の性格・価値観・趣味・考え方を反映して話す
・議論AIは、一般論や別視点から質問・反論する
・最後に短くまとめを入れる
・出力は必ず次の形式にする

議論AI: 〇〇
分身AI: 〇〇
議論AI: 〇〇
分身AI: 〇〇
まとめ: 〇〇

【感情・煽りルール】

・議論が進み、どちらかが優勢だと判断した場合のみ、軽い煽り表現を使用してよい
・煽りは議論の補助であり目的ではない（必ず論理とセット）
・煽りは短く（1〜2文以内）

■煽りの種類(これは使用可能な例であって、必ずしもそのまま使う必要はない)
① 理解力系
- 「それ今の説明で理解できてない？」
- 「ちょっと前提からズレてるかもね」

② 常識圧系
- 「普通に考えたらそうはならないよ」
- 「そこは常識的に厳しいと思う」

③ 打ち切り系
- 「もうその時点で結論出てる気がするけど」
- 「それ以上広げても変わらなさそう」

④ 皮肉系（推奨）
- 「その世界観で考えるとそうなるのか」
- 「かなり都合よく解釈してるね」
- 「自信あるのはいいけど少し危ういよね」

■禁止
・人格否定
・暴言
・差別表現
・議論の放棄
・煽りのみで終わる発言
`;
}

/* ─────────────────────────────────────────────────────────
   🛠️ 綺麗に修復・最適化した API呼び出し関数
   フロントに生のキーを置かず、Pythonサーバー(5000番)にお願いする構造に直しました
   ───────────────────────────────────────────────────────── */
async function callGemini(prompt) {
  try {
    // あなたが起動する Python (Flask) サーバーのURLにリクエストを投げます
    const response = await fetch("http://127.0.0.1:5000/api/summon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
      throw new Error(`サーバーエラー: ${response.status}`);
    }

    const data = await response.json();
    
    // Python側から返ってきたテキスト（AIの回答）を返却
    return data.reply;

  } catch (error) {
    console.error("通信エラーが発生しました:", error);
    throw error;
  }
}

/* ─────────────────────────────────────────────────────────
   ✨ 初回召喚用のメイン関数を追加（HTMLのボタン連動用）
   ───────────────────────────────────────────────────────── */
async function summonAI() {
  const summonButton = document.getElementById("summonButton");
  const chatArea = document.getElementById("chatArea");
  const resultArea = document.getElementById("resultArea");

  if (summonButton) {
    summonButton.disabled = true;
    summonButton.innerText = "分身を解析・召喚中...";
  }

  // プロフィールの読み込み
  currentProfile = createProfileFromInputs();
  updateAvatarCard(currentProfile);

  if (!currentProfile.topic) {
    alert("議論テーマを入力してください！");
    if (summonButton) {
      summonButton.disabled = false;
      summonButton.innerText = "分身を召喚";
    }
    return;
  }

  // 1個ずつローディングメッセージをチャット欄に出す演出
  for (const msg of loadingMessages) {
    chatArea.innerHTML = `<p style="color: #a090a8; text-align: center;">${msg}</p><div class="loader"></div>`;
    await new Promise(r => setTimeout(r, 600)); // 少し待つ
  }

  try {
    // 最初のシステムプロンプトを構築してPython経由でGeminiに投げる
    const basePrompt = createSystemPrompt(currentProfile);
    const reply = await callGemini(basePrompt);

    isSummoned = true;
    conversationHistory = [{ role: "assistant", text: reply }];

    // チャット画面の初期化と最初のメッセージ表示
    chatArea.innerHTML = "";
    await typeMessage(reply, "ai-msg");

    if (resultArea) {
      resultArea.innerHTML = `
        <h3>議論開始</h3>
        <p>テーマ: ${escapeHtml(currentProfile.topic)}</p>
        <p>${escapeHtml(currentProfile.name || "あなた")} の分身の召喚に成功しました。追従チャット、または自動議論を開始できます。</p>
      `;
    }

    setChatInputEnabled(true);
    setAutoDebateEnabled(true);

  } catch (error) {
    chatArea.innerHTML = `<p style="color: red;">召喚エラー: バックエンドサーバーが起動していないか、APIキーに問題があります。</p>`;
    if (summonButton) summonButton.disabled = false;
  }

  if (summonButton) {
    summonButton.innerText = "もう一度召喚する";
    summonButton.disabled = false;
  }
}

async function sendFollowup() {
  if (!isSummoned || !currentProfile) {
    alert("先に分身を召喚してください！");
    return;
  }

  const followupInput = document.getElementById("followupInput");
  const loadingText = document.getElementById("loadingText");
  const sendButton = document.getElementById("sendButton");

  const userMessage = followupInput.value.trim();

  if (!userMessage) {
    alert("メッセージを入力してください！");
    return;
  }

  followupInput.value = "";
  followupInput.disabled = true;
  sendButton.disabled = true;

  addMessage(userMessage, "user-msg");

  conversationHistory.push({
    role: "user",
    text: userMessage
  });

  if (loadingText) loadingText.textContent = "AI分身が考え中…";

  let reply = "";

  try {
    const prompt = buildConversationPrompt(currentProfile, userMessage);
    reply = await callGemini(prompt);
  } catch (error) {
    console.error(error);
    reply = "申し訳ありません、接続エラーにより思考が中断されました。Pythonサーバーの状態を確認してください。";
  }

  if (loadingText) loadingText.textContent = "";

  await typeMessage(reply, "ai-msg");

  conversationHistory.push({
    role: "assistant",
    text: reply
  });

  // フォールバックやサマリー表示関数がない場合の安全対策
  const resultArea = document.getElementById("resultArea");
  if (resultArea) {
    resultArea.innerHTML = `<h3>議論継続中</h3><p>対話回数: ${conversationHistory.length}回</p>`;
  }

  followupInput.disabled = false;
  sendButton.disabled = false;
  followupInput.focus();
}

async function startAutoDebate() {
  if (!isSummoned || !currentProfile) {
    alert("先に分身を召喚してください！");
    return;
  }

  const autoDebateButton = document.getElementById("autoDebateButton");
  const loadingText = document.getElementById("loadingText");

  if (autoDebateButton) autoDebateButton.disabled = true;
  if (loadingText) loadingText.textContent = "AI同士が議論中…";

  addMessage("議論AIと分身AIの自動議論を開始します。", "system-msg");

  let debateText = "";

  try {
    const prompt = createAutoDebatePrompt(currentProfile);
    debateText = await callGemini(prompt);
  } catch (error) {
    console.error(error);
    debateText = "議論AI: 申し訳ありません、自動議論の生成中にエラーが発生しました。\n分身AI: サーバーの通信を確認する必要がありそうです。";
  }

  if (loadingText) loadingText.textContent = "";

  // 簡易的に改行や発言ごとに分ける簡易スプリッター
  const lines = debateText.split("\n").filter(l => l.trim() !== "");
  for (const line of lines) {
    if (line.startsWith("議論AI:")) {
      await typeMessage(line, "opponent-msg");
    } else if (line.startsWith("分身AI:") || line.startsWith("分身:")) {
      await typeMessage(line, "ai-msg");
    } else {
      await typeMessage(line, "system-msg");
    }
  }

  conversationHistory.push({
    role: "assistant",
    text: debateText
  });

  autoDebateButton.disabled = false;
}

document.addEventListener("DOMContentLoaded", () => {

  const followupInput = document.getElementById("followupInput");

  if (followupInput) {
    followupInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendFollowup();
      }
    });
  }

  const roastSlider = document.getElementById("roastSlider");

  if (roastSlider) {
    roastSlider.addEventListener("input", updateRoastLabel);
    updateRoastLabel();
  }

});