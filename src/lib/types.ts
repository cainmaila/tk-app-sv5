export interface ChatMessage {
	id: string;
	role: 'user' | 'model';
	text: string;
	sources?: GroundingSource[];
}

export interface GroundingSource {
	uri: string;
	title: string;
}

// 這是一個簡化版的 groundingMetadata 回傳資料型別。
// @google/genai 套件中的實際型別為 GroundingAttribution，可能包含更多欄位。
// 我們會將其對應到 GroundingSource 以供本應用程式使用。
export interface RawGroundingChunk {
	web?: {
		uri: string;
		title: string;
	};
	// 其他類型，例如 'retrievedContext' 也可能存在
}
