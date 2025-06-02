# API 安全性重構完成

本專案已成功將 Google AI API 金鑰從客戶端移到伺服器端，提高了安全性。

## 🔒 安全性改進

### 之前的問題

- API 金鑰使用 `PUBLIC_API_KEY` 或 `VITE_API_KEY` 暴露在客戶端
- 任何使用者都可以在瀏覽器開發者工具中看到 API 金鑰
- 存在 API 金鑰被濫用的風險

### 現在的解決方案

- API 金鑰現在儲存在 `GOOGLE_AI_API_KEY` 環境變數中（無 PUBLIC\_ 前綴）
- 金鑰只在伺服器端可用，客戶端無法存取
- 所有與 Google AI 的通信都透過內部 API 路由處理

## 🏗️ 架構變更

### 新增的 API 端點

1. **`/api/chat/init`** (POST)

   - 初始化聊天會話
   - 回傳 `sessionId` 給客戶端
   - 在伺服器端管理 Google AI 連線

2. **`/api/chat/send`** (POST)
   - 發送訊息到 AI
   - 支援 Server-Sent Events (SSE) 串流回應
   - 處理 grounding sources

### 新增的服務層

1. **`src/lib/services/chatAPI.ts`**
   - 提供客戶端與新 API 端點的介面
   - `initializeChatSessionAPI()` - 初始化會話
   - `askTokyoExpertAPI()` - 發送訊息並處理串流回應

## 🔧 環境變數配置

### 舊的配置 (已移除)

```env
PUBLIC_API_KEY=your_api_key_here
VITE_API_KEY=your_api_key_here
```

### 新的配置

```env
# 伺服器端專用，不會暴露給客戶端
GOOGLE_AI_API_KEY=your_api_key_here
```

## 📁 檔案變更摘要

### 新增的檔案

- `src/routes/api/chat/init/+server.ts` - 聊天初始化 API
- `src/routes/api/chat/send/+server.ts` - 聊天訊息 API
- `src/lib/services/chatAPI.ts` - 客戶端 API 服務

### 修改的檔案

- `src/routes/+page.svelte` - 使用新的 API 服務
- `.env.local` - 更新環境變數配置
- `.env.example` - 更新範例配置

### 保留但未使用的檔案

- `src/lib/services/geminiService.ts` - 原始的直接 API 服務（可作為參考保留）

## 🚀 部署注意事項

1. **環境變數設定**

   - 確保在生產環境中設定 `GOOGLE_AI_API_KEY`
   - 移除任何 `PUBLIC_API_KEY` 或 `VITE_API_KEY` 設定

2. **會話管理**

   - 目前使用記憶體儲存會話（30分鐘 TTL）
   - 生產環境建議使用 Redis 或資料庫

3. **安全性考量**
   - API 端點已加入基本的參數驗證
   - 建議加入 rate limiting 和更完整的錯誤處理

## ✅ 測試確認

重構完成後，請確認：

- [x] 聊天功能正常運作
- [x] 串流回應正確顯示
- [x] 錯誤處理適當
- [x] API 金鑰不再暴露在客戶端
- [x] 開發伺服器正常啟動

## 🔍 如何驗證安全性

1. 打開瀏覽器開發者工具
2. 查看 Network 標籤
3. 確認所有請求都是發送到 `/api/chat/*` 端點
4. 確認請求/回應中不包含 API 金鑰
5. 查看 Sources 標籤，確認環境變數中沒有 PUBLIC_API_KEY

重構已完成！您的 API 金鑰現在安全地儲存在伺服器端，不會再暴露給客戶端。
