<!--
	@component ChatBubble
	@description 聊天訊息氣泡，根據 message.role 決定左右排列，支援 Markdown 與 Google 地圖連結格式化。
	@props {ChatMessage} message - 聊天訊息物件，包含 role、text 和可選的 sources。
-->

<script lang="ts">
	import type { ChatMessage } from '$lib/types';
	import SourcePill from './SourcePill.svelte';

	interface Props {
		message: ChatMessage;
	}

	let { message }: Props = $props();

	const isUser = $derived(message.role === 'user');

	const formatText = (text: string): string => {
		// 1. Google 地圖連結處理 [[地點名稱]]
		// 使用正則表達式尋找 [[地點名稱]]，並將其替換為 Google 地圖連結
		// 這會擷取雙中括號內的內容。
		text = text.replace(/\[\[(.*?)\]\]/g, (match, placeName) => {
			const trimmedPlaceName = placeName.trim();
			if (!trimmedPlaceName) return match; // Avoid empty queries
			const query = encodeURIComponent(trimmedPlaceName);
			// 使用翠綠色（emerald）作為地圖連結的顏色，以區分一般的天藍色連結
			return `<a href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener noreferrer" style="color: #059669; text-decoration: underline; font-weight: 500;" onmouseover="this.style.color='#047857'" onmouseout="this.style.color='#059669'" title="在 Google 地圖上查看 ${trimmedPlaceName}">📍 ${trimmedPlaceName}</a>`;
		});

		// 2. 現有的 Markdown：粗體（匹配雙星號之間的文字）
		text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

		// 3. 現有的 Markdown：斜體（匹配單個星號或底線之間的文字）
		text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

		// 4. 現有的 Markdown：連結 [連結文字](網址)
		text = text.replace(
			/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0ea5e9; text-decoration: underline;" onmouseover="this.style.color=\'#0284c7\'" onmouseout="this.style.color=\'#0ea5e9\'">$1</a>'
		);

		// 5. 將換行符號轉換為 <br />
		text = text.replace(/\n/g, '<br />');

		return text;
	};
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'}">
	<div class="chat-bubble {isUser ? 'user' : 'ai'}">
		<div style="max-width: none;">
			{@html formatText(message.text)}
		</div>
		{#if message.sources && message.sources.length > 0}
			<div
				style="margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid rgba(203, 213, 225, 0.5);"
			>
				<p class="text-xs" style="margin-bottom: 0.25rem; color: {isUser ? '#bae6fd' : '#64748b'};">
					參考資訊來源：
				</p>
				<div class="flex" style="flex-wrap: wrap; gap: 0.5rem;">
					{#each message.sources as source, index (index)}
						<SourcePill {source} />
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
