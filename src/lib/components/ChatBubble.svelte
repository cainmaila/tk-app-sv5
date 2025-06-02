<script lang="ts">
	import type { ChatMessage } from '$lib/types';
	import SourcePill from './SourcePill.svelte';

	interface Props {
		message: ChatMessage;
	}

	let { message }: Props = $props();

	const isUser = $derived(message.role === 'user');

	const formatText = (text: string): string => {
		// 1. Google Maps Links for [[Place Name]]
		// Regex to find [[Place Name]] and replace it with a Google Maps link
		// It captures the content within the double square brackets.
		text = text.replace(/\[\[(.*?)\]\]/g, (match, placeName) => {
			const trimmedPlaceName = placeName.trim();
			if (!trimmedPlaceName) return match; // Avoid empty queries
			const query = encodeURIComponent(trimmedPlaceName);
			// Using emerald color for map links to differentiate from general sky blue links
			return `<a href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener noreferrer" style="color: #059669; text-decoration: underline; font-weight: 500;" onmouseover="this.style.color='#047857'" onmouseout="this.style.color='#059669'" title="在 Google 地圖上查看 ${trimmedPlaceName}">📍 ${trimmedPlaceName}</a>`;
		});

		// 2. Existing Markdown: Bold (matches text between double asterisks)
		text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

		// 3. Existing Markdown: Italic (matches text between single asterisk or underscore)
		text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

		// 4. Existing Markdown: Links [link text](url)
		text = text.replace(
			/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g,
			'<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0ea5e9; text-decoration: underline;" onmouseover="this.style.color=\'#0284c7\'" onmouseout="this.style.color=\'#0ea5e9\'">$1</a>'
		);

		// 5. Newlines to <br />
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
