import time
from discussion_manager import DiscussionManager

def main_discussion_flow():
    print("🔮 【ドッペルゲンガー・ディスカッション】を開始します...\n")
    
    # マネージャーの初期化
    try:
        manager = DiscussionManager()
    except Exception as e:
        print(f"初期化エラー: {e}")
        return

    # 1. 【アップデート】お題と問いかけを都度、自動生成する
    print("🎲 議論のテーマをAIが生成しています...")
    theme_data = manager.generate_discussion_theme()
    
    fixed_theme = theme_data['theme']
    fixed_question = theme_data['question']
    
    print("==================================================================")
    print(f"📢 【今回の議論テーマ】:\n{fixed_theme}")
    print(f"❓ 【問いかけ】:\n{fixed_question}")
    print("==================================================================\n")

    # 2. 最初の回答をユーザーが入力
    print("👇 お題に対するあなたの最初の考えを、キーボードから入力してください。")
    user_opinion = input(">>> ")
    
    if not user_opinion.strip():
        print("入力が空だったため、テスト用のデフォルト意見を使用します。")
        user_opinion = "特に強いこだわりはありませんが、バランスが大事だと思います。"

    print("\n------------------------------------------------------------------")
    print("🧠 あなたの意見から『思考の癖』を分析し、2人のAIを生成しています...")
    print("------------------------------------------------------------------\n")
    
    # 3. 性格プロファイリング
    char_settings = manager.analyze_user_input(fixed_theme, user_opinion)
    
    print("--- 🤖 生成されたキャラクタープロフィール ---")
    print(f"👤 【{char_settings['doppelganger']['name']}】")
    print(f"{char_settings['doppelganger']['personality']}\n")
    print(f"👿 【{char_settings['counter']['name']}】")
    print(f"{char_settings['counter']['personality']}")
    print("-------------------------------------------\n")
    time.sleep(2)

    # ユーザーの初期意見を履歴に登録
    manager.chat_history.append({
        "role": char_settings['doppelganger']['name'],
        "message": user_opinion
    })

    # 4. AI同士の自動議論（2往復）
    print("🏁 AI同士による客観的議論をスタートします...\n")
    rounds = 1 # 往復数を指定（例: 2往復なら4ターン）
    
    for r in range(1, rounds + 1):
        print(f"🔄 --- ターン {r} ---")
        
        # カウンター（対立意見）の発言
        speech_b = manager.generate_next_speech("counter", char_settings, fixed_theme)
        print(f"\033[35m【{speech_b['name']}】\033[0m\n{speech_b['message']}\n")
        time.sleep(3.0)

        # ドッペルゲンガー（ユーザーの身代わり）の発言
        speech_a = manager.generate_next_speech("doppelganger", char_settings, fixed_theme)
        print(f"\033[36m【{speech_a['name']}】\033[0m\n{speech_a['message']}\n")
        time.sleep(3.0)

    # 5. 議論終了後の客観的思考診断
    print("------------------------------------------------------------------")
    print("📊 議論が終了しました。これまでの対話からあなたの『思考診断書』を生成中...")
    print("------------------------------------------------------------------\n")
    time.sleep(1.5)
    
    diagnosis = manager.generate_diagnosis(fixed_theme, user_opinion)
    
    print("==================================================================")
    print("🧠 ✨ あなたの思考客観視 診断結果シート ✨")
    print("==================================================================")
    print(f"📈 【あなたの思考タイプ】\n  >> {diagnosis['analysis_title']}\n")
    print(f"📝 【思考の全体傾向】\n  {diagnosis['summary']}\n")
    print(f"🔍 【無意識の盲点・見落としがちな視点】\n  {diagnosis['blind_spot']}\n")
    print(f"💡 【さらに視野を広げるためのヒント】\n  {diagnosis['growth_tip']}")
    print("==================================================================")

if __name__ == "__main__":
    main_discussion_flow()