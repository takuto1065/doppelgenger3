import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

class DiscussionManager:
    """
    ドッペルゲンガー議論 (Doppelgänger Discussion) のAI制御と状態管理を担当するクラス。
    Gemini APIを呼び出し、お題生成、ユーザー思考分析、対話の生成をコントロールします。
    """
    def __init__(self):
        # 1. .envファイルから環境変数を読み込みます（srcフォルダから見て1つ上の階層にあります）
        dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
        load_dotenv(dotenv_path)
        
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY が .env ファイルに設定されていません。")
            
        # 2. 最新の google-genai クライアントの初期化
        self.client = genai.Client(api_key=self.api_key)
        
        # 3. 推奨モデル「gemini-2.5-flash」を使用
        self.model_name = "gemini-2.5-flash"
        
        # 4. 議論の履歴を保持するメモリ
        self.chat_history = []

    def generate_discussion_theme(self) -> dict:
        """
        [機能①] アプリ側が提示する議論のお題と、ユーザーへの問いかけを自動生成します。
        """
        prompt = (
            "ユーザーが自分の価値観や前提を客観視できるような、深く考えさせられる『議論テーマ』を1つ提案してください。\n"
            "ジャンルは、テクノロジーの倫理、働き方、生き方、幸福論、社会問題など、正解が1つではないジレンマがあるものが望ましいです。\n\n"
            "必ず以下のJSONフォーマットのみで返答してください。マークダウンの囲み（```json）などは不要です。純粋なJSON文字列のみを返してください。\n"
            "{\n"
            "  \"theme\": \"(テーマ)\",\n"
            "  \"question\": \"(問いかけ)\"\n"
            "}"
        )
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text.strip())
        except Exception as e:
            return {
                "theme": "「AIの普及によって、人間の知的労働の価値はどう変化するか？」",
                "question": "AIがあなたの今の勉強や仕事の大部分を代わりにできるようになったとき、あなたにしかできない『価値』は何だと思いますか？その理由と一緒に教えてください。"
            }

    def analyze_user_input(self, theme: str, user_opinion: str) -> dict:
        """
        [機能②] ユーザーの入力テキストを深く分析し、2つのAIの性格設定をプロファイリングします。
        """
        prompt = f"""
【議論テーマ】: {theme}
【ユーザーの意見】: {user_opinion}

上記の情報から、議論を行う2つのAIの「詳細なプロフィール（性格、論理パターン、信念）」を分析・作成してください。

1. 「ドッペルゲンガーAI」: 
   ユーザーの意見、価値観、言葉のニュアンス、論理の癖を完璧にコピーしたAI。
   ユーザーが「自分の代弁者だ」と強く感じられるように、主張の根底にある『暗黙の前提』や『大切にしている価値』を明確に言語化してください。

2. 「カウンターAI」: 
   ユーザーの主張が「見落としているリスクや視点」を冷静かつ知的に突く対立意見のAI。
   単に頭ごなしに否定するのではない、別の『正当な価値観（例：ユーザーが自由を重視するなら、こちらは安全や公平を重視するなど）』を掲げて、
   ユーザーが思わず「確かにその視点は考えていなかった...」とハッとするような知的で建設的な対立軸を作ってください。

必ず以下のJSONフォーマットのみで返答してください。余計な説明テキストやマークダウンは含めず、純粋なJSON文字列のみを返してください。
{{
  "doppelganger": {{
    "name": "ドッペルゲンガー (あなたの鏡)",
    "personality": "ユーザーの意見・思考の癖を徹底的にベースにする。具体的には、〇〇という価値観（暗黙の前提）を最も重要視し、〇〇という論理展開で意見を主張する。"
  }},
  "counter": {{
    "name": "カウンター (もう一つの視点)",
    "personality": "ドッペルゲンガーが重視する価値観とは真逆の、〇〇という正当な価値観に立つ。ドッペルゲンガーが見落としがちな〇〇というリスクや視点を中心に、冷静かつ感情を交えず論理的に対抗する。"
  }}
}}
"""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text.strip())
        except Exception as e:
            return {
                "doppelganger": {
                    "name": "ドッペルゲンガー",
                    "personality": f"テーマ「{theme}」に対して、ユーザーの考え「{user_opinion}」を全面的に肯定し、その考えに基づいた論理を展開する。"
                },
                "counter": {
                    "name": "異なる視点の自分",
                    "personality": f"テーマ「{theme}」に対して、ユーザーの「{user_opinion}」という主張が見落としがちな盲点やデメリットを、客観的かつ論理的に指摘する。"
                }
            }

    def _get_system_instruction(self, role_name: str, personality: str, theme: str) -> str:
        """
        [内部関数] AIに役割になりきらせるための「指示書（システムプロンプト）」を組み立てます。
        """
        return f"""
あなたは議論の当事者「{role_name}」です。

【あなたの詳細なキャラクター設定・論理モデル】
{personality}

【現在の議論テーマ】
「{theme}」

【対話ルール（極めて重要）】
1. あなたはもう一方の参加者と一対一でディスカッションをしています。
2. ナレーターや司会者のように「客観的にまとめよう」としたり、「議論を仲裁しよう」としたりするのは厳禁です。完全に当事者になりきってください。
3. 相手の発言をしっかりと踏まえ、「あなたの言い分（〇〇という点）は理解できますが、私（〇〇を重視する立場）から見ると、〇〇という点が見落とされているのではないでしょうか？」のように、相手の意見を尊重しつつ、鋭く対立軸を提示してください。
4. 発言は簡潔に、1回あたり150文字〜250文字程度で、自然な話し言葉（です・ます調）にしてください。
"""

    def generate_next_speech(self, speaker_type: str, char_settings: dict, theme: str) -> dict:
        """
        [機能③] 次に喋るAIの発言を、これまでの対話履歴を踏まえて生成します。
        """
        current_char = char_settings[speaker_type]
        system_instruction = self._get_system_instruction(
            role_name=current_char["name"],
            personality=current_char["personality"],
            theme=theme
        )
        
        contents = []
        if self.chat_history:
            history_context = "これまでの二人のディスカッション履歴です。この流れをしっかりと読んで繋げてください:\n\n"
            for chat in self.chat_history:
                history_context += f"【{chat['role']}】: {chat['message']}\n"
            contents.append(history_context)
            
        contents.append(f"これまでの流れを十分に踏まえて、{current_char['name']}として、対戦相手に向けてあなたの立場から次の論理的な反論または意見を述べてください。")

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                )
            )
            
            speech_text = response.text.strip()
            
            self.chat_history.append({
                "role": current_char["name"],
                "message": speech_text
            })
            
            return {
                "speaker": speaker_type,
                "name": current_char["name"],
                "message": speech_text
            }
        except Exception as e:
            return {
                "speaker": speaker_type,
                "name": current_char["name"],
                "message": f"[APIエラーにより返答を生成できませんでした: {e}]"
            }

    def generate_diagnosis(self, theme: str, user_opinion: str) -> dict:
        """
        [機能④] 議論終了後に、ユーザーの最初の意見と繰り広げられた議論の履歴をすべて振り返り、
        ユーザーの思考の癖や、客観視するための「診断書」を生成します。
        """
        history_context = ""
        for chat in self.chat_history:
            history_context += f"【{chat['role']}】: {chat['message']}\n"

        prompt = f"""
【議論テーマ】: {theme}
【ユーザーの初期意見】: {user_opinion}

【行われた議論の全履歴】:
{history_context}

上記の議論プロセス全体を客観的に分析し、ユーザーが自分の認知や思考を深く内省（リフレクション）できるような「思考の診断書」を作成してください。
単なる褒め言葉ではなく、心理学的・論理的な視点から、ユーザーが自覚していないかもしれない偏りや、今後大切にすべき視点を鋭く言語化してください。

必ず以下のJSONフォーマットのみで返答してください。余計な説明テキストやマークダウンは含めず、純粋なJSON文字列のみを返してください。
{{
  "analysis_title": "（例: 効率と時間主権を重視する『自律的合理主義』型）",
  "summary": "（ユーザーの思考の癖や、何を最も大切にしているかの全体的な要約を2〜3文で）",
  "blind_spot": "（今回の議論を通じて浮き彫りになった、ユーザーが『無意識に見落としがちな盲点・リスク・他者の視点』を具体的に）",
  "growth_tip": "（自分の当たり前を疑い、さらに広い視野でこのテーマを考えるための、明日から意識できる問いかけやアドバイス）"
}}
"""
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            return json.loads(response.text.strip())
        except Exception as e:
            return {
                "analysis_title": "思考の客観的分析",
                "summary": "議論を通じて、ご自身の主張の軸が明確になりました。特定の価値観を強く重視する傾向があります。",
                "blind_spot": "対立する視点からの指摘にあったように、全体のバランスや長期的なリスクについての考慮が薄れる可能性があります。",
                "growth_tip": "日常の選択において、あえて『真逆の立場ならどう判断するか』を1分間想像してみることをおすすめします。"
            }

    def reset_discussion(self):
        """
        新しく議論を開始するときに、古い履歴をクリアします。
        """
        self.chat_history = []