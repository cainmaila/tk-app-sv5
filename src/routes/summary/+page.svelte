<script lang="ts">
	import { onMount } from 'svelte';

	interface JourneySummary {
		dates: string[];
		hotel: string;
		flights: {
			departure: string;
			return: string;
		};
		dailyPlans: Array<{
			day: string;
			activities: string[];
		}>;
	}

	let summary: JourneySummary | null = null;
	let loading = true;
	let error = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/journey/summary');
			const data = await response.json();

			if (data.success) {
				summary = data.summary;
			} else {
				error = data.message || '載入行程摘要失敗';
			}
		} catch (e) {
			error = '網路連接錯誤';
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>行程摘要 - 東京旅遊問答精靈</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
	<div class="max-w-4xl mx-auto">
		<div class="bg-white rounded-lg shadow-lg p-6 mb-6">
			<div class="flex items-center gap-3 mb-6">
				<h1 class="text-3xl font-bold text-gray-800">🗾 行程摘要</h1>
				<a
					href="/"
					class="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
				>
					返回問答
				</a>
			</div>

			{#if loading}
				<div class="flex items-center justify-center py-12">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
					<span class="ml-3 text-gray-600">載入中...</span>
				</div>
			{:else if error}
				<div class="bg-red-50 border border-red-200 rounded-lg p-4">
					<p class="text-red-700">❌ {error}</p>
				</div>
			{:else if summary}
				<!-- 基本資訊 -->
				<div class="grid md:grid-cols-2 gap-6 mb-6">
					<div class="bg-blue-50 rounded-lg p-4">
						<h3 class="font-semibold text-blue-800 mb-2">🏨 住宿資訊</h3>
						<p class="text-blue-700">{summary.hotel || '未指定'}</p>
					</div>

					<div class="bg-green-50 rounded-lg p-4">
						<h3 class="font-semibold text-green-800 mb-2">📅 旅行日期</h3>
						<p class="text-green-700">{summary.dates.length} 天行程</p>
					</div>
				</div>

				<!-- 航班資訊 -->
				{#if summary.flights.departure || summary.flights.return}
					<div class="bg-yellow-50 rounded-lg p-4 mb-6">
						<h3 class="font-semibold text-yellow-800 mb-3">✈️ 航班資訊</h3>
						{#if summary.flights.departure}
							<p class="text-yellow-700 mb-1">
								<span class="font-medium">去程：</span>{summary.flights.departure}
							</p>
						{/if}
						{#if summary.flights.return}
							<p class="text-yellow-700">
								<span class="font-medium">回程：</span>{summary.flights.return}
							</p>
						{/if}
					</div>
				{/if}

				<!-- 每日行程 -->
				<div class="space-y-4">
					<h3 class="text-xl font-semibold text-gray-800 mb-4">📋 每日行程</h3>

					{#each summary.dailyPlans as plan, index}
						<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
							<h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
								<span
									class="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
								>
									{index + 1}
								</span>
								{plan.day}
							</h4>

							{#if plan.activities.length > 0}
								<ul class="space-y-2">
									{#each plan.activities as activity}
										<li class="text-gray-700 flex items-start gap-2">
											<span class="text-blue-500 mt-1">•</span>
											<span>{activity}</span>
										</li>
									{/each}
								</ul>
							{:else}
								<p class="text-gray-500 italic">暫無具體行程安排</p>
							{/if}
						</div>
					{/each}
				</div>

				<!-- 提示 -->
				<div class="mt-8 bg-gray-50 rounded-lg p-4">
					<p class="text-gray-600 text-sm">
						💡 <strong>提示：</strong>這個摘要是從您的 journey.txt 文件自動解析的。
						如需修改行程，請編輯該文件後重新載入頁面。
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
</style>
