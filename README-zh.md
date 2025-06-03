# 東京旅遊問答精靈 - Svelte 5版本

這是一個使用 Svelte 5 和 SvelteKit 開發的東京旅遊導覽應用，集成了 Google AI (Gemini) 來提供智能旅遊諮詢服務。

## 功能特色

- 🤖 **AI 智能問答**：使用 Google Gemini AI 提供專業的東京旅遊建議
- 📋 **個人化行程**：自動讀取您的旅行計劃，提供專屬建議
- 🎤 **語音輸入**：支援中文語音識別，方便快速提問
- 🗺️ **地圖整合**：自動識別地點並提供 Google Maps 連結
- 📱 **響應式設計**：適配各種設備尺寸
- 🔄 **即時串流**：AI 回應即時顯示，無需等待完整回覆
- 📚 **來源引用**：顯示 AI 回答的參考資料來源

### 🌟 個人化功能

將您的詳細行程資訊放在 `src/lib/assets/journey.txt` 文件中，AI 會自動：

- 根據您的住宿位置推薦附近景點
- 考慮您的航班時間和行程安排
- 避免重複推薦已規劃的景點
- 提供符合您時間表的個人化建議

詳細使用方法請參考 [個人化AI使用指南](./PERSONALIZED_AI_GUIDE.md)。

## 技術棧

- **前端框架**：Svelte 5 + SvelteKit
- **樣式**：Tailwind CSS + PostCSS
- **AI 服務**：Google Generative AI (@google/genai)
- **開發工具**：TypeScript + Vite + pnpm
- **部署**：支援各種靜態網站託管平台

## 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 設置環境變數

複製環境變數示例文件：

```bash
cp .env.example .env.local
```

編輯 `.env.local` 文件，填入您的 Google AI API 金鑰：

```env
PUBLIC_API_KEY=您的Google_AI_API金鑰
VITE_API_KEY=您的Google_AI_API金鑰
```

**如何獲得 API 金鑰：**

1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 登入您的 Google 帳戶
3. 創建新的 API 金鑰
4. 複製金鑰並貼到環境變數文件中

### 3. 啟動開發服務器

```bash
pnpm dev
```

應用將在 `http://localhost:5173` 啟動。

### 4. 建置生產版本

```bash
pnpm build
```

### 5. 預覽生產版本

```bash
pnpm preview
```

## 專案結構

```
src/
├── lib/
│   ├── components/          # Svelte 組件
│   │   ├── ChatBubble.svelte       # 聊天氣泡組件
│   │   ├── LoadingSpinner.svelte   # 載入動畫組件
│   │   ├── SourcePill.svelte       # 來源標籤組件
│   │   └── UserInput.svelte        # 用戶輸入組件（含語音）
│   ├── services/            # 服務層
│   │   └── geminiService.ts        # Google AI 服務
│   ├── constants.ts         # 應用常數
│   └── types.ts            # TypeScript 型別定義
├── routes/
│   └── +page.svelte        # 主頁面
├── app.css                 # 全域樣式
└── app.html               # HTML 模板
```

## 主要功能

### AI 問答系統

- 專為台灣旅客設計的東京旅遊專家
- 支援繁體中文問答
- 提供實用的當地旅遊建議
- 自動搜尋最新資訊

### 語音輸入

- 支援中文語音識別
- 一鍵開始/停止錄音
- 即時語音轉文字
- 跨瀏覽器相容性

### 地圖整合

- 自動識別 `[[地點名稱]]` 格式
- 轉換為 Google Maps 連結
- 點擊即可查看地圖位置

### 即時串流

- AI 回應即時顯示
- 支援長回答的逐步加載
- 優化用戶體驗

## 開發說明

### Svelte 5 新特性

本專案使用了 Svelte 5 的最新語法：

- `$state()` - 響應式狀態管理
- `$props()` - 組件屬性
- `$effect()` - 副作用處理
- `$derived()` - 計算屬性
- `$bindable()` - 雙向綁定

### 環境變數

- `PUBLIC_API_KEY` - 公開的 API 金鑰（建議用於開發）
- `VITE_API_KEY` - Vite 環境變數（備選方案）

### 樣式系統

- 使用 Tailwind CSS 進行樣式設計
- 支援 PostCSS 處理
- 響應式設計原則

## 部署

### Vercel 部署

```bash
pnpm build
# 上傳 build 目錄到 Vercel
```

### Netlify 部署

```bash
pnpm build
# 上傳 build 目錄到 Netlify
```

### 其他靜態託管

建置後的文件位於 `build/` 目錄，可部署到任何靜態網站託管服務。

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 授權

MIT License

## 相關連結

- [Svelte 5 文檔](https://svelte.dev/docs/svelte/introduction)
- [SvelteKit 文檔](https://svelte.dev/docs/kit)
- [Google AI Studio](https://makersuite.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
