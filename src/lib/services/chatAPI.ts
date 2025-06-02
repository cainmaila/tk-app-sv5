import type { GroundingSource } from '$lib/types';

export interface ChatSession {
	sessionId: string;
}

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
