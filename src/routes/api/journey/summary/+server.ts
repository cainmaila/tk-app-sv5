import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { readFileSync } from 'fs';
import path from 'path';

// 提取行程重點資訊
function parseJourneyInfo(journeyContent: string) {
	const lines = journeyContent.split('\n');
	const summary = {
		dates: [] as string[],
		hotel: '',
		flights: {
			departure: '',
			return: ''
		},
		dailyPlans: [] as { day: string; activities: string[] }[]
	};

	let currentDay = '';
	let currentActivities: string[] = [];

	for (const line of lines) {
		const trimmedLine = line.trim();

		// 提取日期 - 更精確的正則表達式
		if (trimmedLine.match(/^\d+\/\d+\([一二三四五六日]\)/)) {
			// 保存前一天的資訊
			if (currentDay && currentActivities.length > 0) {
				summary.dailyPlans.push({ day: currentDay, activities: [...currentActivities] });
			}
			currentDay = trimmedLine;
			currentActivities = [];
			summary.dates.push(trimmedLine);
		}

		// 提取飯店資訊
		if (trimmedLine.includes('豪景酒店') || trimmedLine.includes('淺草豪景')) {
			summary.hotel = '淺草豪景酒店';
		}

		// 提取航班資訊
		if (trimmedLine.includes('班機時間：')) {
			summary.flights.departure = trimmedLine;
		}
		if (trimmedLine.includes('航班（IT201）')) {
			summary.flights.return = trimmedLine;
		}

		// 提取景點活動 - 更廣泛的匹配
		if (currentDay) {
			// 檢查是否包含景點或活動關鍵字
			const hasAttraction =
				/淺草寺|上野|東京鐵塔|築地|銀座|六本木|明治神宮|富士山|秋葉原|竹下通|表參道|南青山|阿美横町/.test(
					trimmedLine
				);
			const hasTimeInfo = /\d+:\d+/.test(trimmedLine);
			const hasTransport = /搭|走|分鐘|站/.test(trimmedLine);
			const isNotMetaInfo =
				!trimmedLine.includes('交通:') &&
				!trimmedLine.includes('食:') &&
				!trimmedLine.includes('購物:');

			if (
				(hasAttraction || hasTimeInfo || hasTransport) &&
				isNotMetaInfo &&
				trimmedLine.length > 10
			) {
				// 清理文本，移除不必要的符號
				const cleanedLine = trimmedLine.replace(/^\[.*?\]/, '').trim();
				if (cleanedLine.length > 5) {
					currentActivities.push(cleanedLine);
				}
			}
		}
	}

	// 加入最後一天
	if (currentDay && currentActivities.length > 0) {
		summary.dailyPlans.push({ day: currentDay, activities: [...currentActivities] });
	}

	return summary;
}

export const GET: RequestHandler = async () => {
	try {
		const journeyPath = path.join(process.cwd(), 'src', 'lib', 'assets', 'journey.txt');
		const journeyContent = readFileSync(journeyPath, 'utf-8');

		const summary = parseJourneyInfo(journeyContent);

		return json({
			success: true,
			summary,
			message: '行程摘要讀取成功'
		});
	} catch (error) {
		console.error('讀取行程摘要時發生錯誤：', error);
		return json(
			{
				success: false,
				error: '無法讀取行程資訊',
				message: '請確認 journey.txt 文件存在且格式正確'
			},
			{ status: 500 }
		);
	}
};
