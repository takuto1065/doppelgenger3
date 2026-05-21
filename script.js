async function summonAI() {
  const name = document.getElementById("nameInput").value;
  const personality = document.getElementById("personalityInput").value;
  const hobby = document.getElementById("hobbyInput").value;
  const thought = document.getElementById("thoughtInput").value;
  const topic = document.getElementById("topicInput").value;

  const chatArea = document.getElementById("chatArea");
  const resultArea = document.getElementById("resultArea");
  const button = document.getElementById("summonButton");

  button.innerText = "AIがあなたを分析中...";
  button.disabled = true;

  chatArea.innerHTML = `
    <p>分身を生成しています...</p>
    <div class="loader"></div>
  `;

 try {
  const response = await fetch("ここにAPIのURL", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      personality,
      hobby,
      thought,
      topic
    })
  });

  const data = await response.json();

    chatArea.innerHTML = `
      <div class="chat-message user-msg">
        あなた: ${topic || "将来は安定した仕事に就きたい"}
      </div>

      <div class="chat-message ai-msg">
        AI: AI: ${data.reply}${personality || "慎重"}な価値観を持っていますね。  
        でも時には挑戦することで新しい可能性が見つかるかもしれません。
      </div>
    `;

    resultArea.innerHTML = `
      <p>議論完了</p>
      <p>テーマ: ${topic || "未入力"}</p>
      <p>${name || "あなた"}さんの人格傾向をもとに議論しました。</p>
    `;

  } catch (error) {
    chatArea.innerHTML = `<p>接続エラー: APIが見つかりません。</p>`;
    console.error(error);
  }

  button.innerText = "もう一度議論する";
  button.disabled = false;
}