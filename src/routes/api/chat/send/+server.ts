import { GOOGLE_AI_API_KEY } from '$env/static/private';
import type { RequestHandler } from '@sveltejs/kit';
import type { Chat, Candidate, GroundingChunk } from '@google/genai';
import type { GroundingSource } from '$lib/types';

// Store active chat sessions (same reference as init endpoint)
declare global {
	// eslint-disable-next-line no-var
	var chatSessions: Map<string, Chat>;
}

if (!globalThis.chatSessions) {
	globalThis.chatSessions = new Map();
}

const chatSessions = globalThis.chatSessions;

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!GOOGLE_AI_API_KEY) {
			return new Response(JSON.stringify({ error: 'API 金鑰未設定。請聯繫開發者。' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const { sessionId, message } = await request.json();

		if (!sessionId || !message) {
			return new Response(JSON.stringify({ error: '缺少必要的參數。' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const chat = chatSessions.get(sessionId);
		if (!chat) {
			return new Response(JSON.stringify({ error: '聊天會話已過期，請重新初始化。' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Create a readable stream for Server-Sent Events
		const stream = new ReadableStream({
			async start(controller) {
				try {
					const textEncoder = new TextEncoder();

					const streamResponse = await chat.sendMessageStream({ message });
					let latestCandidateWithMetadata: Candidate | null = null;

					for await (const chunk of streamResponse) {
						const textChunk = chunk.text;

						if (textChunk) {
							// Send text chunk as SSE
							const data = JSON.stringify({
								type: 'text',
								content: textChunk
							});
							controller.enqueue(textEncoder.encode(`data: ${data}\n\n`));
						}

						// Store metadata for grounding sources
						if (chunk.candidates && chunk.candidates.length > 0) {
							const candidate = chunk.candidates[0];
							if (candidate.groundingMetadata?.groundingChunks) {
								latestCandidateWithMetadata = candidate;
							}
						}
					}

					// Send sources if available
					if (latestCandidateWithMetadata?.groundingMetadata?.groundingChunks) {
						const sources = extractSources(
							latestCandidateWithMetadata.groundingMetadata.groundingChunks
						);

						if (sources.length > 0) {
							const data = JSON.stringify({
								type: 'sources',
								content: sources
							});
							controller.enqueue(textEncoder.encode(`data: ${data}\n\n`));
						}
					}

					// Send completion signal
					const data = JSON.stringify({ type: 'complete' });
					controller.enqueue(textEncoder.encode(`data: ${data}\n\n`));
				} catch (error) {
					console.error('Streaming error:', error);
					let errorMessage = '與 AI 溝通時發生串流未知錯誤。';

					if (error instanceof Error) {
						if (error.message.includes('API key not valid')) {
							errorMessage = 'API 金鑰無效。請檢查您的 API 金鑰設定。';
						} else {
							errorMessage = `與 AI 溝通時發生串流錯誤：${error.message}`;
						}
					}

					const data = JSON.stringify({
						type: 'error',
						content: errorMessage
					});
					const textEncoder = new TextEncoder();
					controller.enqueue(textEncoder.encode(`data: ${data}\n\n`));
				} finally {
					controller.close();
				}
			}
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type'
			}
		});
	} catch (error) {
		console.error('Send message error:', error);
		return new Response(JSON.stringify({ error: '發送訊息時發生錯誤。' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

// Helper function to extract grounding sources
function extractSources(chunks: GroundingChunk[]): GroundingSource[] {
	if (!chunks) return [];

	const sources: GroundingSource[] = [];
	chunks.forEach((chunk) => {
		if (chunk.web?.uri) {
			sources.push({
				uri: chunk.web.uri,
				title: chunk.web.title || chunk.web.uri
			});
		}
	});
	return sources;
}
