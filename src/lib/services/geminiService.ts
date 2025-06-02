import { GoogleGenAI, Chat, type Candidate } from '@google/genai';
import type { GroundingSource, RawGroundingChunk } from '$lib/types';
import { GEMINI_MODEL_NAME } from '$lib/constants';

// 擷取 Grounding 來源的輔助函式
/**
 * 從給定的 RawGroundingChunk 陣列中提取來源資訊，並轉換為 GroundingSource 陣列。
 *
 * @param chunks - 原始的 GroundingChunk 陣列，或未定義。
 * @returns GroundingSource 陣列，若無有效來源則回傳空陣列。
 *
 * 每個來源僅處理 web 類型，若有 uri 則會包含於結果中，title 若不存在則以 uri 代替。
 * 可根據需求擴充其他來源型別的處理邏輯。
 */
const extractSources = (chunks: RawGroundingChunk[] | undefined): GroundingSource[] => {
	if (!chunks) return [];

	const sources: GroundingSource[] = [];
	chunks.forEach((chunk) => {
		if (chunk.web && chunk.web.uri) {
			sources.push({
				uri: chunk.web.uri,
				title: chunk.web.title || chunk.web.uri // type.ts defines title as string, this ensures it
			});
		}
		// 如有需要，可擴充處理其他來源型別
	});
	return sources;
};

/**
 * 初始化 Gemini 聊天服務，並回傳一個新的聊天會話實例。
 *
 * @param apiKey - 用於驗證 Google Gemini API 的金鑰，若未提供則會拋出錯誤。
 * @returns Promise<Chat> - 初始化完成後的聊天會話物件。
 * @throws 當未提供 API 金鑰時，會拋出錯誤。
 *
 * 此函式會設定一組專為台灣旅客設計、前往東京市區旅遊的 AI 旅遊顧問系統指令，
 * 並強制要求回覆內容使用繁體中文，且針對地點名稱以雙中括號標註，方便後續加上地圖連結。
 * 若遇到需要即時資訊的問題，會優先使用 Google Search 工具查詢並附上來源網址。
 */
export const initializeChatSession = async (apiKey: string): Promise<Chat> => {
	if (!apiKey) {
		throw new Error('API 金鑰未提供。無法初始化 Gemini 服務。');
	}
	const ai = new GoogleGenAI({ apiKey });

	const systemInstructionString = `你是一位專為計劃前往東京市區旅遊的台灣遊客提供協助的 AI 旅遊顧問。請務必使用繁體中文回答。
	你的回答應該友善、口語化、實用，並且盡可能包含當地人才知道的實用秘訣或建議。
	當你提到一個明確的地點、地標、車站、公園、餐廳、商店或區域時，請用雙中括號將其包起來，
	例如："[[東京晴空塔]]" 或 "[[新宿御苑]]" 或 "[[澀谷站]]" 或 "[[一蘭拉麵 澀谷店]]"。
	這樣我才能為它加上地圖連結。請只針對這些具體地點使用此格式。
	當問題涉及需要最新資訊的情況（例如：特定活動日期、商家目前營業時間、即時匯率、天氣預報等），
	請優先運用 Google Search 工具來查找並提供最準確的答案，同時附上資訊來源網址。
	如果問題較為開放或主觀 (例如：推薦美食、行程規劃建議)，則以你的知識庫回答，並可適時加入個人化的風格。
	如果無法回答或問題不恰當，請禮貌地說明。`;

	const chat = ai.chats.create({
		model: GEMINI_MODEL_NAME,
		config: {
			systemInstruction: systemInstructionString,
			tools: [{ googleSearch: {} }]
			// thinkingConfig: { thinkingBudget: 0 } // （可選）如需更低延遲（犧牲品質），可取消註解
		}
	});
	return chat;
};

/**
 * 以串流方式向 Tokyo 專家（AI）發送問題，並處理回應的文字區塊、來源資料與錯誤。
 *
 * @param chat - 與 AI 對話的 Chat 實例。
 * @param question - 使用者欲詢問的問題字串。
 * @param onChunk - 每當收到新的文字區塊時呼叫的回呼函式。
 * @param onComplete - 串流結束時呼叫的回呼函式，會傳回來源資料（如有）。
 * @param onError - 發生錯誤時呼叫的回呼函式。
 * @returns Promise<void> - 非同步操作，無回傳值。
 *
 * @remarks
 * 此函式會串流方式逐步取得 AI 回應，並即時將文字區塊傳給 onChunk。
 * 若回應中包含 grounding metadata，會於串流結束時解析來源資料並傳給 onComplete。
 * 若發生錯誤，會根據錯誤內容回傳適當的錯誤訊息。
 */
export const askTokyoExpert = async (
	chat: Chat,
	question: string,
	onChunk: (textChunk: string) => void,
	onComplete: (sources?: GroundingSource[]) => void,
	onError: (error: Error) => void
): Promise<void> => {
	try {
		const stream = await chat.sendMessageStream({ message: question });

		let latestCandidateWithMetadata: Candidate | null = null;

		for await (const chunk of stream) {
			// chunk 的型別為 GenerateContentResponse
			const textChunk = chunk.text;

			if (textChunk) {
				onChunk(textChunk);
			}

			// 儲存可能包含 grounding metadata 的最新 candidate。
			// grounding metadata 通常會在後續 chunk 或最後一個 chunk 才出現。
			if (chunk.candidates && chunk.candidates.length > 0) {
				const currentCandidate = chunk.candidates[0];
				// 優先選擇明確包含 groundingMetadata 的 candidate。
				if (currentCandidate.groundingMetadata) {
					latestCandidateWithMetadata = currentCandidate;
				} else if (!latestCandidateWithMetadata && currentCandidate) {
					// 如果尚未找到帶有 metadata 的 candidate，
					// 則保留目前這個，因為 metadata 可能稍後才會附加或推導出來。
					latestCandidateWithMetadata = currentCandidate;
				}
			}
		}

		let sources: GroundingSource[] = [];
		if (
			latestCandidateWithMetadata?.groundingMetadata?.groundingChunks &&
			latestCandidateWithMetadata.groundingMetadata.groundingChunks.length > 0
		) {
			// 來自 SDK 的 groundingChunks 元素即為實際的 GroundingChunk 物件。
			// RawGroundingChunk 是使用者自定義型別，應與這些物件的結構（特別是 'web' 部分）相符。
			sources = extractSources(
				latestCandidateWithMetadata.groundingMetadata.groundingChunks as RawGroundingChunk[]
			);
		}
		onComplete(sources);
	} catch (error) {
		console.error('Gemini API stream error:', error);
		let err = new Error('與 AI 溝通時發生串流未知錯誤。');
		if (error instanceof Error) {
			if (error.message.includes('API key not valid')) {
				err = new Error('API 金鑰無效。請檢查您的 API 金鑰設定。');
			} else {
				err = new Error(`與 AI 溝通時發生串流錯誤：${error.message}`);
			}
		}
		onError(err);
	}
};
