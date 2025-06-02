<!--
@component
@name UserInput
@component UserInput
@description 使用者輸入區塊，包含文字輸入框和語音輸入按鈕。
@props {string} value - 當前輸入的文字。
@props {function} onChange - 當輸入變更時的回調函數。
@props {function} onSubmit - 當使用者提交輸入時的回調函數。
@props {boolean} isLoading - 是否正在載入中，顯示載入旋轉器。
@props {boolean} isSpeechSupported - 是否支援語音輸入功能。
@description 使用者輸入區塊，包含文字輸入框和語音輸入按鈕。
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		value: string;
		onChange: (value: string) => void;
		onSubmit: () => void;
		isLoading: boolean;
	}

	let { value = $bindable(), onChange, onSubmit, isLoading }: Props = $props();
	let isRecording = $state(false);
	let speechError = $state<string | null>(null);
	let recognitionRef: any = null;
	let SpeechRecognitionAPI: any;
	let isSpeechSupported = $state(false);

	onMount(() => {
		SpeechRecognitionAPI =
			(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
		isSpeechSupported = !!SpeechRecognitionAPI;
	});

	const handleMicClick = () => {
		if (!isSpeechSupported) {
			speechError = '您的瀏覽器不支援語音輸入功能。';
			alert('您的瀏覽器不支援語音輸入功能。');
			return;
		}
		if (isLoading) return;

		if (isRecording && recognitionRef) {
			recognitionRef.stop();
		} else {
			speechError = null;
			if (!SpeechRecognitionAPI) {
				speechError = '語音辨識 API 無法使用。';
				return;
			}
			const recognition = new SpeechRecognitionAPI();
			recognitionRef = recognition;
			recognition.lang = 'zh-TW';
			recognition.interimResults = true;
			recognition.continuous = false;

			recognition.onstart = () => {
				isRecording = true;
			};

			recognition.onresult = (event: any) => {
				let interimTranscript = '';
				let finalTranscript = '';
				for (let i = event.resultIndex; i < event.results.length; ++i) {
					if (event.results[i].isFinal) {
						finalTranscript += event.results[i][0].transcript;
					} else {
						interimTranscript += event.results[i][0].transcript;
					}
				}
				onChange(finalTranscript + interimTranscript);
			};

			recognition.onerror = (event: any) => {
				console.error('Speech recognition error:', event.error);
				if (event.error === 'no-speech') {
					speechError = '未偵測到語音，請再試一次。';
				} else if (event.error === 'audio-capture') {
					speechError = '無法擷取麥克風音訊，請檢查權限。';
				} else if (event.error === 'not-allowed') {
					speechError = '麥克風權限被拒絕，請允許存取以使用語音輸入。';
				} else {
					speechError = `語音辨識錯誤: ${event.error}`;
				}
				isRecording = false;
			};

			recognition.onend = () => {
				isRecording = false;
			};

			recognition.start();
		}
	};

	onDestroy(() => {
		if (recognitionRef) {
			recognitionRef.abort();
			recognitionRef = null;
		}
	});

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !isLoading) {
			if (recognitionRef && isRecording) {
				recognitionRef.stop();
			}
			onSubmit();
		}
	};

	const handleSubmitClick = () => {
		if (recognitionRef && isRecording) {
			recognitionRef.stop();
		}
		onSubmit();
	};
</script>

<div class="space-y-2">
	<div class="flex items-center space-x-2">
		<button
			type="button"
			onclick={handleMicClick}
			disabled={isLoading || !isSpeechSupported}
			class="btn {isRecording ? 'btn-danger' : 'btn-secondary'}"
			style={!isSpeechSupported || isLoading ? 'opacity: 0.5; cursor: not-allowed;' : ''}
			aria-label={isRecording ? '停止語音輸入' : '開始語音輸入'}
			aria-pressed={isRecording}
		>
			{#if isRecording}
				<img
					src="/src/lib/assets/mic-on.svg"
					alt="麥克風啟動"
					style="width: 1.5rem; height: 1.5rem;"
				/>
			{:else}
				<img
					src="/src/lib/assets/mic-off.svg"
					alt="麥克風靜音"
					style="width: 1.5rem; height: 1.5rem;"
				/>
			{/if}
		</button>
		<input
			type="text"
			bind:value
			onkeydown={handleKeyDown}
			placeholder={isRecording ? '正在聆聽...' : '請問東京的什麼事？'}
			class="input flex-grow"
			disabled={isLoading}
			aria-label="輸入您的問題"
		/>
		<button
			type="button"
			onclick={handleSubmitClick}
			disabled={isLoading || !value.trim()}
			class="btn btn-primary"
			aria-label="發送訊息"
		>
			<img src="/src/lib/assets/send.svg" alt="發送" style="width: 1.5rem; height: 1.5rem;" />
		</button>
	</div>
	{#if speechError}
		<p class="text-xs text-red-500 text-center">{speechError}</p>
	{/if}
	{#if !isSpeechSupported}
		<p class="text-xs text-amber-600 text-center">
			提示：您的瀏覽器不支援語音輸入，或此功能已被禁用。
		</p>
	{/if}
</div>
