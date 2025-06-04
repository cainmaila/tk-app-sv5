<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { ChatMessage } from '$lib/types';
	import {
		initializeChatSessionAPI,
		askTokyoExpertAPI,
		getJourneySummaryAPI,
		type ChatSession,
		type JourneySummary
	} from '$lib/services/chatAPI';
	import UserInput from '$lib/components/UserInput.svelte';
	import ChatBubble from '$lib/components/ChatBubble.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { APP_TITLE } from '$lib/constants';
	import '../app.css';

	let chatSession: ChatSession | null = $state(null);
	let messages: ChatMessage[] = $state([]);
	let currentQuestion = $state('');
	let isLoading = $state(false);
	let error: string | null = $state(null);
	let chatContainer: HTMLElement;
	let currentAiMessageId: string | null = $state(null);
	let journeySummary: JourneySummary | null = $state(null);

	onMount(async () => {
		if (!browser) return;

		try {
			error = null;
			isLoading = true;

			// 並行獲取聊天會話和行程摘要
			const [session, summary] = await Promise.all([
				initializeChatSessionAPI(),
				getJourneySummaryAPI()
			]);

			chatSession = session;
			journeySummary = summary;

			// 根據行程摘要生成個人化的歡迎訊息
			let welcomeMessage = '您好！我是您的東京旅遊小助手。';

			if (journeySummary) {
				welcomeMessage += `\n\n我已經了解您的行程安排：`;

				if (journeySummary.dates.length > 0) {
					welcomeMessage += `\n📅 旅遊日期：${journeySummary.dates[0]} 到 ${journeySummary.dates[journeySummary.dates.length - 1]}`;
				}

				if (journeySummary.hotel) {
					welcomeMessage += `\n🏨 住宿：${journeySummary.hotel}`;
				}

				if (journeySummary.dailyPlans.length > 0) {
					welcomeMessage += `\n📋 已規劃 ${journeySummary.dailyPlans.length} 天的行程`;
				}

				welcomeMessage += `\n\n我可以根據您的行程安排為您提供：`;
				welcomeMessage += `\n• 景點間的交通建議`;
				welcomeMessage += `\n• 附近美食推薦`;
				welcomeMessage += `\n• 行程優化建議`;
				welcomeMessage += `\n• 購物和文化體驗推薦`;
			} else {
				welcomeMessage +=
					'請問有什麼可以為您服務的嗎？例如：推薦新宿的美食、查詢明天淺草寺的開放時間，或是幫您規劃一日遊行程。';
			}

			welcomeMessage += `\n\n請隨時告訴我您想了解什麼！`;

			messages = [
				{
					id: Date.now().toString(),
					role: 'model',
					text: welcomeMessage
				}
			];
		} catch (e) {
			console.error('初始化聊天失敗:', e);
			error = e instanceof Error ? e.message : '初始化聊天時發生未知錯誤。';
		} finally {
			isLoading = false;
		}
	});

	$effect(() => {
		if (chatContainer && messages.length > 0) {
			// Scroll to bottom with a slight delay to allow DOM update for streaming text
			setTimeout(() => {
				if (chatContainer) {
					chatContainer.scrollTop = chatContainer.scrollHeight;
				}
			}, 100);
		}
	});

	const handleSubmitQuestion = async () => {
		if (!currentQuestion.trim() || isLoading || !chatSession) return;

		const questionToAsk = currentQuestion.trim();
		const userMessage: ChatMessage = {
			id: Date.now().toString(),
			role: 'user',
			text: questionToAsk
		};

		const aiMessageId = `ai-${Date.now()}`;
		currentAiMessageId = aiMessageId;

		const aiPlaceholderMessage: ChatMessage = {
			id: aiMessageId,
			role: 'model',
			text: '', // Initially empty for streaming
			sources: []
		};

		messages = [...messages, userMessage, aiPlaceholderMessage];
		currentQuestion = '';
		isLoading = true;
		error = null;

		try {
			await askTokyoExpertAPI(
				chatSession,
				questionToAsk,
				(textChunk) => {
					// onChunk
					messages = messages.map((msg) =>
						msg.id === currentAiMessageId ? { ...msg, text: msg.text + textChunk } : msg
					);
				},
				(sources) => {
					// onComplete
					messages = messages.map((msg) =>
						msg.id === currentAiMessageId ? { ...msg, sources: sources || [] } : msg
					);
					isLoading = false;
					currentAiMessageId = null;
				},
				(streamError) => {
					// onError callback from askTokyoExpertAPI (errors during stream)
					console.error('Streaming error reported to App:', streamError);
					error = streamError.message; // Show global error

					messages = messages.map((msg) => {
						if (msg.id === currentAiMessageId) {
							const errorNotice = ` [服務訊息：${streamError.message}]`;
							return { ...msg, text: (msg.text || '') + errorNotice };
						}
						return msg;
					});
					isLoading = false;
					currentAiMessageId = null;
				}
			);
		} catch (e) {
			// This catch is for errors setting up the stream, not during it (e.g. immediate throw from askTokyoExpert before stream starts)
			console.error('詢問 Gemini API 失敗 (setup phase):', e);
			const errorMessage = e instanceof Error ? e.message : '與 AI 溝通時發生啟動錯誤。';
			error = errorMessage;
			// Remove the AI placeholder if setup failed, and add a specific error message from model
			const filteredMessages = messages.filter((msg) => msg.id !== aiMessageId);
			messages = [
				...filteredMessages,
				{
					id: (Date.now() + 2).toString(),
					role: 'model',
					text: `抱歉，無法開始與AI溝通：${errorMessage}`
				}
			];
			isLoading = false;
			currentAiMessageId = null;
		}
	};

	const handleInputChange = (value: string) => {
		currentQuestion = value;
	};
</script>

<svelte:head>
	<title>{APP_TITLE}</title>
	<meta name="description" content="專為台灣旅客設計的東京旅遊AI夥伴" />
</svelte:head>

<div
	class="flex flex-col"
	style="height: 100vh; max-width: 48rem; margin: 0 auto; background-color: white; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);"
>
	<header
		style="background: linear-gradient(to right, #0ea5e9, #4f46e5); color: white; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);"
	>
		<div class="flex items-center justify-between mb-2">
			<h1 class="text-2xl font-bold">{APP_TITLE}</h1>
			<a
				href="/summary"
				class="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded-lg text-sm transition-colors backdrop-blur-sm"
			>
				📋 行程摘要
			</a>
		</div>
		<p class="text-sm text-center" style="color: #bae6fd;">專為台灣旅客設計的東京旅遊AI夥伴</p>
	</header>

	{#if error}
		<div class="error" role="alert">
			<p class="font-bold">錯誤</p>
			<p>{error}</p>
		</div>
	{/if}

	<main
		bind:this={chatContainer}
		class="flex-1"
		style="overflow-y: auto; padding: 1.5rem; background-color: #f8fafc;"
	>
		<div class="space-y-4">
			{#each messages as message (message.id)}
				<ChatBubble {message} />
			{/each}
			<!-- This spinner indicates AI is working after user sends a message, before AI bubble streams -->
			{#if isLoading && messages.length > 0 && messages[messages.length - 1].role === 'model' && messages[messages.length - 1].text === '' && currentAiMessageId === messages[messages.length - 1].id}
				<div class="flex" style="justify-content: flex-start;">
					<div
						class="flex items-center space-x-2"
						style="background-color: #e5e7eb; color: #374151; padding: 0.75rem; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); max-width: 36rem;"
					>
						<LoadingSpinner />
						<span>AI 正在準備回覆...</span>
					</div>
				</div>
			{/if}
		</div>
	</main>

	<!-- Initial loading spinner for app init -->
	{#if isLoading && messages.length === 0 && !error}
		<div
			class="flex-1 flex flex-col justify-center items-center"
			style="padding: 1.5rem; background-color: #f8fafc;"
		>
			<div class="space-y-4 text-center">
				<LoadingSpinner size="large" />
				<p class="text-slate-600">正在初始化AI小助手...</p>
			</div>
		</div>
	{/if}

	<footer style="padding: 1rem; background-color: #f1f5f9; border-top: 1px solid #cbd5e1;">
		<UserInput
			bind:value={currentQuestion}
			onChange={handleInputChange}
			onSubmit={handleSubmitQuestion}
			isLoading={isLoading || !chatSession}
		/>
	</footer>
</div>
