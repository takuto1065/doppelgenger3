async function summonAI() {
  const name = document.getElementById("nameInput").value;
  const personality = document.getElementById("personalityInput").value;
  const hobby = document.getElementById("hobbyInput").value;
  const thought = document.getElementById("thoughtInput").value;
  const topic = document.getElementById("topicInput").value;

  const chatArea = document.getElementById("chatArea");
  const resultArea = document.getElementById("resultArea");
  const button = document.getElementById("summonButton");

  // ボタンのテキストをローディング中に変更
  button.innerText = "AIがあなたを分析中...";
  button.disabled = true;

  // チャットエリアにローディング表示
  chatArea.innerHTML = `
    <p>対話を生み出しています...</p>
    <div class="loader"></div>
  `;

  try {
    // 実際に接続するバックエンド（Python側など）のURLをここに入れます
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

    // チャットメッセージの表示（文字化け部分を自然な日本語に修正）
    chatArea.innerHTML = `
      <div class="chat-message user-msg">
        あなた: ${topic || "テーマが指定されていません"}
      </div>

      <div class="chat-message ai-msg">
        AI: ${data.reply}
        <br>
        （${personality || "あなた"}の性格や思考をベースに回答しています。対立する視点と議論することで、新しい可能性が見つかるかもしれません。）
      </div>
    `;

    // 診断結果エリアの表示
    resultArea.innerHTML = `
      <h3>議論の要約</h3>
      <p>テーマ: ${topic || "未設定"}</p>
      <p>${name || "あなた"}のプロファイルをもとに、ドッペルゲンガーAIとカウンターAIが議論を行いました。</p>
    `;

  } catch (error) {
    chatArea.innerHTML = `<p>接続エラー: APIに接続できませんでした。</p>`;
    console.error(error);
  }

  // 処理が終わったらボタンを元に戻す
  button.innerText = "もう一度議論を始める";
  button.disabled = false;
}