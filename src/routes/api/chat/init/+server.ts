import { json } from '@sveltejs/kit';
import { GOOGLE_AI_API_KEY } from '$env/static/private';
import { GoogleGenAI, type Chat } from '@google/genai';
import { GEMINI_MODEL_NAME } from '$lib/constants';
import type { RequestHandler } from '@sveltejs/kit';
import journey from '$lib/assets/journey.txt?raw';

// Store active chat sessions (in production, consider using Redis or database)
declare global {
	// eslint-disable-next-line no-var
	var chatSessions: Map<string, Chat>;
}

if (!globalThis.chatSessions) {
	globalThis.chatSessions = new Map();
}

const chatSessions = globalThis.chatSessions;

export const POST: RequestHandler = async () => {
	try {
		if (!GOOGLE_AI_API_KEY) {
			return json({ error: 'API 金鑰未設定。請聯繫開發者。' }, { status: 500 });
		}

		const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

		// 使用已載入的行程資訊
		const journeyInfo = journey;

		let systemInstructionString =
			'你是一位專為計劃前往東京市區旅遊的台灣遊客提供協助的 AI 旅遊顧問。請務必使用繁體中文回答。你的回答應該友善、口語化、實用，並且盡可能包含當地人才知道的實用秘訣或建議。\n當你提到一個明確的地點、地標、車站、公園、餐廳、商店或區域時，請用雙中括號將其包起來，例如：`[[東京晴空塔]]` 或 `[[新宿御苑]]` 或 `[[澀谷站]]` 或 `[[一蘭拉麵 新宿店]]`。這樣使用者可以快速識別重要的地點資訊。\n\n請針對以下主題提供建議：\n- 交通方式與路線規劃\n- 美食推薦（包括平價選擇）\n- 購物地點與商品\n- 觀光景點與活動\n- 住宿建議\n- 實用的旅遊小撇步\n- 文化禮儀與注意事項\n- 當地生活體驗\n\n如果使用者詢問東京以外的地區，請友善地提醒你專精於東京市區旅遊，並建議他們將問題聚焦在東京相關內容上。';

		// 如果有行程資訊，將其加入系統指令
		if (journeyInfo.trim()) {
			systemInstructionString +=
				'\n\n**重要：以下是用戶的詳細行程資訊，請仔細閱讀並在回答時參考這些資訊：**\n\n' +
				journeyInfo +
				'\n\n請根據用戶的具體行程安排（包括日期、住宿飯店、航班時間、已規劃的景點等）來提供個人化的建議。特別注意：\n- 根據用戶的住宿位置推薦附近的景點和餐廳\n- 考慮用戶的航班時間和行程安排\n- 參考用戶已規劃的景點，避免重複推薦\n- 根據用戶的興趣和已列出的偏好提供建議\n- 如果用戶詢問的景點或時間與行程衝突，請主動提醒';
		}

		const chat = ai.chats.create({
			model: GEMINI_MODEL_NAME,
			config: {
				systemInstruction: systemInstructionString,
				tools: [{ googleSearch: {} }]
			}
		});

		// Generate a session ID and store the chat instance
		const sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
		chatSessions.set(sessionId, chat);

		// Clean up old sessions (simple TTL implementation)
		// In production, implement proper session management
		setTimeout(
			() => {
				chatSessions.delete(sessionId);
			},
			30 * 60 * 1000
		); // 30 minutes TTL

		return json({ sessionId });
	} catch (error) {
		console.error('Chat initialization error:', error);
		let errorMessage = '初始化聊天時發生未知錯誤。';

		if (error instanceof Error) {
			if (error.message.includes('API key not valid')) {
				errorMessage = 'API 金鑰無效。請檢查 API 金鑰設定。';
			} else {
				errorMessage = `初始化聊天失敗：${error.message}`;
			}
		}

		return json({ error: errorMessage }, { status: 500 });
	}
};
