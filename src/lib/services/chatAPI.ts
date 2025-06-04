import type { GroundingSource } from '$lib/types';

export interface ChatSession {
	sessionId: string;
}

// 行程摘要介面
export interface JourneySummary {
	dates: string[];
	hotel: string;
	flights: {
		departure: string;
		return: string;
	};
	dailyPlans: { day: string; activities: string[] }[];
}

/**
 * 初始化聊天會話的 API。
 *
 * 此函式會向 `/api/chat/init` 發送 POST 請求以建立新的聊天會話，
 * 並回傳包含 sessionId 的 ChatSession 物件。
 *
 * @throws 當伺服器回應非 2xx 狀態時，會擲出錯誤，錯誤訊息來自伺服器回應或預設為「初始化聊天失敗」。
 * @returns 包含 sessionId 的 Promise<ChatSession>。
 */
export const initializeChatSessionAPI = async (): Promise<ChatSession> => {
	const response = await fetch('/api/chat/init', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	});

	if (!response.ok) {
		const errorData = await response.json();
		throw new Error(errorData.error || '初始化聊天失敗');
	}

	const data = await response.json();
	return { sessionId: data.sessionId };
};

/**
 * 向 Tokyo Expert API 發送問題並以串流方式接收回應。
 *
 * 此函式會將問題傳送至 `/api/chat/send`，並透過 Server-Sent Events (SSE) 逐步接收回應內容。
 * 回應內容會以 chunk 方式傳遞給 `onChunk` 回呼，來源資料會在 `onComplete` 回呼中傳遞。
 * 若發生錯誤，會呼叫 `onError` 回呼。
 *
 * @param session 聊天會話資訊，包含 sessionId。
 * @param question 使用者要詢問的問題。
 * @param onChunk 當收到文字片段時呼叫的回呼函式。
 * @param onComplete 當串流完成時呼叫的回呼函式，並傳遞來源資料（若有）。
 * @param onError 發生錯誤時呼叫的回呼函式。
 * @returns 無回傳值（Promise<void>）。
 */
export const askTokyoExpertAPI = async (
	session: ChatSession,
	question: string,
	onChunk: (textChunk: string) => void,
	onComplete: (sources?: GroundingSource[]) => void,
	onError: (error: Error) => void
): Promise<void> => {
	try {
		const response = await fetch('/api/chat/send', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				sessionId: session.sessionId,
				message: question
			})
		});

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(errorData.error || '發送訊息失敗');
		}

		if (!response.body) {
			throw new Error('未收到回應串流');
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let sources: GroundingSource[] = [];

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					break;
				}

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);

						if (data.trim() === '') continue;

						try {
							const parsed = JSON.parse(data);

							switch (parsed.type) {
								case 'text':
									onChunk(parsed.content);
									break;
								case 'sources':
									sources = parsed.content;
									break;
								case 'complete':
									onComplete(sources);
									return;
								case 'error':
									onError(new Error(parsed.content));
									return;
							}
						} catch (parseError) {
							console.warn('無法解析 SSE 資料:', data, parseError);
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	} catch (error) {
		console.error('API 呼叫錯誤:', error);
		onError(error instanceof Error ? error : new Error('未知錯誤'));
	}
};

/**
 * 獲取行程摘要的 API。
 *
 * 此函式會向 `/api/journey/summary` 發送 GET 請求以獲取結構化的行程摘要資訊。
 *
 * @throws 當伺服器回應非 2xx 狀態時，會擲出錯誤。
 * @returns 包含行程摘要的 Promise<JourneySummary>。
 */
export const getJourneySummaryAPI = async (): Promise<JourneySummary | null> => {
	try {
		console.log('開始獲取行程摘要...'); // 添加調試信息

		const response = await fetch('/api/journey/summary', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		console.log('API 響應狀態:', response.status, response.statusText); // 添加調試信息

		if (!response.ok) {
			console.warn('無法獲取行程摘要:', response.status);
			return null;
		}

		const data = await response.json();
		console.log('API 響應數據:', data); // 添加調試信息

		if (data.success) {
			console.log('成功解析行程摘要:', data.summary); // 添加調試信息
			return data.summary;
		} else {
			console.warn('行程摘要 API 回傳失敗:', data.message);
			return null;
		}
	} catch (error) {
		console.error('獲取行程摘要時發生錯誤:', error); // 改為 error 級別
		return null;
	}
};
