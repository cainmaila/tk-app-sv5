import { GoogleGenAI, Chat, type Candidate } from '@google/genai';
import type { GroundingSource, RawGroundingChunk } from '$lib/types';
import { GEMINI_MODEL_NAME } from '$lib/constants';
import { env } from '$env/dynamic/public';

// Helper function to extract grounding sources
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
		// Can be extended for other source types if needed
	});
	return sources;
};

export const initializeChatSession = async (apiKey: string): Promise<Chat> => {
	if (!apiKey) {
		throw new Error('API 金鑰未提供。無法初始化 Gemini 服務。');
	}
	const ai = new GoogleGenAI({ apiKey });

	const systemInstructionString =
		'你是一位專為計劃前往東京市區旅遊的台灣遊客提供協助的 AI 旅遊顧問。請務必使用繁體中文回答。你的回答應該友善、口語化、實用，並且盡可能包含當地人才知道的實用秘訣或建議。\n當你提到一個明確的地點、地標、車站、公園、餐廳、商店或區域時，請用雙中括號將其包起來，例如：`[[東京晴空塔]]` 或 `[[新宿御苑]]` 或 `[[澀谷站]]` 或 `[[一蘭拉麵 澀谷店]]`。這樣我才能為它加上地圖連結。請只針對這些具體地點使用此格式。\n當問題涉及需要最新資訊的情況（例如：特定活動日期、商家目前營業時間、即時匯率、天氣預報等），請優先運用 Google Search 工具來查找並提供最準確的答案，同時附上資訊來源網址。如果問題較為開放或主觀 (例如：推薦美食、行程規劃建議)，則以你的知識庫回答，並可適時加入個人化的風格。如果無法回答或問題不恰當，請禮貌地說明。';

	const chat = ai.chats.create({
		model: GEMINI_MODEL_NAME,
		config: {
			systemInstruction: systemInstructionString,
			tools: [{ googleSearch: {} }]
			// thinkingConfig: { thinkingBudget: 0 } // Optional: uncomment for lower latency if preferred over quality
		}
	});
	return chat;
};

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
			// chunk is of type GenerateContentResponse
			const textChunk = chunk.text;

			if (textChunk) {
				onChunk(textChunk);
			}

			// Store the latest candidate that might contain grounding metadata.
			// Grounding metadata usually comes with later chunks or the final one.
			if (chunk.candidates && chunk.candidates.length > 0) {
				const currentCandidate = chunk.candidates[0];
				// Prioritize candidates that explicitly have groundingMetadata.
				if (currentCandidate.groundingMetadata) {
					latestCandidateWithMetadata = currentCandidate;
				} else if (!latestCandidateWithMetadata && currentCandidate) {
					// If no candidate with metadata has been found yet,
					// keep the latest one, as metadata might be attached later or derived.
					latestCandidateWithMetadata = currentCandidate;
				}
			}
		}

		let sources: GroundingSource[] = [];
		if (
			latestCandidateWithMetadata?.groundingMetadata?.groundingChunks &&
			latestCandidateWithMetadata.groundingMetadata.groundingChunks.length > 0
		) {
			// The elements of groundingChunks from the SDK are the actual GroundingChunk objects.
			// RawGroundingChunk is a user-defined type that should match the structure of these objects, specifically the 'web' part.
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
