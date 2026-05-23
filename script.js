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

    chatArea.innerHTML = `
      <div class="chat-message user-msg">
        ���Ȃ�: ${topic || "�����͈��肵���d���ɏA������"}
      </div>

      <div class="chat-message ai-msg">
        AI: AI: ${data.reply}${personality || "�T�d"}�ȉ��l�ς������Ă��܂��ˁB  
        �ł����ɂ͒��킷�邱�ƂŐV�����\���������邩������܂���B
      </div>
    `;

    resultArea.innerHTML = `
      <p>�c�_����</p>
      <p>�e�[�}: ${topic || "������"}</p>
      <p>${name || "���Ȃ�"}����̐l�i�X�������Ƃɋc�_���܂����B</p>
    `;

  } catch (error) {
    chatArea.innerHTML = `<p>�ڑ��G���[: API��������܂���B</p>`;
    console.error(error);
  }

  button.innerText = "������x�c�_����";
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