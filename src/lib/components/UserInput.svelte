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
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					style="width: 1.5rem; height: 1.5rem;"
				>
					<path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
					<path
						d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.751 6.751 0 0 1-6 6.709v2.041h3a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1 0-1.5h3v-2.041a6.751 6.751 0 0 1-6-6.709v-1.5A.75.75 0 0 1 6 10.5Z"
					/>
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					style="width: 1.5rem; height: 1.5rem;"
				>
					<path
						d="M12 18.75a6 6 0 0 0 6-6v-1.5a.75.75 0 0 0-1.5 0v1.5a4.5 4.5 0 0 1-9 0V12.75a.75.75 0 0 0-1.5 0v1.5a6 6 0 0 0 6 6Z"
					/>
					<path d="M12 15a3 3 0 0 1-3-3V4.5a3 3 0 0 1 6 0V12a3 3 0 0 1-3 3Z" />
				</svg>
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
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="currentColor"
				style="width: 1.5rem; height: 1.5rem;"
			>
				<path
					d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z"
				/>
			</svg>
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
