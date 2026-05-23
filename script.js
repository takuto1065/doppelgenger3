const loadingMessages = [
  "人格解析中…",
  "思考パターンを読み取り中…",
  "価値観をコピー中…",
  "分身の口調を調整中…",
  "議論準備中…"
];

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
    topic: getValue("topicInput")
  };
}

function updateAvatarCard(profile) {
  const avatarName = document.getElementById("avatarName");
  const avatarMeta = document.getElementById("avatarMeta");

  const displayName = profile.name || "あなた";
  const alterName = `${displayName} Mirror`;

  avatarName.textContent = alterName;
  avatarMeta.textContent = `${profile.tone} / ${profile.mode} / ${profile.decision}`;
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
`;
}

async function callGemini(prompt) {
  const apiKey = "AIzaSyA503U0sJa8CNIiTWJGT2mGy_C8kPtVZWg";

  if (!apiKey || apiKey === "AIzaSyA503U0sJa8CNIiTWJGT2mGy_C8kPtVZWg") {
    throw new Error("API key is not set");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  if (
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    data.candidates[0].content.parts &&
    data.candidates[0].content.parts[0] &&
    data.candidates[0].content.parts[0].text
  ) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error("AI response format error");
}

function createFallbackReply(profile, latestUserMessage) {
  return `
APIが混み合っているため、仮のAI分身として答えるね。

「${latestUserMessage}」について考えるなら、${profile.name || "あなた"}らしく
“自分が納得できるか”を大事にして進めるのが良さそう。

性格が「${profile.personality || "未入力"}」で、
趣味が「${profile.hobby || "未入力"}」なら、
楽しく続けられるか、無理しすぎていないかも大事な判断材料になりそう。

考え方が「${profile.thought || "未入力"}」なら、
急いで正解を決めるより、気持ちと現実のバランスを見ながら考えるのが自然だと思う。

次に考えるなら、
「この選択をしたとき、自分はちゃんと納得できそうか？」
を問いかけてみるとよさそう。
`;
}

function createFallbackDebate(profile) {
  return `
議論AI: 「${profile.topic}」については、まず客観的に見ると、メリットとリスクの両方を整理する必要があります。

分身AI: たしかに整理は大事だと思う。でも、${profile.name || "私"}らしく考えるなら、「${profile.values || "自分が納得できること"}」を大切にしたい。正解だけを探すより、自分がちゃんと納得できるかを見たい。

議論AI: では、感情や納得感を重視しすぎると、現実的な判断が遅れる可能性はありませんか？

分身AI: それはあると思う。だからこそ、気持ちだけで決めるんじゃなくて、${profile.decision}という考え方で、現実とのバランスも見たい。無理なく続けられるかも大事にしたい。

議論AI: なるほど。では最初の一歩として、何を確認すべきだと思いますか？

分身AI: まずは「それを選んだ自分が後悔しにくいか」を考えたい。小さく試してみて、自分の気持ちがどう動くかを見るのが良さそう。

まとめ: この議論では、客観的な整理と、本人らしい納得感の両方が重要だと分かりました。
`;
}

function splitDebateText(text) {
  const lines = String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const turns = [];

  for (const line of lines) {
    if (line.startsWith("議論AI:") || line.startsWith("議論AI：")) {
      turns.push({
        speaker: "opponent",
        text: line.replace(/^議論AI[:：]/, "").trim()
      });
    } else if (line.startsWith("分身AI:") || line.startsWith("分身AI：")) {
      turns.push({
        speaker: "doppel",
        text: line.replace(/^分身AI[:：]/, "").trim()
      });
    } else if (line.startsWith("まとめ:") || line.startsWith("まとめ：")) {
      turns.push({
        speaker: "system",
        text: "まとめ：" + line.replace(/^まとめ[:：]/, "").trim()
      });
    } else {
      turns.push({
        speaker: "system",
        text: line
      });
    }
  }

  return turns;
}

function createResultSummary(profile, reply, isFallback) {
  const resultArea = document.getElementById("resultArea");

  const empathyScore = calcScore(profile.personality + profile.thought, 82);
  const logicScore = calcScore(profile.decision + profile.topic, 76);
  const originalityScore = calcScore(profile.values + profile.hobby, 88);

  const modeLabel = isFallback ? "仮応答モード" : "AI応答モード";

  resultArea.innerHTML = `
    <div class="result-grid">
      <div class="summary-card">
        <h3>テーマ</h3>
        <p>${escapeHtml(profile.topic)}</p>
      </div>

      <div class="summary-card">
        <h3>分身モード</h3>
        <p>${escapeHtml(profile.mode)}</p>
      </div>

      <div class="summary-card">
        <h3>応答状態</h3>
        <p>${modeLabel}</p>
      </div>
    </div>

    <br />

    <div class="summary-card">
      <h3>直近の議論まとめ</h3>
      <p>${escapeHtml(makeShortConclusion(reply))}</p>
    </div>

    <br />

    <div class="summary-card">
      <h3>人格反映スコア</h3>

      <div class="score-list">
        ${createScoreItem("共感度", empathyScore)}
        ${createScoreItem("論理性", logicScore)}
        ${createScoreItem("本人らしさ", originalityScore)}
      </div>
    </div>
  `;
}

function createScoreItem(label, score) {
  return `
    <div class="score-item">
      <div class="score-top">
        <span>${label}</span>
        <span>${score}%</span>
      </div>
      <div class="score-bar">
        <div class="score-fill" style="width: ${score}%"></div>
      </div>
    </div>
  `;
}

function calcScore(text, base) {
  const lengthBonus = Math.min(String(text).length, 30);
  const score = base + Math.floor(lengthBonus / 3);
  return Math.min(score, 96);
}

function makeShortConclusion(reply) {
  const cleanReply = String(reply).replace(/\s+/g, " ").trim();

  if (cleanReply.length <= 110) {
    return cleanReply;
  }

  return cleanReply.slice(0, 110) + "…";
}

async function summonAI() {
  const profile = createProfileFromInputs();

  const chatArea = document.getElementById("chatArea");
  const resultArea = document.getElementById("resultArea");
  const loadingText = document.getElementById("loadingText");
  const button = document.getElementById("summonButton");

  if (!profile.topic) {
    alert("議論テーマを入力してください！");
    return;
  }

  currentProfile = profile;
  conversationHistory = [];
  isSummoned = true;

  chatArea.innerHTML = "";
  resultArea.innerHTML = "<p>議論中です…</p>";

  updateAvatarCard(profile);

  setChatInputEnabled(false);
  setAutoDebateEnabled(false);

  button.textContent = "分身を召喚中…";
  button.disabled = true;

  let loadingIndex = 0;
  loadingText.textContent = loadingMessages[0];

  const loadingTimer = setInterval(() => {
    loadingIndex++;
    loadingText.textContent = loadingMessages[loadingIndex % loadingMessages.length];
  }, 1050);

  addMessage(profile.topic, "user-msg");
  addMessage(`${profile.name || "あなた"} Mirrorを召喚しています…`, "system-msg");

  conversationHistory.push({
    role: "user",
    text: profile.topic
  });

  let reply = "";
  let isFallback = false;

  try {
    const prompt = buildConversationPrompt(profile, profile.topic);
    reply = await callGemini(prompt);
  } catch (error) {
    console.error(error);
    reply = createFallbackReply(profile, profile.topic);
    isFallback = true;
  }

  clearInterval(loadingTimer);
  loadingText.textContent = "";

  await typeMessage(reply, "ai-msg");

  conversationHistory.push({
    role: "assistant",
    text: reply
  });

  createResultSummary(profile, reply, isFallback);

  button.textContent = "もう一度最初から議論する";
  button.disabled = false;

  setChatInputEnabled(true);
  setAutoDebateEnabled(true);
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

  loadingText.textContent = "AI分身が考え中…";

  let reply = "";
  let isFallback = false;

  try {
    const prompt = buildConversationPrompt(currentProfile, userMessage);
    reply = await callGemini(prompt);
  } catch (error) {
    console.error(error);
    reply = createFallbackReply(currentProfile, userMessage);
    isFallback = true;
  }

  loadingText.textContent = "";

  await typeMessage(reply, "ai-msg");

  conversationHistory.push({
    role: "assistant",
    text: reply
  });

  createResultSummary(currentProfile, reply, isFallback);

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

  autoDebateButton.disabled = true;
  loadingText.textContent = "AI同士が議論中…";

  addMessage("議論AIと分身AIの自動議論を開始します。", "system-msg");

  let debateText = "";
  let isFallback = false;

  try {
    const prompt = createAutoDebatePrompt(currentProfile);
    debateText = await callGemini(prompt);
  } catch (error) {
    console.error(error);
    debateText = createFallbackDebate(currentProfile);
    isFallback = true;
  }

  loadingText.textContent = "";

  const turns = splitDebateText(debateText);

  for (const turn of turns) {
    if (turn.speaker === "opponent") {
      await typeMessage(turn.text, "opponent-msg");
    } else if (turn.speaker === "doppel") {
      await typeMessage(turn.text, "ai-msg");
    } else {
      await typeMessage(turn.text, "system-msg");
    }
  }

  conversationHistory.push({
    role: "assistant",
    text: debateText
  });

  createResultSummary(currentProfile, debateText, isFallback);

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
});